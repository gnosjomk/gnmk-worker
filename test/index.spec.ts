import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { backupFiles } from '../src/index';

async function clearBucket(bucket: R2Bucket) {
	const listed = await bucket.list();
	if (listed.objects.length) await bucket.delete(listed.objects.map(o => o.key));
}

async function login(): Promise<string> {
	const res = await SELF.fetch('https://example.com/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ password: env.GNMK_MEMBERS_PASSWORD }),
	});
	expect(res.status).toBe(200);
	return res.headers.get('Set-Cookie')!.split(';')[0];
}

describe('members-only assets', () => {
	it('refuses member-files.json without a session', async () => {
		const res = await SELF.fetch('https://example.com/data/member-files.json');
		expect(res.status).toBe(401);
	});

	it('serves member-files.json to a logged-in member', async () => {
		const cookie = await login();
		const res = await SELF.fetch('https://example.com/data/member-files.json', {
			headers: { Cookie: cookie },
		});
		expect(res.status).toBe(200);
		expect(res.headers.get('Cache-Control')).toBe('private, no-store');
		expect(Array.isArray(await res.json())).toBe(true);
	});
});

describe('file requests', () => {
	beforeEach(async () => {
		await clearBucket(env.FILE_BUCKET);
		await env.FILE_BUCKET.put('public/test/a.mp3', '0123456789', {
			httpMetadata: { contentType: 'audio/mpeg' },
		});
		await env.FILE_BUCKET.put('members/member-files/p.pdf', 'secret');
	});

	it('serves a whole public file', async () => {
		const res = await SELF.fetch('https://example.com/api/file/public/test/a.mp3');
		expect(res.status).toBe(200);
		expect(res.headers.get('Accept-Ranges')).toBe('bytes');
		expect(await res.text()).toBe('0123456789');
	});

	it.each([
		['bytes=2-5', '2345', 'bytes 2-5/10'],
		['bytes=7-', '789', 'bytes 7-9/10'],
		['bytes=-3', '789', 'bytes 7-9/10'],
	])('serves the range %s', async (range, body, contentRange) => {
		const res = await SELF.fetch('https://example.com/api/file/public/test/a.mp3', {
			headers: { Range: range },
		});
		expect(res.status).toBe(206);
		expect(res.headers.get('Content-Range')).toBe(contentRange);
		expect(res.headers.get('Content-Length')).toBe(String(body.length));
		expect(await res.text()).toBe(body);
	});

	it('answers HEAD without a body', async () => {
		const res = await SELF.fetch('https://example.com/api/file/public/test/a.mp3', { method: 'HEAD' });
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Length')).toBe('10');
	});

	it('still protects member files', async () => {
		const res = await SELF.fetch('https://example.com/api/file/members/member-files/p.pdf');
		expect(res.status).toBe(401);
	});
});

describe('R2 backup', () => {
	beforeEach(async () => {
		await clearBucket(env.FILE_BUCKET);
		await clearBucket(env.BACKUP_BUCKET);
	});

	it('copies new files and leaves unchanged ones alone', async () => {
		await env.FILE_BUCKET.put('public/a.pdf', 'A', { httpMetadata: { contentType: 'application/pdf' } });
		await env.FILE_BUCKET.put('members/b.pdf', 'B');

		expect(await backupFiles(env)).toEqual({ copied: 2, replaced: 0, pending: 0 });
		const copy = await env.BACKUP_BUCKET.get('public/a.pdf');
		expect(await copy!.text()).toBe('A');
		expect(copy!.httpMetadata?.contentType).toBe('application/pdf');

		expect(await backupFiles(env)).toEqual({ copied: 0, replaced: 0, pending: 0 });
	});

	it('keeps files that were deleted from the main bucket', async () => {
		await env.FILE_BUCKET.put('public/a.pdf', 'A');
		await backupFiles(env);
		await env.FILE_BUCKET.delete('public/a.pdf');

		await backupFiles(env);
		expect(await (await env.BACKUP_BUCKET.get('public/a.pdf'))!.text()).toBe('A');
	});

	it('keeps the previous version when a file is replaced', async () => {
		await env.FILE_BUCKET.put('public/a.pdf', 'old');
		await backupFiles(env);
		await env.FILE_BUCKET.put('public/a.pdf', 'new');

		expect(await backupFiles(env)).toEqual({ copied: 1, replaced: 1, pending: 0 });
		expect(await (await env.BACKUP_BUCKET.get('public/a.pdf'))!.text()).toBe('new');

		const replaced = await env.BACKUP_BUCKET.list({ prefix: '_ersatta/' });
		expect(replaced.objects).toHaveLength(1);
		expect(replaced.objects[0].key).toMatch(/^_ersatta\/\d{4}-\d{2}-\d{2}\/public\/a\.pdf$/);
		expect(await (await env.BACKUP_BUCKET.get(replaced.objects[0].key))!.text()).toBe('old');
	});
});

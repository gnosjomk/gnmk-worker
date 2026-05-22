const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "src", "content", "pages", "public_predikningar_sermons.json");
const outputDir = path.join(repoRoot, "src", "content", "pages", "predikningar");

const limitArg = process.argv.find(arg => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 20;

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function escapeFrontmatterString(value) {
  return (value || "").replace(/"/g, '\\"');
}

function readSource() {
  const raw = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected sermons source JSON to be an array.");
  }
  return parsed;
}

function readExistingFileFieldMap() {
  if (!fs.existsSync(outputDir)) return new Set();
  const existingFiles = fs.readdirSync(outputDir).filter(name => name.endsWith(".md"));
  const mapped = new Set();

  for (const fileName of existingFiles) {
    const fullPath = path.join(outputDir, fileName);
    const content = fs.readFileSync(fullPath, "utf8");
    const match = content.match(/^file:\s*"(.+)"\s*$/m);
    if (match && match[1]) {
      mapped.add(match[1]);
    }
  }

  return mapped;
}

function buildTitle(sermon) {
  if (sermon.title && sermon.title.trim()) return sermon.title.trim();
  return "Predikan";
}

function main() {
  const sermons = readSource()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, Math.max(0, limit));

  fs.mkdirSync(outputDir, { recursive: true });
  const existingBySourceFile = readExistingFileFieldMap();

  const used = new Set(
    fs.readdirSync(outputDir)
      .filter(name => name.endsWith(".md"))
      .map(name => name.toLowerCase())
  );

  let created = 0;
  for (const sermon of sermons) {
    if (!sermon.file || !sermon.date) continue;
    if (existingBySourceFile.has(sermon.file)) continue;

    const title = buildTitle(sermon);
    const speaker = sermon.speaker ? sermon.speaker.trim() : "";
    const slugBase = slugify(`${title}-${speaker}`) || "predikan";

    let fileName = `${sermon.date}-${slugBase}.md`;
    let suffix = 2;
    while (used.has(fileName.toLowerCase())) {
      fileName = `${sermon.date}-${slugBase}-${suffix}.md`;
      suffix += 1;
    }
    used.add(fileName.toLowerCase());

    const content = `---\nlayout: predikan-detail.njk\ntitle: "${escapeFrontmatterString(title)}"\ndate: ${sermon.date}\nspeaker: "${escapeFrontmatterString(speaker)}"\nfile: "${escapeFrontmatterString(sermon.file)}"\n---\n`;
    fs.writeFileSync(path.join(outputDir, fileName), content, "utf8");
    created += 1;
  }

  console.log(`Generated ${created} sermon markdown files in ${outputDir}`);
}

main();

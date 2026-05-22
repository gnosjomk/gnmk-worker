const dayjs = require("dayjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

module.exports = function(eleventyConfig) {
  // Ignore every README.md file in the repo
	eleventyConfig.ignores.add("**/README.md");

  eleventyConfig.addCollection("activities", async (collectionApi) => {
    let items =  collectionApi.getFilteredByGlob("src/content/pages/verksamheter/*.md");
    items.sort((a, b) => a.data.order - b.data.order);
    return items;
  });

  eleventyConfig.addCollection("utsikt", async (collectionApi) => {
    let items = collectionApi.getFilteredByGlob("src/content/pages/utsikt/*.md");
    items.sort((a, b) => b.data.date - a.data.date);
    return items;
  });

  eleventyConfig.addCollection("predikningar", async (collectionApi) => {
    let items = collectionApi.getFilteredByGlob("src/content/pages/predikningar/*.md");
    items.sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
    return items;
  });

  eleventyConfig.addCollection("news", async (collectionApi) => {
    const now = dayjs();

    return collectionApi.getFilteredByGlob("src/content/pages/nyheter/*.md")
      .filter(item => {
        const expires = item.data.expires ? dayjs(item.data.expires) : null;
        return !expires || expires.isAfter(now);
      })
      .sort((a, b) => a.data.date - b.data.date);
  });
  
  eleventyConfig.addCollection("pages", async (collectionApi) => {
    let homePage =  collectionApi.getFilteredByGlob("src/content/pages/index.njk");
    let rootPages =  collectionApi.getFilteredByGlob("src/content/pages/*.md");
    let subPages =  collectionApi.getFilteredByGlob("src/content/pages/*/index.njk");
    let items = homePage.concat(rootPages).concat(subPages);
    items.sort((a, b) => a.data.order - b.data.order);
    return items;
  });

  // limit filter
  eleventyConfig.addFilter("limit", function(array, limit) {
    return array.slice(0, limit);
  });

  eleventyConfig.addFilter("latestUtsiktUrl", function(utsiktCollection) {
    if (Array.isArray(utsiktCollection) && utsiktCollection.length > 0 && utsiktCollection[0].url) {
      return utsiktCollection[0].url;
    }
    return "/utsikt/";
  });

  eleventyConfig.addFilter("uriComponent", function(value) {
    if (value === null || value === undefined) return "";
    return encodeURIComponent(value.toString());
  });

  // Pick a random image from images/nyheter-default/ at build time
  const defaultNewsImagesDir = path.join(__dirname, "src/content/images/nyheter-default");
  let defaultNewsImages = [];
  try {
    defaultNewsImages = fs.readdirSync(defaultNewsImagesDir)
      .filter(f => /\.(jpe?g|png|webp|svg|gif)$/i.test(f));
  } catch (e) {
    // Folder doesn't exist or is empty — no fallback images available
  }

  // Deterministic selection of a default image per news item: hash the item's url
  eleventyConfig.addFilter("deterministicDefaultNewsImage", function(identifier) {
    if (defaultNewsImages.length === 0) return null;
    if (!identifier) {
      // fallback to first image if no identifier provided
      return "nyheter-default/" + defaultNewsImages[0];
    }
    const hash = crypto.createHash('sha256').update(identifier.toString()).digest();
    const num = hash.readUInt32BE(0);
    const index = num % defaultNewsImages.length;
    return "nyheter-default/" + defaultNewsImages[index];
  });

  // Format date as YYYY-MM-DD
  eleventyConfig.addFilter("isoDate", function(date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().substring(0, 10);
  });

  // Copy static assets through to _site without processing
  eleventyConfig.addPassthroughCopy({"src/content/styles": "styles"});
  eleventyConfig.addPassthroughCopy({"src/content/scripts": "scripts"});
  eleventyConfig.addPassthroughCopy({"src/content/images": "images"});

  return {
    dir: {
      input: "src/content/pages",     // content lives here
      includes: "../_includes", // where layouts/partials live
      output: "_site"     // build output
    }
  };
};

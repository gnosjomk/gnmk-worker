const dayjs = require("dayjs");

module.exports = function(eleventyConfig) {

  eleventyConfig.addCollection("activities", async (collectionApi) => {
    let items =  collectionApi.getFilteredByGlob("src/content/pages/verksamheter/*.md");
    items.sort((a, b) => a.data.order - b.data.order)
    console.log("Items:");
    items.forEach(item => {
      console.log("-", item.inputPath, "| title:", item.data.title);
    });
    return items;
  });

  eleventyConfig.addCollection("news", async (collectionApi) => {
    const now = dayjs();

    return collectionApi.getFilteredByGlob("src/content/pages/nyheter/*.md").filter(item => {
      const expires = item.data.expires ? dayjs(item.data.expires) : null;
      return !expires || expires.isAfter(now);
    }).sort((a, b) => a.data.date - b.data.date);
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

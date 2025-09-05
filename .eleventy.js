module.exports = function(eleventyConfig) {
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

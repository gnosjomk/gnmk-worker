module.exports = function(eleventyConfig) {
  // Copy static assets through to _site without processing
  eleventyConfig.addPassthroughCopy("styles");
  eleventyConfig.addPassthroughCopy("scripts");
  eleventyConfig.addPassthroughCopy("images");

  return {
    dir: {
      input: "src/content/pages",     // content lives here
      includes: "../_includes", // where layouts/partials live
      output: "_site"     // build output
    }
  };
};

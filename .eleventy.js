module.exports = function(eleventyConfig) {
  eleventyConfig.setTemplateFormats("liquid");
  
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("images");
};

module.exports = function (eleventyConfig) {
  eleventyConfig.setTemplateFormats(['liquid', 'md']);

  eleventyConfig.addCollection('markdown', function (collectionApi) {
    return collectionApi
      .getAll()
      .filter((item) => item.inputPath.endsWith('.md'));
  });

  eleventyConfig.addFilter('stringify', function (value) {
    return JSON.stringify(value);
  });

  eleventyConfig.addPassthroughCopy('favicon.ico');
  eleventyConfig.addPassthroughCopy('js');
  eleventyConfig.addPassthroughCopy('css');
  eleventyConfig.addPassthroughCopy('images');

  eleventyConfig.setDataDeepMerge(false);

  eleventyConfig.setLiquidOptions({
    dynamicPartials: false,
    strictFilters: false,
  });
};

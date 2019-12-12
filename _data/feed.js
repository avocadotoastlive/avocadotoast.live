const Parser = require('rss-parser');

const RSS_URL = 'https://anchor.fm/s/e3e1fd0/podcast/rss';

module.exports = async function() {
  const parser = new Parser();
  const result = await parser.parseURL(RSS_URL);
  return result;
};

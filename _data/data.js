require("dotenv").config();

const Parser = require('rss-parser');

const ANCHOR_RSS_URL = 'https://anchor.fm/s/e3e1fd0/podcast/rss';
const TYPLOG_RSS_URL = 'https://avocadotoast.typlog.io/episodes/feed.xml';
const GETPODCAST_RSS_URL = 'https://getpodcast.xyz/data/ximalaya/29161862.xml';

const fetchFeed = async function(url) {
  try {
    const parser = new Parser();
    const result = await parser.parseURL(url);
    return result;
  } catch {
    console.warn('Feed fails to load: ' + url);
    return {
      items: [],
    }
  }
};

module.exports = async function() {
  const [
    anchorFeed,
    typlogFeed,
    getPodcastFeed,
  ] = await Promise.all([
    fetchFeed(ANCHOR_RSS_URL),
    fetchFeed(TYPLOG_RSS_URL),
    fetchFeed(GETPODCAST_RSS_URL),
  ]);

  if (anchorFeed.items.length === 0) {
    if (typlogFeed.length === 0) {
      // Halt build process if no canonical feed candidate is available.
      console.error('Feed fails to load: ' + url);
      throw new Error('Anchor and Typlog feeds broken.');
    }
    // Swap feeds and make Typlog feed canonical.
    [anchorFeed, typlogFeed] = [typlogFeed, anchorFeed];
  }

  anchorFeed.items.forEach((anchorItem, index) => {
    let typlogItem;
    let getPodcastItem;

    const anchorEpisode = parseInt(anchorItem.itunes && anchorItem.itunes.episode);
    if (!Number.isNaN(anchorEpisode)) {
      typlogItem = typlogFeed.items.find(
        typlogItem => typlogItem.itunes && typlogItem.itunes.episode === anchorItem.itunes.episode
      );
    }
    if (!typlogItem) {
      typlogItem = typlogFeed.items[typlogFeed.items.length - anchorFeed.items.length + index];
    }
    getPodcastItem = getPodcastFeed.items[getPodcastFeed.items.length - anchorFeed.items.length + index];

    anchorItem.enclosures = [
      {...anchorItem.enclosure}
    ];

    anchorItem.itunes.images = [
      anchorItem.itunes.image
    ];

    if (typlogItem) {
      anchorItem.enclosures.push(typlogItem.enclosure);
      anchorItem.itunes.images.push(typlogItem.itunes.image);
    }

    if (getPodcastItem) {
      anchorItem.enclosures.push(getPodcastItem.enclosure);
      anchorItem.itunes.images.push(getPodcastItem.itunes.image);
    }
  });

  anchorFeed.itunes.images = [
    anchorFeed.itunes.image,
    typlogFeed.itunes.image,
    getPodcastFeed.itunes.image,
  ];

  return anchorFeed;
};

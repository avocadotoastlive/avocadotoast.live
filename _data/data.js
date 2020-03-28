require("dotenv").config();

const FS = { ...require('fs'), ...require('fs').promises };
const Path = require('path');
const Parser = require('rss-parser');
const Axios = require('axios');

const ANCHOR_RSS_URL = 'https://anchor.fm/s/e3e1fd0/podcast/rss';
const TYPLOG_RSS_URL = 'https://avocadotoast.typlog.io/episodes/feed.xml';
const XIMALAYA_RSS_URL = 'https://www.ximalaya.com/album/29161862.xml';

// __dirname is the _data directory
const IMAGE_PATH = '/images/external/';
const IMAGE_DIRECTORY = Path.resolve(__dirname, '../images/external/');

const fetchFeed = async function(url) {
  const label = `Feed downloaded (${url})`;
  try {
    console.time(label);
    const parser = new Parser();
    const result = await parser.parseURL(url);
    console.timeEnd(label);
    return result;
  } catch {
    console.error(`Feed download failure: ${label}`);
    return {
      items: [],
    }
  }
};

const ximalayaToSecure = function(url) {
  if (typeof url !== 'string' || !url.startsWith('http:')) {
    return url;
  }
  try {
    url = new URL(url);
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
    }
    for (let [key, value] of url.searchParams) {
      url.searchParams.set(key, ximalayaToSecure(value));
    }
    return url.toString();
  } catch {
    return url;
  }
}

const resetDirectory = async function() {
  if (FS.existsSync(IMAGE_DIRECTORY)) {
    await FS.rmdir(IMAGE_DIRECTORY, {
      recursive: true,
    });
    console.log(`Deleted existing external image directory: ${IMAGE_DIRECTORY}`);
  }
  await FS.mkdir(IMAGE_DIRECTORY);
  console.log(`Created external image directory: ${IMAGE_DIRECTORY}`);
}

const downloadImage = async function(url, filename) {
  const label = `Image downloaded (${url})`;
  console.time(label);

  const response = await Axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  let extension;
  const contentType = response.headers['content-type'];
  switch (contentType) {
    case 'image/jpg':
    case 'image/jpeg':
      extension = 'jpg';
      break;
    case 'image/png':
      extension = 'png';
      break;
    default:
      console.error(`Unsupported content-type (${contentType}): ${url}`);
      extension = '';
  }

  const path = Path.join(IMAGE_DIRECTORY, `${filename}.${extension}`);
  const writer = FS.createWriteStream(path);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.timeEnd(label);
      console.log(`Image created: ${path}`);
      resolve(Path.join(IMAGE_PATH, `${filename}.${extension}`));
    });
    writer.on('error', (error) => {
      console.error(`Image download failure: ${label}`);
      reject(error);
    });
  });
}

module.exports = async function() {
  const [
    anchorFeed,
    typlogFeed,
    ximalayaFeed,
  ] = await Promise.all([
    fetchFeed(ANCHOR_RSS_URL),
    fetchFeed(TYPLOG_RSS_URL),
    fetchFeed(XIMALAYA_RSS_URL),
  ]);

  if (anchorFeed.items.length === 0) {
    if (typlogFeed.length === 0) {
      // Halt build process if no canonical feed candidate is available.
      console.error(`Halt: Anchor and Typlog feeds download failure.`);
      throw new Error('Anchor and Typlog feeds broken.');
    }
    // Swap feeds and make Typlog feed canonical.
    [anchorFeed, typlogFeed] = [typlogFeed, anchorFeed];
  }

  await resetDirectory();
  const downloads = [];

  anchorFeed.items.forEach((anchorItem, index) => {
    let typlogItem;
    let ximalayaItem;

    const anchorEpisode = parseInt(anchorItem.itunes && anchorItem.itunes.episode);
    if (!Number.isNaN(anchorEpisode)) {
      typlogItem = typlogFeed.items.find(
        typlogItem => typlogItem.itunes && typlogItem.itunes.episode === anchorItem.itunes.episode
      );
    }
    if (!typlogItem) {
      typlogItem = typlogFeed.items[typlogFeed.items.length - anchorFeed.items.length + index];
    }
    ximalayaItem = ximalayaFeed.items[ximalayaFeed.items.length - anchorFeed.items.length + index];

    anchorItem.enclosures = [{
      ...anchorItem.enclosure,
      platform: 'Anchor',
    }];

    anchorItem.itunes.images = [
      anchorItem.itunes.image
    ];

    if (typlogItem) {
      anchorItem.enclosures.push({
        ...typlogItem.enclosure,
        platform: 'Typlog',
      });
      anchorItem.itunes.images.push(typlogItem.itunes.image);
    }

    if (ximalayaItem) {
      anchorItem.enclosures.push({
        ...ximalayaItem.enclosure,
        url: ximalayaToSecure(ximalayaItem.enclosure.url),
        platform: 'Ximalaya',
      });
      anchorItem.itunes.images.push(ximalayaToSecure(ximalayaItem.itunes.image));
    }

    downloads.push((async() => {
      anchorItem.itunes.image = await downloadImage(anchorItem.itunes.image, `episode_${anchorEpisode || index + 1}`);
    })())
  });

  anchorFeed.itunes.images = [
    anchorFeed.itunes.image,
    typlogFeed.itunes.image,
    ximalayaToSecure(ximalayaFeed.itunes.image),
  ];
  downloads.push((async() => {
    anchorFeed.itunes.image = await downloadImage(anchorFeed.itunes.image, 'feed');
  })())

  await Promise.all(downloads);

  return anchorFeed;
};

require("dotenv").config();

const FS = { ...require('fs'), ...require('fs').promises };
const Path = require('path');
const Parser = require('rss-parser');
const Axios = require('axios');
const Sharp = require('sharp');

const ANCHOR_RSS_URL = 'https://anchor.fm/s/e3e1fd0/podcast/rss';
const TYPLOG_RSS_URL = 'https://avocadotoast.typlog.io/episodes/feed.xml';
const XIMALAYA_RSS_URL = 'https://www.ximalaya.com/album/29161862.xml';

// __dirname is the _data directory
const IMAGE_PATH = '/images/external/';
const IMAGE_DIRECTORY = Path.resolve(__dirname, '../images/external/');
const IMAGE_CACHE_DIRECTORY = process.env.NETLIFY ?
  Path.join(process.env.NETLIFY_BUILD_BASE, 'cache/', 'images/external/') :
  null;

const IMAGE_SIZES = [1280, 960, 640, 480, 320, 240, 160, 120, 80];
const IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png'];

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

const createDirectory = async function() {
  if (!FS.existsSync(IMAGE_DIRECTORY)) {
    await FS.mkdir(IMAGE_DIRECTORY);
    console.log(`Created external image directory: ${IMAGE_DIRECTORY}`);
  } else {
    console.log(`External image directory already exists: ${IMAGE_DIRECTORY}`);
  }
}

const loadCache = async function() {
  if (!process.env.NETLIFY) {
    return;
  }
  if (!FS.existsSync(IMAGE_CACHE_DIRECTORY)) {
    console.log(`Image cache directory doesn't exists: ${IMAGE_CACHE_DIRECTORY}`);
    return;
  }

  const files = await FS.readdir(IMAGE_CACHE_DIRECTORY);
  const copyings = [];
  files.forEach((file) => {
    copyings.push((async() => {
      await FS.copyFile(
        Path.join(IMAGE_CACHE_DIRECTORY, file),
        Path.join(IMAGE_DIRECTORY, file),
      );
      console.log(`Image loaded from cache: ${file}`);
    })());
  });

  await Promise.allSettled(copyings);
}

const saveCache = async function() {
  if (!process.env.NETLIFY) {
    return;
  }
  if (!FS.existsSync(IMAGE_CACHE_DIRECTORY)) {
    await FS.mkdir(IMAGE_CACHE_DIRECTORY, { recursive: true });
    console.log(`Created image cache directory: ${IMAGE_CACHE_DIRECTORY}`);
  } else {
    console.log(`Image cache directory already exists: ${IMAGE_CACHE_DIRECTORY}`);
  }

  const files = await FS.readdir(IMAGE_DIRECTORY);
  const copyings = [];
  files.forEach((file) => {
    copyings.push((async() => {
      await FS.copyFile(
        Path.join(IMAGE_DIRECTORY, file),
        Path.join(IMAGE_CACHE_DIRECTORY, file),
      );
      console.log(`Image saved to cache: ${file}`);
    })());
  });

  await Promise.allSettled(copyings);
}

const downloadImage = async function(url, file) {
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
      extension = '.jpg';
      break;
    case 'image/png':
      extension = '.png';
      break;
    default:
      console.error(`Unsupported content-type (${contentType}): ${url}`);
      extension = '';
  }

  const filename = `${file}${extension}`;
  const path = Path.join(IMAGE_DIRECTORY, filename);
  const virtualPath = Path.join(IMAGE_PATH, filename);

  if (FS.existsSync(path)) {
    console.log(`Image already exists: ${path}`);
    return {
      path,
      virtualPath,
    };
  }

  const writer = FS.createWriteStream(path);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.timeEnd(label);
      console.log(`Image downloaded: ${path}`);
      resolve({
        path,
        virtualPath,
      });
    });
    writer.on('error', (error) => {
      console.error(`Image download failure: ${label}`);
      reject(error);
    });
  });
}

const resizeImage = async function(filename) {
  /*
    All possible sizes:
      Episode:
        xs: 100% - 40px => 0 to 536px
        sm: 540px - 40px = 500px
        md: 720px / 3 - 40px => 200px
        lg: 960px / 3 - 40px => 280px
        xl: 1140px / 3 - 40px => 340px
      Episode List:
        xs: hidden
        sm: hidden
        md: (720px - 30px) / 6 - 35px => 80px
        lg: (960px - 30px) / 6 - 35px => 120px
        xl: (1140px - 30px) / 6 - 35px => 150px;
    Generated sizes:
      80px, 120px, 160px, 240px, 320px, 480px, 640px, 960px, 1280px
  */
  const directory = Path.dirname(filename);
  const extension = Path.extname(filename);
  const file = Path.basename(filename, extension);
  const path = Path.resolve(IMAGE_PATH, Path.relative(IMAGE_DIRECTORY, directory));
  const images = {};
  const resizings = IMAGE_SIZES.map(async (size) => {
    const resizing = Sharp(filename)
      .resize({
        width: size,
        height: size,
      });

    await Promise.allSettled([
      (async() => {
        const jpegPath = Path.join(directory, `${file}@${size}w.jpg`);
        const jpegVirtualPath = Path.join(path, `${file}@${size}w.jpg`);

        if (FS.existsSync(jpegPath)) {
          console.log(`Image already exists: ${jpegPath}`);
          images['image/jpeg'] = images['image/jpeg'] || {};
          images['image/jpeg'][size] = jpegVirtualPath;
          return;
        }

        await resizing
          .jpeg({
            quality: 90,
            progressive: true,
            chromaSubsampling: '4:4:4',
          })
          .toFile(jpegPath);

        console.log(`Image resized: ${jpegPath}`);
        images['image/jpeg'] = images['image/jpeg'] || {};
        images['image/jpeg'][size] = jpegVirtualPath;
      })(),

      (async() => {
        const pngPath = Path.join(directory, `${file}@${size}w.png`);
        const pngVirtualPath = Path.join(path, `${file}@${size}w.png`);

        if (FS.existsSync(pngPath)) {
          console.log(`Image already exists: ${pngPath}`);
          images['image/png'] = images['image/png'] || {};
          images['image/png'][size] = pngVirtualPath;
          return;
        }

        await resizing
          .png({
            progressive: true,
          })
          .toFile(pngPath);

        console.log(`Image resized: ${pngPath}`);
        images['image/png'] = images['image/png'] || {};
        images['image/png'][size] = pngVirtualPath;
      })(),

      (async() => {
        const webpPath = Path.join(directory, `${file}@${size}w.webp`);
        const webpVirtualPath = Path.join(path, `${file}@${size}w.webp`);

        if (FS.existsSync(webpPath)) {
          console.log(`Image already exists: ${webpPath}`);
          images['image/webp'] = images['image/webp'] || {};
          images['image/webp'][size] = webpVirtualPath;
          return;
        }

        await resizing
          .webp({
            lossless: true,
          })
          .toFile(webpPath);

        console.log(`Image resized: ${webpPath}`);
        images['image/webp'] = images['image/webp'] || {};
        images['image/webp'][size] = webpVirtualPath;
      })(),
    ]);
  });

  await Promise.all(resizings);

  const results = IMAGE_TYPES.map((type) => {
    return {
      type,
      sizes: IMAGE_SIZES.map((size) => {
        return {
          size,
          image: images[type][size],
        };
      }),
    };
  });
  return results;
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

  await createDirectory();
  await loadCache();
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

    if (typlogItem) {
      anchorItem.enclosures.push({
        ...typlogItem.enclosure,
        platform: 'Typlog',
      });
    }

    if (ximalayaItem) {
      anchorItem.enclosures.push({
        ...ximalayaItem.enclosure,
        url: ximalayaToSecure(ximalayaItem.enclosure.url),
        platform: 'Ximalaya',
      });
    }

    downloads.push((async() => {
      const {
        path,
        virtualPath,
      } = await downloadImage(anchorItem.itunes.image, `episode_${anchorEpisode || index + 1}`);
      anchorItem.itunes.image = virtualPath;
      anchorItem.itunes.images = await resizeImage(path);
    })());
  });

  downloads.push((async() => {
    const {
      path,
      virtualPath,
    } = await downloadImage(anchorFeed.itunes.image, 'feed');
    anchorFeed.itunes.image = virtualPath;
    anchorFeed.itunes.images = await resizeImage(path);
  })());

  await Promise.allSettled(downloads);
  await saveCache();

  return anchorFeed;
};

require('dotenv').config();

const Crypto = require('crypto');
const FS = { ...require('fs'), ...require('fs').promises };
const Path = require('path');
const Parser = require('rss-parser');
const Axios = require('axios');
const Sharp = require('sharp');

const PLATFORMS = {
  TYPLOG: 'Typlog',
  XIMALAYA: 'Ximalaya',
};

const TYPLOG_RSS_URL = 'https://avocadotoast.typlog.io/episodes/feed.xml';
const XIMALAYA_RSS_URL = 'https://www.ximalaya.com/album/29161862.xml';

// __dirname is the _data directory
const IMAGE_PATH = '/images/external/';
const IMAGE_DIRECTORY = Path.resolve(__dirname, '../images/external/');
const IMAGE_CACHE_DIRECTORY = process.env.NETLIFY
  ? Path.join(process.env.NETLIFY_BUILD_BASE, 'cache/', 'images/external/')
  : null;

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
const IMAGE_SIZES = [1280, 960, 640, 480, 320, 240, 160, 120, 80];
const IMAGE_TYPES = [
  'image/webp',
  'image/jpeg',
  // 'image/png',
];

const CONCURRENT_DOWNLOAD_LIMIT = 1;

const downloadQueue = [];
let concurrentDownloads = 0;
let cacheMissed = false;

const fetchFeed = async function (platform, url) {
  const label = `${platform} feed downloaded (${url})`;
  try {
    console.time(label);
    const parser = new Parser();
    const result = await parser.parseURL(url);
    console.log(
      `${platform} feed downloaded (${url}): ${result.items.length} episodes`,
    );
    console.timeEnd(label);
    if (!result) {
      throw new Error(`${platform} feed is null.`);
    }
    result.platform = platform;
    return result;
  } catch {
    console.error(`${platform} feed download failure: ${label}`);
    return {
      platform,
      items: [],
    };
  }
};

const ximalayaToSecure = function (url) {
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
};

const createDirectory = async function () {
  if (!FS.existsSync(IMAGE_DIRECTORY)) {
    await FS.mkdir(IMAGE_DIRECTORY);
    console.log(`Created external image directory: ${IMAGE_DIRECTORY}`);
  } else {
    console.log(`External image directory already exists: ${IMAGE_DIRECTORY}`);
  }
};

const loadCache = async function () {
  if (!process.env.NETLIFY) {
    return;
  }
  if (!FS.existsSync(IMAGE_CACHE_DIRECTORY)) {
    console.log(
      `Image cache directory doesn't exists: ${IMAGE_CACHE_DIRECTORY}`,
    );
    return;
  }

  const label = 'Cache loading job finished';
  console.time(label);
  console.log('Cache loading job starting');

  const files = await FS.readdir(IMAGE_CACHE_DIRECTORY);
  const copyings = [];
  files.forEach((file) => {
    copyings.push(
      (async () => {
        await FS.copyFile(
          Path.join(IMAGE_CACHE_DIRECTORY, file),
          Path.join(IMAGE_DIRECTORY, file),
        );
        /*
        console.log(
          `Image loaded from cache: ${Path.join(IMAGE_CACHE_DIRECTORY, file)}`,
        );
        */
      })(),
    );
  });

  await Promise.allSettled(copyings);
  console.log(`Cache loaded ${files.length} files`);
  console.timeEnd(label);
};

const saveCache = async function () {
  if (!process.env.NETLIFY) {
    return;
  }
  if (!cacheMissed) {
    console.log('Cache has no change');
    return;
  }
  if (!FS.existsSync(IMAGE_CACHE_DIRECTORY)) {
    await FS.mkdir(IMAGE_CACHE_DIRECTORY, { recursive: true });
    console.log(`Created image cache directory: ${IMAGE_CACHE_DIRECTORY}`);
  } else {
    console.log(
      `Image cache directory already exists: ${IMAGE_CACHE_DIRECTORY}`,
    );
  }

  const label = 'Cache saving job finished';
  console.time(label);
  console.log('Cache saving job starting');

  const files = await FS.readdir(IMAGE_DIRECTORY);
  const copyings = [];
  files.forEach((file) => {
    copyings.push(
      (async () => {
        await FS.copyFile(
          Path.join(IMAGE_DIRECTORY, file),
          Path.join(IMAGE_CACHE_DIRECTORY, file),
        );
        /*
        console.log(
          `Image saved to cache: ${Path.join(IMAGE_CACHE_DIRECTORY, file)}`,
        );
        */
      })(),
    );
  });

  await Promise.allSettled(copyings);
  console.log(`Cache saved ${files.length} files`);
  console.timeEnd(label);
};

const downloadImage = async function (url, file) {
  const label = `Image downloaded (${url})`;
  console.time(label);
  console.log(`Image downloading: ${file}`);

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
    // console.log(`Image already exists: ${path}`);
    console.timeEnd(label);
    return {
      path,
      virtualPath,
    };
  } else {
    cacheMissed = true;
  }

  const writer = FS.createWriteStream(path);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    const hash = Crypto.createHash('sha256');

    response.data.on('data', (data) => {
      hash.update(data);
    });

    response.data.on('end', () => {
      console.log(`Image received: ${path} (${hash.digest('hex')})`);
    });
    writer.on('finish', () => {
      console.timeEnd(label);
      console.log(`Image downloaded: ${path}`);
      resolve({
        path,
        virtualPath,
      });
    });

    response.data.on('error', (error) => {
      console.error(
        `Image receive failure: ${label} (${error.message.replace(
          /\n/g,
          ' ',
        )})`,
      );
      reject(error);
    });
    writer.on('error', (error) => {
      console.error(
        `Image download failure: ${label} (${error.message.replace(
          /\n/g,
          ' ',
        )})`,
      );
      reject(error);
    });
  });
};

const resizeImage = async function (filename) {
  const directory = Path.dirname(filename);
  const extension = Path.extname(filename);
  const file = Path.basename(filename, extension);
  const path = Path.resolve(
    IMAGE_PATH,
    Path.relative(IMAGE_DIRECTORY, directory),
  );
  const images = {};
  const resizings = IMAGE_SIZES.map(async (size) => {
    const resizing = Sharp(filename).resize({
      width: size,
      height: size,
    });

    await Promise.allSettled([
      (async () => {
        const jpegPath = Path.join(directory, `${file}@${size}w.jpg`);
        const jpegVirtualPath = Path.join(path, `${file}@${size}w.jpg`);

        if (FS.existsSync(jpegPath)) {
          // console.log(`Image already exists: ${jpegPath}`);
          images['image/jpeg'] = images['image/jpeg'] || {};
          images['image/jpeg'][size] = jpegVirtualPath;
          return;
        } else {
          cacheMissed = true;
        }

        try {
          await resizing
            .jpeg({
              quality: 90,
              progressive: true,
              chromaSubsampling: '4:4:4',
            })
            .toFile(jpegPath);

          // console.log(`Image resized: ${jpegPath}`);
          images['image/jpeg'] = images['image/jpeg'] || {};
          images['image/jpeg'][size] = jpegVirtualPath;
        } catch (error) {
          console.error(
            `Image resize failure: ${jpegPath} (${error.message.replace(
              /\n/g,
              ' ',
            )})`,
          );
          if (FS.existsSync(jpegPath)) {
            await FS.unlink(jpegPath);
          }
        }
      })(),

      /*
      (async () => {
        const pngPath = Path.join(directory, `${file}@${size}w.png`);
        const pngVirtualPath = Path.join(path, `${file}@${size}w.png`);

        if (FS.existsSync(pngPath)) {
          // console.log(`Image already exists: ${pngPath}`);
          images['image/png'] = images['image/png'] || {};
          images['image/png'][size] = pngVirtualPath;
          return;
        } else {
          cacheMissed = true;
        }

        try {
          await resizing
            .png({
              progressive: true,
            })
            .toFile(pngPath);

          // console.log(`Image resized: ${pngPath}`);
          images['image/png'] = images['image/png'] || {};
          images['image/png'][size] = pngVirtualPath;
        } catch (error) {
          console.error(
            `Image resize failure: ${pngPath} (${error.message.replace(
              /\n/g,
              ' ',
            )})`,
          );
          if (FS.existsSync(pngPath)) {
            await FS.unlink(pngPath);
          }
        }
      })(),
      */

      (async () => {
        const webpPath = Path.join(directory, `${file}@${size}w.webp`);
        const webpVirtualPath = Path.join(path, `${file}@${size}w.webp`);

        if (FS.existsSync(webpPath)) {
          // console.log(`Image already exists: ${webpPath}`);
          images['image/webp'] = images['image/webp'] || {};
          images['image/webp'][size] = webpVirtualPath;
          return;
        } else {
          cacheMissed = true;
        }

        try {
          await resizing
            .webp({
              lossless: true,
            })
            .toFile(webpPath);

          // console.log(`Image resized: ${webpPath}`);
          images['image/webp'] = images['image/webp'] || {};
          images['image/webp'][size] = webpVirtualPath;
        } catch (error) {
          console.error(
            `Image resize failure: ${webpPath} (${error.message.replace(
              /\n/g,
              ' ',
            )})`,
          );
          if (FS.existsSync(webpPath)) {
            await FS.unlink(webpPath);
          }
        }
      })(),
    ]);

    console.log(`Images resized: ${file}@${size}w`);
  });

  await Promise.allSettled(resizings);
  console.log(`Images resized: ${file}`);

  const results = {
    map: images,
    array: IMAGE_TYPES.map((type) => {
      return {
        type,
        sizes: IMAGE_SIZES.map((size) => {
          return {
            size,
            image: images[type][size],
          };
        }),
      };
    }),
  };
  return results;
};

const queueImageOperation = async (download, resize) => {
  return new Promise((resolve) => {
    downloadQueue.push({ download, resize, resolve });
    startNextImageOperation();
  });
};

const startNextImageOperation = async () => {
  if (concurrentDownloads >= CONCURRENT_DOWNLOAD_LIMIT) {
    return;
  }
  if (downloadQueue.length > 0) {
    concurrentDownloads++;
    const { download, resize, resolve } = downloadQueue.shift();
    let paths;
    try {
      paths = await download();
    } finally {
      concurrentDownloads--;
    }
    startNextImageOperation();
    if (paths) {
      await resize(paths);
    }
    resolve();
  }
};

module.exports = async function () {
  const [primaryFeed, ...secondaryFeeds] = await Promise.all([
    fetchFeed(PLATFORMS.TYPLOG, TYPLOG_RSS_URL),
    fetchFeed(PLATFORMS.XIMALAYA, XIMALAYA_RSS_URL),
  ]);

  if (primaryFeed.items.length === 0) {
    // Halt build process if no canonical feed candidate is available.
    console.error(`Halt: ${primaryFeed.platform} feeds download failure.`);
    throw new Error(`${primaryFeed.platform} feeds broken.`);
  }

  await createDirectory();
  await loadCache();
  const downloads = [];

  primaryFeed.items.forEach((primaryItem, index) => {
    primaryItem.platform = primaryFeed.platform;
    const secondaryItems = [];

    if (
      Number.isNaN(
        parseInt(primaryItem.itunes && primaryItem.itunes.episode),
        10,
      )
    ) {
      console.error(
        `${primaryFeed.platform} episode missing episode number: ${primaryItem.title}`,
      );
      primaryItem.itunes = primaryItem.itunes || {};
      primaryItem.itunes.episode = (
        primaryFeed.items.length - index
      ).toString();
      console.log(
        `${primaryFeed.platform} episode assuming episode number: ${primaryItem.itunes.episode}`,
      );
    }
    const primaryEpisode = parseInt(primaryItem.itunes.episode, 10);

    secondaryFeeds.forEach((feed) => {
      let item = feed.items.find(
        (item) =>
          item.itunes && item.itunes.episode === primaryItem.itunes.episode,
      );
      if (!item) {
        item = feed.items[feed.items.length - primaryFeed.items.length + index];
      }
      if (!item) {
        console.error(
          `Failed to match an episode in ${feed.platform} feed: ${
            primaryItem.title
          } (${primaryEpisode || index + 1})`,
        );
      } else {
        secondaryItems.push({
          ...item,
          platform: feed.platform,
        });
      }
    });

    primaryItem.enclosures = [
      {
        ...primaryItem.enclosure,
        platform: primaryItem.platform,
      },
    ];
    secondaryItems.forEach((item) => {
      primaryItem.enclosures.push({
        ...item.enclosure,
        url:
          item.platform === PLATFORMS.XIMALAYA
            ? ximalayaToSecure(item.enclosure.url)
            : item.enclosure.url,
        platform: item.platform,
      });
    });

    downloads.push(
      queueImageOperation(
        async () => {
          const label = `Download job finished: episode_${
            primaryEpisode || index + 1
          }`;
          console.time(label);
          console.log(
            `Download job starting: episode_${primaryEpisode || index + 1}`,
          );

          const paths = await downloadImage(
            primaryItem.itunes.image,
            `episode_${primaryEpisode || index + 1}`,
          );

          console.timeEnd(label);
          return paths;
        },
        async ({ path, virtualPath }) => {
          const label = `Resizing job finished: episode_${
            primaryEpisode || index + 1
          }`;
          console.time(label);
          console.log(
            `Resizing job starting: episode_${primaryEpisode || index + 1}`,
          );

          primaryItem.itunes.image = virtualPath;
          primaryItem.itunes.images = await resizeImage(path);

          console.timeEnd(label);
        },
      ),
    );
  });

  downloads.push(
    queueImageOperation(
      async () => {
        const label = 'Download job finished: feed';
        console.time(label);
        console.log('Download job starting: feed');

        const paths = await downloadImage(primaryFeed.itunes.image, 'feed');

        console.timeEnd(label);
        return paths;
      },
      async ({ path, virtualPath }) => {
        const label = 'Resizing job finished: feed';
        console.time(label);
        console.log('Resizing job starting: feed');

        primaryFeed.itunes.image = virtualPath;
        primaryFeed.itunes.images = await resizeImage(path);

        console.timeEnd(label);
      },
    ),
  );

  await Promise.allSettled(downloads);
  await saveCache();

  console.log('Feed data ready');
  return primaryFeed;
};

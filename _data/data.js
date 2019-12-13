require("dotenv").config();

const fetch = require('node-fetch');
const Parser = require('rss-parser');

const GRAPHQL_URL = 'https://graphql.fauna.com/graphql';
const RSS_URL = 'https://anchor.fm/s/e3e1fd0/podcast/rss';

const fetchGraphData = async function() {
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'authorization': `Bearer ${process.env.FAUNADB_SECRET}`,
        'content-type': 'application/json',
        'accepts': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            getAllEpisodes {
              data {
                number
                ximalayaURL
              }
            }
          }
        `,
      }),
    });

    const json = await response.json();

    return json.data.getAllEpisodes.data;
  } catch {
    return [];
  }
};

const fetchFeed = async function() {
  const parser = new Parser();
  const result = await parser.parseURL(RSS_URL);
  return result;
};

module.exports = async function() {
  const [graphData, feed] = await Promise.all([fetchGraphData(), fetchFeed()]);
  const metadata = graphData.reduce((result, current) => {
    result[current.number] = current;
    return result;
  }, []);

  feed.items.forEach(item => {
    const episode = parseInt(item.itunes && item.itunes.episode);
    if (Number.isNaN(episode) || !(episode in metadata)) {
      return;
    }
    item.links = [{
      name: 'Ximalaya',
      url: metadata[episode].ximalayaURL,
    }];
  });

  return feed;
};

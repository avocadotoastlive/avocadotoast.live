require("dotenv").config();

const fetch = require('node-fetch');

const ENDPOINT = 'https://graphql.fauna.com/graphql';

module.exports = async function() {
  try {
    const response = await fetch(ENDPOINT, {
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
                name
                ximalayaURL
                anchorURL
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

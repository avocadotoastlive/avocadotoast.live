# avocadotoast.live

Avocado Toast is our technology podcast in Chinese. This is the source code that builds the podcast's static website on [https://avocadotoast.live/](https://avocadotoast.live/). If you are interested in helping us improve the website, you come to the right place. Feel free to open new issues and contribute your own code. (If you are a listener of our podcast, you can join our [Telegram group](https://t.me/avocadotoastlisteners) to chat with us.)

## What do I need?

You need to have Git, [Node](https://nodejs.org/en/download/), [NVM](https://github.com/nvm-sh/nvm#installing-and-updating) and [Yarn](https://classic.yarnpkg.com/en/docs/install/) set up on your computer. I assume you have basic Git skills and know how to write JavaScript for Node.

## Where do I start?

Start with cloning this repository. Then get into the directory, set Node to the correct version and use Yarn to install dependencies. Set environment variable `NODE_ENV` to `development`. Start a local server with Yarn. Now you can modify the code and see your change locally.

```
git clone git@github.com:avocadotoastlive/avocadotoast.live.git
cd avocadotoast.live
nvm install
yarn install
echo 'NODE_ENV=development' > .env
yarn start
```

### NVM has error on Windows.

[NVM for Windows](https://github.com/coreybutler/nvm-windows#installation--upgrades) doesn't support Node version being defined in the [`.nvmrc`](https://github.com/avocadotoastlive/avocadotoast.live/blob/master/.nvmrc) file. `nvm install` without a version number will trigger an error. Use the following lines to replace the `nvm install` from above. (If [`.nvmrc`](https://github.com/avocadotoastlive/avocadotoast.live/blob/master/.nvmrc) is no longer pointing to lts/erbium, use the version defined in there instead.)

```
nvm install lts/erbium
nvm use lts/erbium
```

## How does it work?

This project uses a static site generator called [Eleventy](https://www.11ty.dev/). It fetches data from the podcast's feed and then generate a page for each episode. And then it adds a homepage. That's everything it does.

The homepage's source code is in [index.liquid](https://github.com/avocadotoastlive/avocadotoast.live/blob/master/_includes/index.liquid). [episodes.liquid](https://github.com/avocadotoastlive/avocadotoast.live/blob/master/_includes/episode.liquid) is responsible for generating one page for each episode. Both of them use a template language called [Liquid](https://shopify.github.io/liquid/).

## The build time is too slow.

You can limit the number of episodes used in the local development build by setting the environment variable `EPISODE_LIMIT`.

```
echo "EPISODE_LIMIT=3" >> .env
```

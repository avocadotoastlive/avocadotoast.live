# avocadotoast.live

Avocado Toast is our technology podcast in Chinese. This is the source code that builds the podcast's static website on [https://avocadotoast.live/](https://avocadotoast.live/). If you are interested in helping us improve the website, you come to the right place. Feel free to open new issues and contribute your own code. (If you are a listener of our podcast, you can join our [Telegram group](https://t.me/avocadotoastlisteners) to chat with us.)

## What do I need?

You need to have Git, [Node](https://nodejs.org/en/download/) and [Yarn](https://classic.yarnpkg.com/en/docs/install/) set up on your computer. I assume you have basic Git skills and know how to write JavaScript for Node.

## Where do I start?

Start with cloning this repository. Then get into the directory and use Yarn to install dependencies. Set environment variable `NODE_ENV` to `development`. Start a local server with Yarn. Now you can modify the code and see your change locally.

```
git clone git@github.com:CatChen/avocadotoast.live.git
cd avocadotoast.live
yarn install
echo 'NODE_ENV=development' > .env
yarn start
```

## How does it work?

This project uses a static site generator called [Eleventy](https://www.11ty.dev/). It fetches data from the podcast's feed and then generate a page for each episode. And then it adds a homepage. That's everything it does.

The homepage's source code is in [index.liquid](https://github.com/CatChen/avocadotoast.live/blob/master/index.liquid). [episodes.liquid](https://github.com/CatChen/avocadotoast.live/blob/master/episodes.liquid) is responsible for generating one page for each episode. Both of them use a template language called [Liquid](https://shopify.github.io/liquid/).

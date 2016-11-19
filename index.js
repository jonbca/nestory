const request = require('request');
const nestData = require('./nest_processor');
const mapValues = require('lodash.mapvalues');

require('dotenv').config();

const nestUrl = 'https://developer-api.nest.com';

function getNestData(url, authToken) {
  return new Promise((resolve, reject) => {
    request.get({
      url,
      auth: {
        bearer: authToken,
      },
      json: true,
    }, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
}

function transformNestData(body) {
  return mapValues(nestData, f => f(body));
}

function handler(fetcher, processor) {
  return (event, context) => {
    fetcher(nestUrl, { auth: process.env.ACCESS_TOKEN })
    .then(processor)
    .then(console.log)
    .then(() => context.done())
    .catch((err) => {
      console.error(`Nest request failed with error ${err}`);
    });
  };
}

module.exports = {
  handler: handler(getNestData, transformNestData),
};

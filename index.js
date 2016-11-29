const request = require('request');
const nestData = require('./nest_processor');
const mapValues = require('lodash.mapvalues');
const get = require('lodash.get');
const assign = require('lodash.assign');
const AWS = require('aws-sdk');

require('dotenv').config();

const nestUrl = 'https://developer-api.nest.com';
const weatherUrl = "https://query.yahooapis.com/v1/public/yql?q=select%20item.condition%20from%20weather.forecast%20where%20woeid%20%3D%2021125%20AND%20u%20%3D%20'c'&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys";

AWS.config.update({
  region: 'us-east-1',
});

const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = 'NestoryReadings';

function getNestData(url, authToken) {
  console.log('Fetching nest data');
  console.time('fetch-nest-data');
  return new Promise((resolve, reject) => {
    request.get({
      url,
      auth: {
        bearer: authToken,
      },
      json: true,
    }, (error, response, body) => {
      console.timeEnd('fetch-nest-data');
      if (error) {
        console.error('Error occurred fetching nest data', error);
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
}

function transformNestData(body) {
  const mappedValues = mapValues(nestData, f => f(body));
  mappedValues.timestamp = Math.floor(Date.now() / 1000);

  return mappedValues;
}

function saveNestData(body) {
  const params = {
    TableName: tableName,
    Item: body,
  };
  console.time('save-nest-data');
  return new Promise((resolve, reject) => {
    docClient.put(params, (err) => {
      console.timeEnd('save-nest-data');
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
}

function getWeather() {
  console.log('Fetching weather data');
  console.time('fetch-weather');
  return new Promise((resolve, reject) => {
    request.get({
      url: weatherUrl,
      json: true,
    }, (error, response, body) => {
      console.timeEnd('fetch-weather');
      if (error) {
        console.error('Error occurred fetching weather', error);
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
}

function addWeather(currentNestData) {
  return getWeather()
  .then((rawWeatherResponse) => {
    const outsideTemperature = parseInt(get(rawWeatherResponse, ['query', 'results', 'channel', 'item', 'condition', 'temp']), 10);
    const weatherConditions = get(rawWeatherResponse, ['query', 'results', 'channel', 'item', 'condition', 'text']);

    return { outsideTemperature, weatherConditions };
  })
  .then((minimalWeather) => {
    const m = assign(currentNestData, minimalWeather);
    return m;
  });
}

function handler(fetcher, processMessage) {
  return (event, context, callback) => {
    console.log('Beginning Nest data fetch');
    console.time('startNest');
    fetcher(nestUrl, process.env.ACCESS_TOKEN)
    .then(processMessage)
    .then(saveNestData)
    .then(addWeather)
    .then(saveNestData)
    .then((data) => {
      console.log(`Completed Nest API call. Ambient temperature: ${data.ambientTemperature}`);
      console.timeEnd('startNest');
      callback(null, JSON.stringify(data));
    })
    .catch((err) => {
      console.log(`Nest request failed with error ${JSON.stringify(err)}`);
      console.timeEnd('startNest');

      callback(JSON.stringify(err));
    });
  };
}

module.exports = {
  handler: handler(getNestData, transformNestData),
};

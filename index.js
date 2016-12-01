const request = require('request');
const nestData = require('./nest_processor');
const mapValues = require('lodash.mapvalues');
const assign = require('lodash.assign');
const AWS = require('aws-sdk');

const nestApiKey = process.env.NEST_API_KEY;
const darkskyApiKey = process.env.DARKSKY_API_KEY;

let latLong = process.env.LAT_LONG || '';
latLong = latLong.replace(/\|/, ',');

const nestUrl = 'https://developer-api.nest.com';
const weatherUrl = `https://api.darksky.net/forecast/${darkskyApiKey}/${latLong}?units=si&exclude=minutely,hourly,daily,alerts,flags`;

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
      headers: {
        Connection: 'close',
        'Accept-Encoding': 'identity',
      },
      timeout: 1500,
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
    const currently = rawWeatherResponse.currently;

    const outsideTemperature = parseFloat(currently.temperature);
    const weatherConditions = currently.summary;
    const outsideHumidity = parseFloat(currently.humidity);
    const apparentTemperature = parseFloat(currently.apparentTemperature);
    const windSpeed = parseFloat(currently.windSpeed);
    const cloudCover = parseFloat(currently.cloudCover);
    const dewPoint = parseFloat(currently.dewPoint);

    return { outsideTemperature,
      weatherConditions,
      outsideHumidity,
      apparentTemperature,
      windSpeed,
      cloudCover,
      dewPoint };
  })
  .then((minimalWeather) => {
    const m = assign(currentNestData, minimalWeather);
    return m;
  });
}

function handler(fetcher, processMessage) {
  return (event, context, callback) => {
    console.log('Beginning Nest data fetch');
    console.time('start-nest');
    fetcher(nestUrl, nestApiKey)
    .then(processMessage)
    .then(saveNestData)
    .then(addWeather)
    .then(saveNestData)
    .then((data) => {
      console.log(`Completed Nest API call. Ambient temperature: ${data.ambientTemperature}`);
      console.timeEnd('start-nest');
      callback(null, JSON.stringify(data));
    })
    .catch((err) => {
      console.log(`Nest request failed with error ${JSON.stringify(err)}`);
      console.timeEnd('start-nest');

      callback(JSON.stringify(err));
    });
  };
}

module.exports = {
  handler: handler(getNestData, transformNestData),
};

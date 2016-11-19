const request = require('request');
const nestData = require('./nest_processor');
const mapValues = require('lodash.mapvalues');
const AWS = require('aws-sdk');

require('dotenv').config();

const nestUrl = 'https://developer-api.nest.com';

AWS.config.update({
  region: 'us-east-1',
});

const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = 'NestoryReadings';

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
  const mappedValues = mapValues(nestData, f => f(body));
  mappedValues.timestamp = Math.floor(Date.now() / 1000);

  return mappedValues;
}

function saveNestData(body) {
  const params = {
    TableName: tableName,
    Item: body,
  };

  return new Promise((resolve, reject) => {
    docClient.put(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

function handler(fetcher, processMessage) {
  return (event, context, callback) => {
    fetcher(nestUrl, process.env.ACCESS_TOKEN)
    .then(processMessage)
    .then(saveNestData)
    .then((data) => {
      console.log(`Completed Nest API call. Ambient temperature: ${data.ambientTemperature}`);
      callback(null, JSON.stringify(data));
    })
    .catch((err) => {
      console.log(`Nest request failed with error ${JSON.stringify(err)}`);
      callback(JSON.stringify(err));
    });
  };
}

module.exports = {
  handler: handler(getNestData, transformNestData),
};

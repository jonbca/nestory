require('dotenv').config();

exports.handler = (event, context) => {
  console.log('Hello, world!');
  context.done();
};

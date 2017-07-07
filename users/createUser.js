'use strict';

const uuid = require('uuid');
const dynamodb = require('../shared/dynamodb');

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const s3 = new AWS.S3();

var shortid = require('shortid');

module.exports.createUser = (event, context, callback) => {

  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);
  console.log("parsed data");
  console.log(data);

  if (typeof data.text !== 'string') {
    const missingTextResponse = {
      statusCode: 400,
      body: JSON.stringify({
        "message": "Must have a valid text value"
      }),
      headers: {
        "x-custom-header": "My Header Value"
      }
    };
    callback(null, missingTextResponse);
    return;
  }

  var result = null;
  var mime = data.image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
  if (mime && mime.length) {
    result = mime[1];
  }

  if ((result !== "image/png") && (result !== "image/jpeg")) {
    const incorrectMimeType = {
      statusCode: 400,
      body: JSON.stringify({
        "message": "Must have a valid png or jpeg image value, encoded as base64String. Insteat got " + result
      }),
      headers: {
        "x-custom-header": "My Header Value"
      }
    };
    callback(null, incorrectMimeType);
    return;
  }

  var imageType
  if (result == "image/png") {
    imageType = "png"
  }
  if (result == "image/jpeg") {
    imageType = "jpeg"
  }

  // var buffer = new Buffer(data.image, 'base64');
  var buffer = new Buffer(data.image.replace(/^data:image\/\w+;base64,/, ""), 'base64');

  var imagePrefix = 'todo-images/' + shortid.generate() + "." + imageType;
  const s3Params = {
    Bucket: process.env.BUCKET,
    Key: imagePrefix,
    Body: buffer,
    ACL: 'public-read',
    ContentEncoding: 'base64',
    ContentType: result
  };

  var putObjectPromise = s3.putObject(s3Params).promise();

  putObjectPromise.then(function(promiseData) {
    console.log('Success');
    console.log(promiseData);
    console.log("eyyyy");
    console.log(data.first);
    console.log(data.last);
    console.log(data.text);

    const imageName = 'http://' + process.env.BUCKET + '.s3.amazonaws.com/' + imagePrefix;
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        id: uuid.v1(),
        text: data.text,
        checked: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        first: data.first,
        last: data.last,
        image: imageName
      },
    };
    console.log("some stuff");
    console.log(params);


    // write the todo to the database
    dynamodb.put(params, (error) => {
      // handle potential errors
      if (error) {
        console.error(error);
        callback(new Error('Couldn\'t create the todo item.'));
        return;
      }

      // create a response
      const response = {
        statusCode: 200,
        body: JSON.stringify(params.Item),
      };
      callback(null, response);
    });

  }).catch(function(err) {
    console.log(err);

    // create a response
    const s3PutResponse = {
      statusCode: 500,
      body: JSON.stringify({
        "message": "Unable to load image to S3"
      }),
    };
    callback(null, s3PutResponse);

  });



};

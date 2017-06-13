'use strict';

const dynamodb = require('./dynamodb');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports.delete = (event, context, callback) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
    ReturnValues: "ALL_OLD"
  };
  console.log(params);
  // delete the todo from the database
  dynamodb.delete(params, function(error, data) {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(new Error('Couldn\'t remove the todo item.'));
      return;
    }

    if (typeof data.Attributes.image == 'string') {
      // We need to delete image too
      var cleanKey = data.Attributes.image.replace('http://' + process.env.BUCKET + '.s3.amazonaws.com/', "");

      const s3Params = {
        Bucket: process.env.BUCKET,
        Key: cleanKey,
      };

      var deleteObjectPromise = s3.deleteObject(s3Params).promise();

      deleteObjectPromise.then(function(data) {
        console.log('Success');
        console.log(data); // successful response
        const response = {
          statusCode: 200,
          body: JSON.stringify({
            "message": "Successfully deleted ${data.Attributes.id} with image."
          }),
        };
        callback(null, response);


      }).catch(function(err) {
        console.log(err);

        // create a response
        const s3PutResponse = {
          statusCode: 500,
          body: JSON.stringify({
            "message": "Unable to delete image in S3 for ${data.Attributes.id}"
          }),
        };
        callback(null, s3PutResponse);

      });

    } else {
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          "message": "Successfully deleted ${data.Attributes.id}"
        }),
      };
      callback(null, response);

    }

  });

};

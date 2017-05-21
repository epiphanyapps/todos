	'use strict';

const uuid = require('uuid');
const dynamodb = require('./dynamodb');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const s3 = new AWS.S3({accessKeyId: 'AKIAI2Q5YKPJ3P3EQC7A', secretAccessKey: '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'});

module.exports.create = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);
  
  if (typeof data.text !== 'string') {

      const missingTextResponse = {
        statusCode: 400,
        body: JSON.stringify({ "message": "Must have a valid text value" }),
        headers: {"x-custom-header" : "My Header Value"}
      };

      callback(new Error('Couldn\'t create the todo item.'), missingTextResponse);
    return;
  }
  
  if (typeof data.image !== 'string') {
	
    const missingImageResponse = {
      statusCode: 400,
      body: JSON.stringify({ "message": "Must have a valid image value, base64String" }),
      headers: {"x-custom-header" : "My Header Value"}
    };
	
    callback(new Error('Couldn\'t create the todo item.'), missingImageResponse);
    return;
  }
  
  var buffer = new Buffer(data.image, 'base64')
  const s3Params =  {
     Bucket: process.env.BUCKET,
     Key: "finall/image.txt",
     Body: buffer
  }
  console.log(s3Params)
  
  s3.putObject(s3Params, function(err, data) {
	    if (err) {
  		  	console.log(":()")
			console.log(err); // an error occurred
			console.log("---------")
			console.log(err.stack);
  		  	console.log(":()")
		} else{
			console.log(data);  // successful response
		}               
	  });

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      id: uuid.v1(),
      text: data.text,
      checked: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

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
};

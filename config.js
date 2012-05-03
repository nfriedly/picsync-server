exports.port = 

// s3 settings

var awssum = require('awssum')
	,amazon = awssum.load('amazon/amazon'); // to set the region

exports.AWS_KEY = process.env.AWS_KEY || '';

exports.AWS_SECRET = process.env.AWS_SECRET || '';

exports.AWS_REGION = amazon.US_EAST_1;

exports.isS3Enabled = exports.AWS_KEY && exports.AWS_REGION;

// mock s3 settings

exports.storageDir = process.env.STORAGE_DIR || '/tmp'; // todo: better name for this 


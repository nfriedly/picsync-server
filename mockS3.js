var config = require('./config')
	, fs = require('fs');

exports = function(){};

var proto = exports.prototype; // shortcut

proto.ListObjects = function(options, cb) {
	fs.readDir(config.mockS3Dir, cb);
}

proto.PubObject = function(options, cb) {
	var target = fs.createWriteStream(config.mockS3Dir + options.ObjectName);
	optionsBody.pipe(target);
	target.on('end', cb); // todo: make sure this passes back the right data
}
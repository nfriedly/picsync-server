
/**
 * Module dependencies.
 */

var express = require('express')
  , less = require('less')
  , formidable = require('formidable')
  , awssum = require('awssum')
  , amazon = awssum.load('amazon/amazon')
  , s3Service = awssum.load('amazon/s3')
  , fs = require('fs')
  , _ = require("underscore")._;

var s3 = new s3Service(process.env.AWS_KEY, process.env.AWS_SECRET, 'aws_account_id', amazon.US_EAST_1);

var app = module.exports = express.createServer();

// Configuration


//https://github.com/senchalabs/connect/pull/174#issuecomment-3708047
express.compiler.compilers.less.compile = function(str, fn){
	console.log('less compiler called for ', str);
    try {
        less.render(str, {paths: [__dirname + "/public/stylesheets"]}, fn);
    } catch (err) {
        fn(err);
    }
};

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view options', { layout: false });
  app.set('view engine', 'jade');
  //app.use(app.router);
  app.use(express.compiler({src: __dirname + '/public', enable: ['less'] }));
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.use(express.logger());
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// custom render function
app.use(function(req, res, next) {
	console.log("processing request");
	res.renderPage = function(page, options) {
		options = _.defaults(options || {}, {
			title: 'PicSync', 
			ga_id: process.env.GA_ID || '',
		});
		this.render('pages/'+page, options);
	}
	next();
});

// Routes

app.get('/', function(req, res) {
	res.renderPage('index');
});

app.get('/privacy', function(req, res) {
	res.renderPage('privacy', {title: 'PicSync Privacy Policy'});
});

app.get('/upload', function(req, res) {
	res.render('upload',  {title: 'Upload Photos' });
});

app.post('/upload', function(req, res) {

	console.log('starting upload');
	
    // parse
    var form = new formidable.IncomingForm()
      , files = {};

    form.maxFieldsSize = 20 * 1024 * 1024; // 20mb
    form.keepExtensions = true;
    
    var errors = [];

    form.on('file', function(name, file){
    
    	//todo: imagemagick resizing and whatnot
    	
    	console.log("%s uploaded successfully, sending it to to the %s bucket in s3", file.name, process.env.S3_BUCKET);

		// todo: mod awessum to accept a readStream for the body - should be small changes around
		// lines 403 and 646 of  https://github.com/appsattic/node-awssum/blob/master/lib/awssum.js
		var options = {
			BucketName : process.env.S3_BUCKET,
			ObjectName : file.name,
			ContentLength : file.length,
			Body : fs.readFileSync(file.path),
		};
	
		s3.PutObject(options, function(err, data) {
			console.log('s3 upload complete', err, data);
			if(err) {
				errors.push(err);
				throw err
			}
		});
		
		fs.unlink(file.path);
    });

    form.on('error', function(err){
    	console.log('formidable error', err);
    	errors.push(err)
		throw err;
    });
    
    form.on('aborted', function() {
    	console.log('request aborted');
    	errors.push("aborted");
    });
    
    form.on('fileBegin', function(name, file) {
    	console.log('fileBegin', name, file);
    });

    form.on('progress', function(bytesReceived, bytesExpected) {
    	console.log('progress event - %s of %s recieved (%s%)', bytesReceived, bytesExpected, Math.round(bytesReceived/bytesExpected*100));
    });

    form.on('field', function(name, value) {
    	console.log('field received: %s=%s', name, value);
    });

    form.on('end', function(){
    	console.log('formidable end');
    	//var success = (errors.length == 0);
		//res.writeHead(success ? 200 : 500, {"content-type": "text/plain"});
		//res.end(success ? "Success!" : "There were errors uploading the file :(" );
    });

    form.parse(req, function(err, fields, files) {
    	console.log('formidable cb fired', err, "\nFields: ",Object.getKeys(fields), "\nFiles: ", Object.getKeys(files));
		res.writeHead(200, {"content-type": "text/plain"});
    	res.write('received upload:\n\n');
      	res.end(JSON.stringify({fields: fields, files: files}));
    });

});



app.listen(process.env.PORT || 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

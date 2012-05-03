
/**
 * Module dependencies.
 */

var express = require('express')
  , less = require('less')
  , formidable = require('formidable')
  , awssum = require('awssum')
  , amazon = awssum.load('amazon/amazon')
  , s3Service = awssum.load('amazon/s3')
  , MockS3 = require('mockS3')
  , fs = require('fs')
  , _ = require("underscore")._;
  
var config = require('./config');

var s3 = (config.isS3Enabled) ? new s3Service(config.AWS_KEY, config.AWS_SECRET, 'asdf' /* account id is not actually needed */, config.AWS_REGION) : new mockS3();

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
  app.use(function(req, res, next) {
  	// todo: process verify fb cookies and extract user id, store that and basic info in session
  	req.fb = {userId: "215902661"};
  	next();
  });
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

app.get("/pictures", function(req, res) {
	s3.ListObjects({
			BucketName : process.env.S3_BUCKET,
			MaxKeys : 100,
			Prefix : req.fb.userId + "/",
		}, function(err, data) {
			if(data && data.Body.ListBucketResult && data.Body.ListBucketResult.Contents) {
				var pics = data.Body.ListBucketResult.Contents;
				// note: contents is an array of objects if there are multiple, but a lone object (no array) if there is exactly one
				if (!_.isArray(pics)) {
					pics = [pics];
				}
				res.renderPage('pictures', {pics: pics, bucket: process.env.S3_BUCKET + ".s3.amazonaws.com"});
			} else {
				res.writeHead(200, {"content-type": "text/plain"});
				res.end((err? "Error" : "Success, but") + " no pictures, response is\n" + JSON.stringify(err || data));
			}
	});
});

app.get('/upload', function(req, res) {
	res.renderPage('upload',  {title: 'Upload Photos' });
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
    	
    	var now = new Date();
    	var upload_path = req.fb.userId + "/" + now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate() + "/";
    	
    	// todo: content-type, md5, expires
		var options = {
			BucketName : process.env.S3_BUCKET,
			ObjectName : upload_path + file.name,
			ContentLength : file.length,
			ContentType: "image/jpeg",
			Body : fs.createReadStream(file.path),
			Acl: "public-read" // todo: consider making this authenticated-read and getting signed urls each time
		};
	
		s3.PutObject(options, function(err, data) {
			console.log('s3 upload complete', err, data);
			
			fs.unlink(file.path);
		});
		
    });

    form.on('error', function(err){
    	console.log('formidable error', err);
    });

    form.on('field', function(name, value) {
    	console.log('field received: %s=%s', name, value);
    });

    form.on('end', function(){
    	console.log('formidable end');
    });

    form.parse(req, function(err, fields, files) {
    	console.log('formidable cb fired', err, "\nFields: ",_.keys(fields), "\nFiles: ", _.keys(files));
		res.writeHead(200, {"content-type": "text/plain"});
    	res.write('received upload:\n\n');
      	res.end(JSON.stringify({fields: fields, files: files}));
    });

});



app.listen(process.env.PORT || 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

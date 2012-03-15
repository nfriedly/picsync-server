
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , less = require('less');

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
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.compiler({ 
  	src: __dirname + '/public', enable: ['less'] }));
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);

app.listen(process.env.PORT || 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

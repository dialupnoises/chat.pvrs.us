var express  = require('express'),
	colors   = require('colors'),
	stylus   = require('stylus'),
	nib		 = require('nib'),
	passport = require('passport'),
	fs  	 = require('fs'),
	nconf 	 = require('nconf'),
	log4js   = require('log4js');

var Site = {};
var PORT = Site.Port = process.env.PORT || 3001;
nconf.argv().env().file({ file: './config.json' });

log4js.configure({
	appenders: [
		{
			type: 'loggly',
			token: nconf.get('loggly'),
			subdomain: 'cpancake',
			tags: ['https'],
			category: 'express'
		},
		{
			type: 'loggly',
			token: nconf.get('loggly'),
			subdomain: 'cpancake',
			tags: ['https'],
			category: 'chat'
		}
	]
});

Site.Domain = process.env.NODE_ENV == 'production' ? 'chat.pvrs.us' : ('localhost:' + PORT);
Site.Config = nconf;
Site.Util = require('./util');
Site.Logger = log4js.getLogger('loggly');
Site.ChatLogger = log4js.getLogger('chat');

var app = express();

app.configure(function() {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');  
	app.use(log4js.connectLogger(Site.Logger, { level: 'auto' }));
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({secret: nconf.get('secret')}));
	app.use(express.logger('dev'));
	app.use(passport.initialize());
	app.use(passport.session());
	app.locals.pretty = !(process.env.NODE_ENV == 'production');
	app.use(stylus.middleware({
		src: __dirname + '/assets',
		dest: __dirname + '/public',
		debug: true,
		compile: function(str, path) {
			return stylus(str).set('filename', path).set('warn', true).set('compress', true).use(nib());
		}
	}));
	app.use(express.static(__dirname + '/public'));
});

Site.App = app;

Site.Routes = {};
Site.Routes.Main = require('./routes/main').initialize(Site);
Site.Routes.User = require('./routes/user').initialize(Site);

Site.Server = require('http').createServer(app);

require('./chat').initialize(Site);

Site.Server.listen(PORT);

console.log(('App listening on port ' + PORT).cyan);

process.on('uncaughtException', function (exception) {
	Site.Logger.error(exception.stack);
});
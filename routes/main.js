var browserify = require('browserify');

var Site, app, nconf;

exports.initialize = function(_Site)
{
	Site = _Site;
	app = Site.App;
	nconf = Site.Config;

	app.get('/', Site.Util.ensureAuthenticated, function(req, res) {
		res.render('index', { domain: (process.env.NODE_ENV == 'production' ? Site.Domain + ':' + Site.Port : Site.Domain), auth: req.user.sessionID });
	});

	if(process.env.NODE_ENV != 'production')
		app.get('/js/chat.js', function(req, res) {
			res.type('text/javascript');
			var b = browserify();
			b.add('./assets/js/main.js');
			b.bundle().pipe(res);
		});

	return module.exports;
}
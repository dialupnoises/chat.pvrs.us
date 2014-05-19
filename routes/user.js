var passport       = require('passport'),
	crypto		   = require('crypto'),
	GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var Site, app, nconf;

var Users = {};
exports.Users = Users;

exports.initialize = function(_Site)
{
	Site = _Site;
	app = Site.App;
	nconf = Site.Config;

	app.get('/login', function(req, res) {
		if(req.user) return res.redirect('/');
		res.render('login', {not_logged_in: true});
	});

	app.get('/login/student', passport.authenticate('google_student', { scope: [ 'profile', 'email' ], hostedDomain: 'pioneervalley.k12.ma.us' }),
		function(req, res) {
			res.redirect('/');
		}
	);

	app.get('/login/student/callback', passport.authenticate('google_student', { failureRedirect: '/login' }), 
		function(req, res) { 
			res.redirect('/'); 
		}
	);

	app.get('/login/teacher', passport.authenticate('google_teacher', { scope: [ 'profile', 'email' ], hostedDomain: 'pvrsd.pioneervalley.k12.ma.us' }),
		function(req, res) {
			res.redirect('/');
		}
	);

	app.get('/login/teacher/callback', passport.authenticate('google_teacher', { failureRedirect: '/login' }), 
		function(req, res) { 
			res.redirect('/'); 
		}
	);

	app.get('/logout', function(req, res) {
		if(!req.user) return res.redirect('/login');
		Users[req.user.sessionID] = null;
		req.logout();
		res.render('logged_out', {not_logged_in: true});
	});

	passport.use('google_student', new GoogleStrategy({
			callbackURL: 'http://' + Site.Domain + '/login/student/callback',
			clientID: nconf.get('oauth:client_id'),
			clientSecret: nconf.get('oauth:client_secret')
		}, processUser)
	);

	passport.use('google_teacher', new GoogleStrategy({
			callbackURL: 'http://' + Site.Domain + '/login/teacher/callback',
			clientID: nconf.get('oauth:client_id'),
			clientSecret: nconf.get('oauth:client_secret')
		}, processUser)
	);

	function processUser (accessToken, refreshToken, profile, done) {
			var p = {
				id: profile.id,
				name: profile.displayName,
				email: profile.emails[0].value
			};
			computeID(p, function(id) {
				p.sessionID = id;
				p.color = computeColor(p);
				Users[p.sessionID] = p;
				done(null, p);
			});
	}

	passport.serializeUser(function(user, done) {
		done(null, user);
	});

	passport.deserializeUser(function(obj, done) {
		done(null, obj);
	});

	return module.exports;
}

// compute session ID
function computeID(profile, callback) 
{
	var sha = crypto.createHash('sha256');
	sha.update(profile.id);
	sha.update(profile.name);
	sha.update(profile.email);
	crypto.randomBytes(64, function(err, bytes) {
		if(err) throw err;
		sha.update(bytes);
		callback(sha.digest('hex'));
	});
}

// compute user color from their ID
function computeColor(profile)
{
	var md5 = crypto.createHash('md5');
	md5.update(profile.id);
	var digest = md5.digest();
	// average 1-5, 6-10, and 11-15 together (16 is ignored)
	var R = (digest[0] + digest[1] + digest[2] + digest[3] + digest[4]) / 5;
	var G = (digest[5] + digest[6] + digest[7] + digest[8] + digest[9]) / 5;
	var B = (digest[10] + digest[11] + digest[12] + digest[13] + digest[14]) / 5;
	// mix color with grey
	R = Math.floor((R + 200) / 2);
	G = Math.floor((G + 200) / 2);
	B = Math.floor((B + 200) / 2);
	// return a hex string
	return pad(R.toString(16), 2) + pad(G.toString(16), 2) + pad(B.toString(16), 2);
}

function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}
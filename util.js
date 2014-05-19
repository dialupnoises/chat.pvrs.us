exports.ensureAuthenticated = function(req, res, next) {
	if(req.isAuthenticated())
	{
		if(req.session.after_redirect)
		{
			res.redirect(req.session.after_redirect);
			req.session.after_redirect = null;
			return;
		}
		return next();
	}
	req.session.after_redirect = req.originalUrl;
	res.redirect('/login');
}
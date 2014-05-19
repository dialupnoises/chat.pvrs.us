var socketio = require('socket.io'),
	marked   = require('marked');

var Site, app, nconf, io, logger;

var Rooms = {
	'pvrs': 		'PVRS',
	'grade7': 		'7th Grade',
	'grade8': 		'8th Grade',
	'grade9': 		'9th Grade',
	'grade10': 		'10th Grade',
	'grade11': 		'11th Grade',
	'grade12': 		'12th Grade',
	'lounge': 		'Lounge',
	'sports': 		'Sports',
	'clubs': 		'Clubs',
	'academics': 	'Academics',
	'tech': 		'Technology',
	'politics': 	'Politics',
	// ~hidden rooms~
	'kkk': 			'Kool Kidz Klub',
	'oify': 		'OIFY'
};

var Rooms_Hidden = ['oify', 'kkk'];
var Connected_Clients = {};

exports.initialize = function(_Site)
{
	Site = _Site;
	app = Site.App;
	nconf = Site.Config;
	logger = Site.ChatLogger;
	io = socketio.listen(Site.Server);
	io.on('connection', function(socket) {
		socket.emit('cl_auth');
		// user must send this on connection
		socket.on('sv_authenticate', function(data) {
			if(!data.sessionID || !Site.Routes.User.Users[data.sessionID])
				return logError(socket, 'Invalid login token: try logging out and in again.');
			var user = Site.Routes.User.Users[data.sessionID];
			if(Connected_Clients[user.id])
				return logError(socket, 'You are already connected to the server.');
			Connected_Clients[user.id] = true;
			socket.set('id', user.id, function() {
				socket.set('color', user.color, function() {
					socket.set('name', user.name, function() {
						socket.set('authed', true, function() {
							Object.keys(Rooms).forEach(function(r) {
								if(Rooms_Hidden.indexOf(r) == -1)
									socket.emit('cl_rm_info', {id: r, name: Rooms[r]});
							});
							logger.info(user.name + ' (' + user.email.substr(0, user.email.indexOf('@')) + ') connected to the server.');
							return socket.emit('cl_success');
						});
					});
				});
			});
		});
		// user joins room, send them the status and announce their presence
		socket.on('sv_rm_join', function(data) {
			socket.get('authed', function(err, authed) {
				socket.get('id', function(err, uid) {
					if(err || !authed)
						return logError(socket, 'You must authenticate before joining a room.');
					if(!data.room)
						return logError(socket, 'You did not provide a room with that request. Try again.');
					if(!Rooms[data.room])
						return logError(socket, 'That room doesn\'t exist.');
					socket.join(data.room);
					socket.get('name', function(err, name) {
						logger.info(name + ' joined the room ' + Rooms[data.room]);
					});
					(io.sockets.clients(data.room) || []).forEach(function(s) {
						s.get('id', function(err, id) {
							socket.emit('cl_rm_user', {
								room: data.room,
								id: id
							});
						});
					});
					socket.broadcast.to(data.room).emit('cl_user_join', {
						id: uid,
						room: data.room
					});
					socket.emit('cl_user_join', { id: uid, room: data.room, me: true });
				});
			});
		});
		// user leaves room, announce and remove from room
		socket.on('sv_rm_leave', function(data) {
			socket.get('authed', function(err, authed) {
				socket.get('id', function(err, uid) {
					if(err || !authed)
						return logError(socket, 'You must authenticate before joining a room.');
					if(!data.room)
						return logError(socket, 'You did not provide a room with that request. Try again.');
					if(!Rooms[data.room])
						return logError(socket, 'That room doesn\'t exist.');
					if(!io.sockets.manager.roomClients[socket.id]['/' + data.room])
						return logError(socket, 'You have not joined this room.');
					delete Connected_Clients[uid];
					socket.leave(data.room);
					socket.get('name', function(err, name) {
						Site.ChatLogger.info(name + ' left the room ' + Rooms[data.room]);
					});
					socket.broadcast.to(data.room).emit('cl_user_leave', {
						id: uid,
						room: data.room
					});
				});
			});
		});
		// user sends message to room
		socket.on('sv_chat_message', function(data) {
			socket.get('authed', function(err, authed) {
				socket.get('id', function(err, uid) {
					if(err || !authed)
						return logError(socket, 'You must authenticate before sending a message.');
					if(!data.room)
						return logError(socket, 'You did not provide a room with that request. Try again.');
					if(!Rooms[data.room])
						return logError(socket, 'That room doesn\'t exist.');
					if(!data.message)
						return logError(socket, 'You did not provide a message with that request. Try again.');
					if(!io.sockets.manager.roomClients[socket.id]['/' + data.room])
						return logError(socket, 'You have not joined this room.');
					socket.get('name', function(err, name) {
						Site.ChatLogger.info('('+Rooms[data.room]+') ['+name+'] ' + data.message);
					});
					socket.broadcast.to(data.room).emit('cl_chat_message', {
						id: uid,
						room: data.room,
						message: data.message
					});
					socket.emit('cl_chat_message', {
						id: uid,
						room: data.room,
						message: data.message
					});
				});
			});
		});
		// user needs to know who a user is
		socket.on('sv_user_info', function(data) {
			socket.get('authed', function(err, authed) {
				if(err || !authed)
					return logError(socket, 'You must authenticate before requesting user info.');
				if(!data.id)
					return logError(socket, 'You did not provide a user ID with that request. Try again.');
				var user = (function() {
					var us = Site.Routes.User.Users;
					for(var i=0;i<Object.keys(us).length;i++)
					{
						var user = us[Object.keys(us)[i]];
						if(!user)
							continue;
						if(user.id == data.id)
							return user;
					}
					return null;
				})();
				if(!user)
					return logError(socket, 'That user doesn\'t exist.');
				socket.emit('cl_user_info', {
					id: user.id,
					name: user.name,
					color: user.color,
					shortname: user.email.substr(0, user.email.indexOf('@'))
				});
			});
		});

		socket.on('disconnect', function () {
			socket.get('id', function(err, id) {
				if(err || !id) return;
				socket.get('name', function(err, name) {
					Site.ChatLogger.info(name + ' disconnected.');
				});
				delete Connected_Clients[id];
				Object.keys(io.sockets.manager.roomClients[socket.id]).forEach(function(room) {
					room = room.substr(1);
					io.sockets.in(room).emit('cl_user_leave', {
						id: id,
						room: room
					});
				});
			});
	    });
	});
}

function logError(socket, err)
{
	socket.get('id', function(e, id) {
		if(err || !id)
			return log(socket, err, 'Unknown User');
		else
			socket.get('name', function(e, name) {
				log(socket, err, name);
			});
	});
	function log(socket, err, user)
	{
		Site.ChatLogger.error('Error: [' + user + '] ' + err);
		socket.emit('cl_error', {msg: err});
	}
}
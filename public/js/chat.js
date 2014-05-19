(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var activeNode, App;

exports.initialize = function(_App)
{
	App = _App;
}

exports.showDialog = function(msg) {
	showModal('Message', msg);
}

exports.showError = function(msg) {
	showModal('Error', msg);
}

exports.showRoomList = function(rooms) {
	$('#room-menu').empty();
	Object.keys(rooms).forEach(function(room) {
		console.log(room);
		$('#room-menu').append('<option value=\''+room+'\'>'+rooms[room]+'</option>');
	});
	$('#select-modal').fadeIn('fast');
	$('#info-modal-bg').fadeIn('fast');
}

exports.closeSelectModal = function() {
	$('#select-modal').fadeOut('fast');
	$('#info-modal-bg').fadeOut('fast');
}

exports.closeModal = function() {
	$('#info-modal').fadeOut('fast');
	$('#info-modal-bg').fadeOut('fast');
}

exports.generateUserList = function(room, room_users, users) {
	var list = $('#room-' + room + ' .room-users-list');
	if(!list) return;
	list.empty();
	var done = [];
	var html = '';
	room_users.forEach(function(id) {
		if(done.indexOf(id) != -1) return;
		list.append('<li></li>');
		$('#room-' + room + ' .room-users-list li').last().text(users[id].name).css('color', '#' + users[id].color);
	});
}

exports.message = function(room, msg) {
	console.log('Message: ' + msg);
	msg = escapeHtml(msg);
	addMessage(room, '<div class="chat-highlight">' + msg + '</div>');
}

var italicRegex = /_(.+?)_/;
var boldRegex = /\*(.+?)\*/;
var stRegex = /~(.+?)~/;

exports.chatMessage = function(room, user, message) {
	console.log('Chat Message: ' + message);
	msg = escapeHtml(message);
	msg = msg.replace(italicRegex, '<em>$1</em>');
	msg = msg.replace(boldRegex, '<strong>$1</strong>');
	//msg = msg.replace(stRegex, '<strike>$1</strike>');
	msg = Autolinker.link(msg, { className: 'chatlink' });
	addMessage(room, '<div class="chat-message"><span class="chat-message-user" style="color:#'+user.color+'">'+user.name+': </span><span>' + msg + '</span></div>');
}

exports.tabClick = function(tab) {
	var node = $(tab);
	activeNode = $('.room-tab.active').first();
	if(node.hasClass('active'))
	{
		console.log('Leaving room ' );
		var response = window.confirm('Are you sure you want to leave the room?');
		if(!response) return;
		App.leaveRoom(node.attr('data-room').replace('#room-', ''));
		node.remove();
		$(node.attr('data-room')).hide();
		var activeNode = $('.room-tab').first();
		activeNode.addClass('active');
		$(activeNode.attr('data-room')).show();
	}
	else
	{
		node.addClass('active');
		activeNode.removeClass('active');
		$(activeNode.attr('data-room')).hide();
		$(node.attr('data-room')).show();
		activeNode = node;
	}
}

exports.joinRoom = function() {
	var room = $('#room-menu').val();
	if(!room) return closeSelectModal();
	if(!App.isRoom(room)) return closeSelectModal();
	var active = $('.room-tab.active').first();
	active.removeClass('active');
	$(active.attr('data-room')).hide();
	$('.room').last().after($('.room').first().clone());
	var r = $('.room').last();
	r.attr('id', 'room-' + room);
	$('.room .room-chat-messages').last().empty();
	$('.room .room-users-list').last().empty();
	var name = App.joinRoom(room);
	$('.room-add').before('<div class="room-tab" data-room="#room-'+room+'" onclick="tabClick(this)"><div>'+name+'</div></div>');
	activeNode = $('.room-tab').last();
	activeNode.addClass('active');
	$('.room').last().show();
	return closeSelectModal();
}

exports.hideLoading = function() {
	$('#loading').hide('slow');
}

function addMessage(chat, message)
{
	$('#room-'+chat+' .room-chat-messages').append(message);
	$('#room-'+chat+' .room-chat-messages').scrollTop($('#room-'+chat+' .room-chat-messages')[0].scrollHeight);
}

function showModal(title, message) 
{
	$('#info-modal h2').text(title);
	$('#info-modal p').text(message);
	$('#info-modal').fadeIn('fast');
	$('#info-modal-bg').fadeIn('fast');
}

function escapeHtml(text) {
  return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}
},{}],2:[function(require,module,exports){
var gui = require('./gui');

var App = {};

var Room_List = {};
var In_Rooms = [];
var Users = {};
var Rooms = {};
// users we don't know the info of yet
var Pending_Users = {};

console.log('Connecting to server on ' + domain);
var socket = io.connect('http://' + domain + '/');

socket.on('cl_auth', function(data) {
	console.log('Sending auth code to server.');
	socket.emit('sv_authenticate', {sessionID: auth});
});

socket.on('cl_success', function(data) {
	console.log('Authentication accepted.');
	socket.emit('sv_rm_join', {room: 'pvrs'});
});

socket.on('cl_rm_info', function(data) {
	console.log('Got room info for room ' + data.name);
	Room_List[data.id] = data.name;
});

socket.on('cl_rm_user', function(data) {
	Rooms = Rooms[data.room] || [];
	if(Rooms[data.room].indexOf(data.id) == -1)
		Rooms[data.room].push(data.id);
	console.log('User ' + data.id + ' is in ' + data.room);
	if(!Users[data.id])
	{
		console.log('Finding info for ' + data.id);
		Pending_Users[data.id] = function(info) {
			gui.generateUserList(data.room, Rooms[data.room], Users);
		}
		findUserInfo(data.id);
	}
	else
		gui.generateUserList(Rooms[data.room], Users);
});

socket.on('cl_user_join', function(data) {
	console.log('User ' + data.id + ' joined.');
	Rooms = Rooms[data.room] || [];
	if(Rooms[data.room].indexOf(data.id) == -1)
		Rooms[data.room].push(data.id);
	if(data.me)
	{
		In_Rooms.push(data.room);
		gui.hideLoading();
	}
	if(!Users[data.id])
	{
		console.log('Finding info for ' + data.id);
		Pending_Users[data.id] = function(info) {
			gui.generateUserList(data.room, Rooms[data.room], Users);
			gui.message(data.room, info.name + ' ('+info.shortname+') has joined the room.');
		}
		findUserInfo(data.id);
	}
	else
	{
		gui.generateUserList(data.room, Rooms[data.room], Users);
		gui.message(data.room, Users[data.id].name + ' ('+Users[data.id].shortname+') has joined the room.');
	}
});

socket.on('cl_user_leave', function(data) {
	Rooms[data.room].splice(Rooms[data.room].indexOf(data.id), 1);
	if(!Users[data.id]) return;
	console.log(Rooms[data.room]);
	gui.message(data.room, Users[data.id].name + ' has left the room.');
	gui.generateUserList(data.room, Rooms[data.room], Users);
});

socket.on('cl_user_info', function(data) {
	console.log('Received user info for ' + data.id + ', name is ' + data.name);
	Users[data.id] = data;
	if(Pending_Users[data.id])
	{
		Pending_Users[data.id](data);
		Pending_Users[data.id] = null;
	}
	console.log(data);
});

socket.on('cl_error', function(data) {
	gui.showError(data.msg);
	gui.hideLoading();
	console.error(data.msg);
});

socket.on('cl_chat_message', function(data) {
	console.log('Received chat message \'' + data.message + '\' from ' + data.id);
	var room = data.room;
	var id = data.id;
	if(!Users[data.id])
	{
		console.log('Finding info for ' + data.id);
		Pending_Users[data.id] = function(info) {
			gui.generateUserList(data.room, Rooms[data.room], Users);
			gui.chatMessage(data.room, Users[data.id], data.message);
		}
		findUserInfo(data.id);
	}
	else
		gui.chatMessage(data.room, Users[data.id], data.message);
});

function findUserInfo(id) 
{
	console.log('Finding user info for ID ' + id);
	socket.emit('sv_user_info', { id: id });
}

function joinRoomTab()
{
	gui.showRoomList(Room_List);
}

function sendMessage(room_container)
{
	var room = $(room_container);
	var message = room.find('#chat-box').val();
	if(message == '' || message.length < 1 || message.trim() == '') return false;
	room.find('#chat-box').val('');
	console.log('Sending message ' + message);
	socket.emit('sv_chat_message', {room: room.attr('id').replace('room-',''), message: message});
	return false;
}

App.isRoom = function(room) {
	return Room_List[room] != undefined;
}

App.leaveRoom = function(room) {
	if(In_Rooms.length == 1)
		return window.location = '/logout';
	if(In_Rooms.indexOf(room) == -1)
		return;
	In_Rooms.splice(In_Rooms.indexOf(room), 1);
	socket.emit('sv_rm_leave', {room: room});
	return;
}

App.joinRoom = function(room) {
	socket.emit('sv_rm_join', {room: room});
	return Room_List[room];
}

window.closeModal  = gui.closeModal;
window.showDialog  = gui.showDialog;
window.showError   = gui.showError;
window.tabClick    = gui.tabClick;
window.joinRoomTab = joinRoomTab;
window.sendMessage = sendMessage;
window.closeSelectModal = gui.closeSelectModal;
window.joinRoomModal = gui.joinRoom;
window.addMessage  = gui.message;

gui.initialize(App);
},{"./gui":1}]},{},[2])
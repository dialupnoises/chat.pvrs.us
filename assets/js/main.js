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
	Rooms[data.room] = Rooms[data.room] || [];
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
	Rooms[data.room] = Rooms[data.room] || [];
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
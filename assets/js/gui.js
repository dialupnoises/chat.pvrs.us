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
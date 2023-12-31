// https://socket.io/docs/v4/client-api/
import { io } from 'https://cdn.socket.io/4.7.2/socket.io.esm.min.js';

// establish a WebSocket connection from the client to a Socket.IO server.
const socket = io('ws://localhost:3000');

// querySelector() returns the first Element within the document that matches the specified selector.
const nameInput = document.querySelector('#name');
const chatRoom = document.querySelector('#room');
const msgInput = document.querySelector('#message');

const chatDisplay = document.querySelector('.chat-display');
const userList = document.querySelector('.user-list');
const roomList = document.querySelector('.room-list');
const typing = document.querySelector('.typing');

function sendMessage(e) {
	e.preventDefault(); // submit the form without reload the page.
	if (nameInput.value && chatRoom.value && msgInput.value) {
		socket.emit('message', {
			name: nameInput.value,
			text: msgInput.value,
		});
		msgInput.value = '';
	}
	// set the focus back to input element without having to manually click on it.
	msgInput.focus();
}

function joinRoom(e) {
	e.preventDefault();
	if (nameInput.value && chatRoom.value) {
		socket.emit('joinRoom', {
			name: nameInput.value,
			room: chatRoom.value,
		});
	}
}

// add an event listener to a form elements.
// the event listener triggers the sendMessage() function whenever the form is submitted.
document.querySelector('.form-message').addEventListener('submit', sendMessage);
document.querySelector('.form-join').addEventListener('submit', joinRoom);

// notify the Server when the user is typing a message.
msgInput.addEventListener('keypress', () => {
	socket.emit('typing', nameInput.value);
});

// add an event listener to a socket.io connection.
socket.on('connection', () => {
	console.log('Connected to the server!');
});

// add an event listener to incoming messages.
socket.on('message', (data) => {
	typing.textContent = ''; // clear the typing notification.

	const {name, text, time} = data;
	console.log(`Received message: ${name}`);

	const messagePost = document.createElement('li');
	messagePost.className = 'post';

	if (name === nameInput.value) messagePost.className = 'post post--left';
	if (name !== nameInput.value && name !== 'admin') messagePost.className = 'post post--right';

	if (name !== 'admin') {
		messagePost.innerHTML = `
    <div class="post__header ${
			name === nameInput.value ? 'post__header--user' : 'post__header--reply'
		}">
    <span class="post__header--name">${name}</span>
    <span class="post__header--time">${time}</span>
    </div>
    <div class="post__text">${text}</div>`;
	} else {
		messagePost.innerHTML = `
    <div class="post__text">${text}</div>
    `;
	}

	document.querySelector('.chat-display').appendChild(messagePost);

	chatDisplay.scrollTop = chatDisplay.scrollHeight; // scroll to the bottom of the chat display.
});

// add an event listener to incoming typing events, with an activity timer.
let activityTimer;
socket.on('typing', (name) => {
	typing.textContent = `${name} is typing...`;

	// Clear after 3 seconds
	clearTimeout(activityTimer);
	activityTimer = setTimeout(() => {
		typing.textContent = '';
	}, 3000);
});

// show user list in the room.
socket.on('userList', ({users}) => {
	showUsers(users);
});

// show room list.
socket.on('roomList', ({rooms}) => {
	showRooms(rooms);
});

function showUsers(users) {
	userList.textContent = '';
	if (users) {
		userList.innerHTML = `<em>Users in ${chatRoom.value}:</em>`;
		users.forEach((user, i) => {
			userList.textContent += ` ${user.name}`;
			if (i < users.length - 1) userList.textContent += ',';
		});
	}
	userList.textContent += '.';
}

function showRooms(rooms) {
	roomList.textContent = '';
	if (rooms) {
		roomList.innerHTML = `<em>Active Rooms:</em>`;
		rooms.forEach((room, i) => {
			roomList.textContent += ` ${room}`;
			if (i < rooms.length - 1) roomList.textContent += ',';
		});
	}
	roomList.textContent += '.';
}


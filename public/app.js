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
document.querySelector('form-message').addEventListener('submit', sendMessage);
document.querySelector('form-join').addEventListener('submit', joinRoom);

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
	console.log(`Received message: ${data}`);
	const li = document.createElement('li');
	li.textContent = data;
	document.querySelector('ul').appendChild(li);
});

// add an event listener to incoming typing events, with an activity timer.
let activityTimer;
socket.on('typing', (name) => {
  typing.textContent = `${name} is typing...`;

  // Clear after 3 seconds
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    typing.textContent = '';
  },3000);
});

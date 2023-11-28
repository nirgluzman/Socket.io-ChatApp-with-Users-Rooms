import express from 'express';
import { Server } from 'socket.io';
import path from 'path'; // needed for serving static files.

const PORT = process.env.PORT || 3000;
const ADMIN = 'admin';

// Server initialization with Express, https://socket.io/docs/v4/server-initialization/#with-express

// create a new Express server instance.
const app = express();

// serve static files from the 'public' directory.
// 'process.cwd()' to return the current working directory of the Node.js process.
app.use(express.static(path.join(process.cwd(), 'public')));

// middleware to parse and handle URL-encoded data submitted through HTML forms.
app.use(express.urlencoded({extended: true}));

// start the Express server and listen for incoming connections on PORT.
const expressServer = app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});

// Users state
const UsersState = {
	users: [],
	setUsers: function (newUsersArray) {
		this.users = newUsersArray;
	},
};

// create a new Socket.io server instance and binds it to the Express server.
// CORS is not required, as the Express server is serving the HTML content and the static files.
const io = new Server(expressServer, {
	/* options */
});

// event handler that is triggered whenever a new client establishes a WebSocket connection with the Socket.io server.
io.on('connection', (socket) => {
	console.log(`User ${socket.id} connected!`);

	// upon connection - send a welcome message ONLY to the new user.
	socket.emit('message', buildMessage(ADMIN, 'Welcome to Chat App!'));

	// upon connection - send a list of users in the room ONLY to the new user.
	socket.on('joinRoom', ({name, room}) => {
		// leave previous room
		const prevRoom = getUser(socket.id)?.room;
		if (prevRoom) {
			socket.leave(prevRoom); // remove a user from a specific channel or room.
			io.to(prevRoom).emit(
				// send messages directly to specific users or groups of users.
				'message',
				buildMessage(ADMIN, `${getUser(socket.id)?.name} has left the room ${prevRoom}!`)
			);
		}

		const user = activateUser(socket.id, name, room);

		// we cannot update previous room users list until after the state update in active user.
		if (prevRoom) {
			io.to(prevRoom).emit('userList', {users: getUsersInRoom(prevRoom)});
		}

		// join new room
		socket.join(user.room);

		// to user who joined the room.
		socket.emit('message', buildMessage(ADMIN, `Welcome to the room ${user.room}!`));

		// to everyone else - other users.
		socket.broadcast.emit(
			'message',
			buildMessage(ADMIN, `${user.name} has joined the room ${user.room}!`)
		);

		// update user list in the room.
		io.to(user.room).emit('userList', {users: getUsersInRoom(user.room)});

		// update room list to all users.
		io.emit('roomList', {rooms: getAllActiveRooms()});
	});

	// when user disconnects - message only to users in the room.
	socket.on('disconnect', (reason) => {
		console.log(`User ${socket.id} disconnected! ${reason}`);

		const user = getUser(socket.id);
		deactivateUser(socket.id);

		if (user) {
			// send 'disconnect' message only to users in the room.
			// io.to(user.room).emit('message', buildMessage(ADMIN, `${user.name} has left the Chat App!`));

			// send 'disconnect' message to all users in the Chat App.
			io.emit('message', buildMessage(ADMIN, `${user.name} has left the Chat App!`));

			// update user list in the room.
			io.to(user.room).emit('userList', {users: getUsersInRoom(user.room)});

			// update room list to all users.
			io.emit('roomList', {rooms: getAllActiveRooms()});
		}
	});

	// listening for a message event.
	socket.on('message', ({name, text}) => {
		console.log(`Received message: ${name}`);

		const room = getUser(socket.id)?.room;
		if (room) {
			io.to(room).emit('message', buildMessage(name, text));
		}
	});

	// listening for a typing event.
	socket.on('typing', (name) => {
		console.log(`${name} is typing ...`);

		const room = getUser(socket.id)?.room;
		// send a message to all users in room, excl. sender.
		if (room) {
			socket.broadcast.to(room).emit('typing', name);
		}
	});
});

function buildMessage(name, text) {
	return {
		name,
		text,
		time: new Intl.DateTimeFormat('en-GB', {
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
			hour12: true,
			timeZone: 'Europe/Berlin',
		}).format(new Date()),
	};
}

// User functions
function activateUser(id, name, room) {
	const user = {id, name, room};
	UsersState.setUsers([...UsersState.users.filter((user) => user.id != id), user]);
	return user;
}

function deactivateUser(id) {
	UsersState.setUsers(UsersState.users.filter((user) => user.id != id));
}

function getUser(id) {
	return UsersState.users.find((user) => user.id == id);
}

function getUsersInRoom(room) {
	return UsersState.users.filter((user) => user.room == room);
}

function getAllActiveRooms() {
	return Array.from(new Set(UsersState.users.map((user) => user.room))); // 'Set' to avoid duplicants.
}


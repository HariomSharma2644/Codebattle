const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const users = {};
let waitingUser = null;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Add user to the users object
  users[socket.id] = {
    id: socket.id,
    paired: false,
    opponent: null
  };

  // Handle user joining for pairing
  socket.on('join', (username) => {
    users[socket.id].username = username || `Player-${socket.id.substring(0, 5)}`;
    console.log(`${users[socket.id].username} is looking for a match`);

    // If there's a user waiting, pair them up
    if (waitingUser && waitingUser !== socket.id && !users[socket.id].paired) {
      // Make sure the waiting user still exists and isn't paired
      if (users[waitingUser] && !users[waitingUser].paired) {
        // Pair the users
        users[socket.id].paired = true;
        users[socket.id].opponent = waitingUser;
        users[waitingUser].paired = true;
        users[waitingUser].opponent = socket.id;

        // Notify both users about the pairing
        socket.emit('paired', {
          opponentId: waitingUser,
          opponentName: users[waitingUser].username
        });

        io.to(waitingUser).emit('paired', {
          opponentId: socket.id,
          opponentName: users[socket.id].username
        });

        console.log(`Paired ${users[socket.id].username} with ${users[waitingUser].username}`);

        // Reset waiting user
        waitingUser = null;
      } else {
        // If waiting user is no longer valid, set this user as waiting
        waitingUser = socket.id;
        socket.emit('waiting');
      }
    } else {
      // No one is waiting, so this user becomes the waiting user
      waitingUser = socket.id;
      socket.emit('waiting');
    }
  });

  // Handle messages between paired users
  socket.on('send-message', (message) => {
    const user = users[socket.id];
    if (user && user.paired && user.opponent) {
      io.to(user.opponent).emit('receive-message', {
        from: user.username,
        message: message
      });
    }
  });

  // Handle code progress updates
  socket.on('code-progress', (data) => {
    const user = users[socket.id];
    if (user && user.paired && user.opponent) {
      io.to(user.opponent).emit('code-progress', {
        progress: data.progress
      });
    }
  });

  // Handle language change
  socket.on('language-change', (data) => {
    const user = users[socket.id];
    if (user && user.paired && user.opponent) {
      io.to(user.opponent).emit('language-change', {
        language: data.language,
        username: user.username
      });
    }
  });

  // Handle challenge completion
  socket.on('completed', (data) => {
    const user = users[socket.id];
    if (user && user.paired && user.opponent) {
      io.to(user.opponent).emit('opponent-completed', {
        time: data.time
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // If this user was paired, notify their opponent
    const user = users[socket.id];
    if (user && user.paired && user.opponent && users[user.opponent]) {
      io.to(user.opponent).emit('opponent-disconnected');
      users[user.opponent].paired = false;
      users[user.opponent].opponent = null;
    }

    // If this was the waiting user, clear the waiting user
    if (waitingUser === socket.id) {
      waitingUser = null;
    }

    // Remove the user from the users object
    delete users[socket.id];
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

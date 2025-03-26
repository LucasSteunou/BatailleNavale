// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('frontend')); // Assurez-vous que le chemin vers votre dossier frontend est correct
// server.js

const players = {};
let playerCount = 0;
let currentTurn = 1;

io.on("connection", (socket) => {
    console.log(`🔵 Joueur connecté : ${socket.id}`);

    if (playerCount >= 2) {
        socket.emit("room_full");
        socket.disconnect();
        return;
    }

    playerCount++;
    const playerNumber = playerCount;
    players[socket.id] = playerNumber;

    if (playerCount === 2) {
        io.emit("game_start", playerNumber);
    }

    socket.on("attack", (data) => {
        socket.broadcast.emit("attack", data);
        currentTurn = currentTurn === 1 ? 2 : 1; // Changer de tour
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        playerCount--;
        io.emit("player_disconnected", socket.id);
    });
});



const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});

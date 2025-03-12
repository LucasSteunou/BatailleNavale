const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, "../frontend")));

let players = {}; // Stocke les deux joueurs
let playerShips = {}; // Stocke les positions des bateaux pour chaque joueur

io.on("connection", (socket) => {
    console.log(`🔵 Joueur connecté : ${socket.id}`);

    if (Object.keys(players).length >= 2) {
        socket.emit("room_full");
        socket.disconnect();
        return;
    }

    const playerNumber = Object.keys(players).length === 0 ? "player1" : "player2";
    players[socket.id] = playerNumber;
    console.log(`🟢 ${playerNumber} rejoint la partie`);

    socket.emit("player_assigned", playerNumber);

    if (Object.keys(players).length === 2) {
        io.emit("game_start");
        console.log("🚀 La partie commence !");
    }

    socket.on("ships_placed", (board) => {
        playerShips[socket.id] = board;
        console.log(`🚢 ${playerNumber} a placé ses bateaux.`);

        if (Object.keys(playerShips).length === 2) {
            io.emit("both_ships_placed");
            console.log("🔥 Tous les bateaux sont placés, la partie peut commencer !");
        }
    });

    socket.on("disconnect", () => {
        console.log(`🔴 Joueur déconnecté : ${socket.id}`);
        delete players[socket.id];
        delete playerShips[socket.id];

        io.emit("waiting_for_player");
    });
});


// Lancer le serveur
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`✅ Serveur en ligne sur http://localhost:${PORT}`);
});

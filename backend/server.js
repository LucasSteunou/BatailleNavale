const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, "../frontend")));

let players = {}; // Stocke les deux joueurs

io.on("connection", (socket) => {
    console.log(`🔵 Joueur connecté : ${socket.id}`);

    // Vérifier si la partie est pleine
    if (Object.keys(players).length >= 2) {
        socket.emit("room_full");
        console.log(`❌ Salle pleine, joueur refusé : ${socket.id}`);
        socket.disconnect();
        return;
    }

    // Ajouter le joueur
    const playerNumber = Object.keys(players).length === 0 ? "player1" : "player2";
    players[socket.id] = playerNumber;
    console.log(`🟢 ${playerNumber} rejoint la partie`);

    // Informer le joueur de son rôle
    socket.emit("player_assigned", playerNumber);

    // Si deux joueurs sont connectés, démarrer la partie
    if (Object.keys(players).length === 2) {
        io.emit("game_start");
        console.log("🚀 La partie commence !");
    }

    // Déconnexion d'un joueur
    socket.on("disconnect", () => {
        console.log(`🔴 Joueur déconnecté : ${socket.id}`);
        delete players[socket.id];

        // Informer l'autre joueur qu'il est seul
        io.emit("waiting_for_player");
    });
});

// Lancer le serveur
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`✅ Serveur en ligne sur http://localhost:${PORT}`);
});

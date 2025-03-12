const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir les fichiers statiques du dossier frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Gérer les connexions des joueurs
io.on("connection", (socket) => {
    console.log(`Un joueur connecté : ${socket.id}`);

    socket.on("disconnect", () => {
        console.log(`Joueur déconnecté : ${socket.id}`);
    });
});

// Démarrer le serveur sur le port 3000
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});


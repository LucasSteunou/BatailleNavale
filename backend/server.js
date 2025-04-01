// server.js – Logique du serveur Node.js + Socket.IO

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../frontend')));

// État du jeu
let players = [];        // Joueurs connectés (max 2)
let currentTurn = null;  // Joueur dont c'est le tour (1 ou 2)
let gameActive = false;  // Partie en cours ou non

// Informations sur les navires (id : nom et taille)
const shipInfos = {
    1: { name: "Porte-avions", size: 5 },
    2: { name: "Croiseur", size: 4 },
    3: { name: "Destroyer", size: 3 },
    4: { name: "Sous-marin", size: 3 },
    5: { name: "Torpilleur", size: 2 }
};

io.on('connection', (socket) => {
    // Refuser les connexions au-delà de 2 joueurs
    if (players.length >= 2) {
        socket.emit('room_full');
        socket.disconnect();
        return;
    }
    // Assigner un numéro de joueur (1 ou 2)
    const playerNum = players.length + 1;
    players.push({
        socket: socket,
        number: playerNum,
        ready: false,
        board: [],   // Plateau 10x10 du joueur
        ships: {}    // État des navires (cases restantes par navire)
    });
    socket.emit('player_number', playerNum);
    console.log(`Joueur ${playerNum} connecté.`);

    // Si deux joueurs connectés, notifier la phase de placement
    if (players.length === 2) {
        players.forEach(p => p.socket.emit('opponent_connected'));
        console.log("Deux joueurs connectés. Phase de placement.");
    }

    // Message de chat reçu d'un client
    socket.on('chat_message', (msg) => {
        const player = players.find(p => p.socket.id === socket.id);
        if (!player) return;
        io.emit('chat_message', { player: player.number, message: msg });
    });

    // Un joueur a terminé le placement de ses bateaux et est prêt
    socket.on('ready', (board) => {
        const player = players.find(p => p.socket.id === socket.id);
        if (!player) return;
        player.board = board;
        player.ready = true;
        // Initialiser l'état des navires du joueur
        player.ships = {};
        for (let id in shipInfos) {
            player.ships[id] = {
                name: shipInfos[id].name,
                cellsLeft: shipInfos[id].size
            };
        }
        console.log(`Joueur ${player.number} prêt. Bateaux placés.`);

        // Informer l'autre joueur si lui seul est prêt
        const opponent = players.find(p => p.socket.id !== socket.id);
        if (opponent && !opponent.ready) {
            opponent.socket.emit('opponent_ready');
        }
        // Si les deux joueurs sont prêts, lancer la partie
        if (players.length === 2 && players.every(p => p.ready)) {
            currentTurn = 1;       // Le joueur 1 commence
            gameActive = true;
            io.emit('game_start');
            console.log("Les deux joueurs sont prêts. La partie commence !");
        }
    });

    // Tir d'un joueur sur une case (x, y)
    socket.on('attack', ({ x, y }) => {
        if (!gameActive) return;
        const attacker = players.find(p => p.socket.id === socket.id);
        if (!attacker || attacker.number !== currentTurn) {
            return;  // Ce n'est pas le tour de ce joueur
        }
        const defender = players.find(p => p.number !== attacker.number);
        if (!defender) return;

        let result;
        let shipName = '';         // Nom du bateau coulé (pour attaquant)
        let defenderShipName = ''; // Nom du bateau touché (pour défenseur)
        const cellValue = defender.board[y][x];  // Valeur de la case sur le plateau défenseur

        if (cellValue === 0 || cellValue === 'miss' || cellValue === 'hit') {
            // Tir à l'eau
            result = 'miss';
            defender.board[y][x] = 'miss';
        } else if (typeof cellValue === 'number') {
            // Un navire est présent sur cette case
            const shipId = cellValue;
            defender.board[y][x] = 'hit';  // Marquer la case comme touchée
            defender.ships[shipId].cellsLeft -= 1;
            defenderShipName = defender.ships[shipId].name;
            if (defender.ships[shipId].cellsLeft === 0) {
                // Le navire est coulé
                result = 'sunk';
                shipName = defenderShipName;
                console.log(`Le navire ${shipName} du joueur ${defender.number} est coulé.`);
            } else {
                result = 'hit';
            }
        }

        // Envoyer le résultat du tir aux deux joueurs
        attacker.socket.emit('attack_result', { x, y, result, shipName });
        defender.socket.emit('opponent_attack', { x, y, result, shipName: defenderShipName });

        // Vérifier la fin de partie (tous les bateaux du défenseur coulés)
        if (result === 'sunk') {
            const shipsLeft = Object.values(defender.ships).some(ship => ship.cellsLeft > 0);
            if (!shipsLeft) {
                gameActive = false;
                io.emit('game_over', { winner: attacker.number });
                console.log(`Partie terminée – Joueur ${attacker.number} a gagné.`);
                return;
            }
        }

        // Si l'attaquant a manqué, passer le tour à l'autre joueur
        if (result === 'miss') {
            currentTurn = defender.number;
        }
        console.log(`Prochain tour : Joueur ${currentTurn}`);
    });

    // Redémarrage de la partie
    socket.on('restart', () => {
        // Réinitialiser l'état de chaque joueur pour la nouvelle partie
        players.forEach(p => {
            p.ready = false;
            p.board = Array.from({ length: 10 }, () => Array(10).fill(0));
            p.ships = {};
        });
        gameActive = false;
        currentTurn = null;
        io.emit('restart_game');
        console.log("Réinitialisation du jeu, en attente d'un nouveau placement.");
    });

    // Déconnexion d'un joueur
    socket.on('disconnect', () => {
        console.log(`Joueur ${playerNum} déconnecté.`);
        players = players.filter(p => p.socket.id !== socket.id);
        // Si un seul joueur reste, attente  d'un adversaire
        if (players.length === 1) {
            players[0].ready = false;
            players[0].board = Array.from({ length: 10 }, () => Array(10).fill(0));
            players[0].ships = {};
            players[0].socket.emit('opponent_left');
            console.log("L'autre joueur a quitté. En attente d'un nouvel adversaire...");
        }
        gameActive = false;
        currentTurn = null;
    });
});

// Lancer le serveur HTTP
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

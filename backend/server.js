// server.js – Logique du serveur Node.js + Socket.IO

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../frontend')));

// Système de salles pour gérer plusieurs parties en parallèle
const rooms = {}; // ex: { room123: { players: [], gameActive: false, currentTurn: null } }


// Informations sur les navires (id : nom et taille)
const shipInfos = {
    1: { name: "Porte-avions", size: 5 },
    2: { name: "Croiseur", size: 4 },
    3: { name: "Destroyer", size: 3 },
    4: { name: "Sous-marin", size: 3 },
    5: { name: "Torpilleur", size: 2 }
};

io.on('connection', (socket) => {
    // 1. Rechercher une room avec < 2 joueurs
    let assignedRoom = null;
    for (const [roomId, room] of Object.entries(rooms)) {
        if (room.players.length < 2) {
            assignedRoom = roomId;
            break;
        }
    }

    // 2. Si aucune room dispo, créer une nouvelle
    if (!assignedRoom) {
        assignedRoom = `room-${socket.id}`; // room unique liée au socket
        rooms[assignedRoom] = {
            players: [],
            currentTurn: null,
            gameActive: false
        };
    }

    // 3. Joindre la room et initialiser le joueur
    socket.join(assignedRoom);
    const playerNum = rooms[assignedRoom].players.length + 1;

    rooms[assignedRoom].players.push({
        socket,
        number: playerNum,
        ready: false,
        board: [],
        ships: {}
    });

    // 4. Informer le client de son numéro et de sa room
    socket.emit('player_number', playerNum);
    socket.emit('room_assigned', assignedRoom);

    // 5. S'il y a 2 joueurs, notifier que la partie peut commencer
    if (rooms[assignedRoom].players.length === 2) {
        rooms[assignedRoom].players.forEach(p =>
            p.socket.emit('opponent_connected')
        );
        console.log(`Room ${assignedRoom} complète. Phase de placement.`);
    } else {
        console.log(`Room ${assignedRoom} créée. En attente d'un second joueur...`);
    }


    // Message de chat reçu d'un client
    socket.on('chat_message', ({message, roomId}) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.socket.id === socket.id);
        if (!player) return;

        io.to(roomId).emit('chat_message', {
            player: player.number,
            message
        });
    });

    // Un joueur a terminé le placement de ses bateaux et est prêt
    socket.on('ready', ({board, roomId}) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.socket.id === socket.id);
        if (!player) return;

        player.board = board;
        player.ready = true;

        // Initialiser les bateaux du joueur
        player.ships = {};
        for (let id in shipInfos) {
            player.ships[id] = {
                name: shipInfos[id].name,
                cellsLeft: shipInfos[id].size
            };
        }

        console.log(`🔹 Joueur ${player.number} prêt dans ${roomId}.`);

        // Informer l’adversaire si lui seul n’est pas prêt
        const opponent = room.players.find(p => p.socket.id !== socket.id);
        if (opponent && !opponent.ready) {
            opponent.socket.emit('opponent_ready');
        }

        // Si les deux joueurs sont prêts, lancer la partie
        if (room.players.every(p => p.ready)) {
            room.currentTurn = 1;
            room.gameActive = true;
            io.to(roomId).emit('game_start');
            console.log(`Partie lancée dans ${roomId}.`);
        }
    });


// Tir d'un joueur sur une case (x, y)
    socket.on('attack', ({x, y, roomId}) => {
        const room = rooms[roomId];
        if (!room || !room.gameActive) return;

        const attacker = room.players.find(p => p.socket.id === socket.id);
        if (!attacker || attacker.number !== room.currentTurn) return;

        const defender = room.players.find(p => p.number !== attacker.number);
        if (!defender) return;

        let result;
        let shipName = '';
        let defenderShipName = '';
        let sunkCoords = [];

        const cellValue = defender.board[y][x];

        if (cellValue === 0 || cellValue === 'miss' || cellValue === 'hit') {
            result = 'miss';
            defender.board[y][x] = 'miss';
        } else if (typeof cellValue === 'number') {
            const shipId = cellValue;
            defender.board[y][x] = 'hit';
            defender.ships[shipId].cellsLeft -= 1;
            defenderShipName = defender.ships[shipId].name;

            if (defender.ships[shipId].cellsLeft === 0) {
                result = 'sunk';
                shipName = defenderShipName;
                // Trouver les cases du navire coulé
                for (let row = 0; row < 10; row++) {
                    for (let col = 0; col < 10; col++) {
                        if (defender.board[row][col] === 'hit') {
                            const originalValue = defender.originalBoard?.[row]?.[col];
                            if (originalValue === shipId || cellValue === shipId) {
                                sunkCoords.push({x: col, y: row});
                            }
                        }
                    }
                }
                console.log(`${shipName} du joueur ${defender.number} coulé dans ${roomId}`);
            } else {
                result = 'hit';
            }
        }

        const payload = {x, y, result, shipName};
        const opponentPayload = {x, y, result, shipName: defenderShipName};
        if (result === 'sunk') {
            payload.sunkCoords = sunkCoords;
            opponentPayload.sunkCoords = sunkCoords;
        }

        // Réponse à l'attaquant et au défenseur
        attacker.socket.emit('attack_result', payload);
        defender.socket.emit('opponent_attack', opponentPayload);

        // Vérification fin de partie
        if (result === 'sunk') {
            const shipsLeft = Object.values(defender.ships).some(ship => ship.cellsLeft > 0);
            if (!shipsLeft) {
                room.gameActive = false;
                io.to(roomId).emit('game_over', {winner: attacker.number});
                console.log(`Partie terminée dans ${roomId} – Joueur ${attacker.number} a gagné`);
                return;
            }
        }

        // Si manqué, changer de joueur
        if (result === 'miss') {
            room.currentTurn = defender.number;
        }

        console.log(`Prochain tour : Joueur ${room.currentTurn} dans ${roomId}`);
    });


// Redémarrage de la partie
    socket.on('restart', ({roomId}) => {
        const room = rooms[roomId];
        if (!room) return;

        // Réinitialiser l'état de chaque joueur dans la room
        room.players.forEach(p => {
            p.ready = false;
            p.board = Array.from({length: 10}, () => Array(10).fill(0));
            p.ships = {};
        });

        room.gameActive = false;
        room.currentTurn = null;

        io.to(roomId).emit('restart_game');
        console.log(`Rejouer dans ${roomId}. En attente d’un nouveau placement.`);
    });


// Déconnexion d'un joueur
    socket.on('disconnect', () => {
        // Trouver la room du joueur
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.socket.id === socket.id);
        console.log(`Joueur ${player?.number ?? '?'} déconnecté de ${roomId}.`);

        // Retirer le joueur de la room
        room.players = room.players.filter(p => p.socket.id !== socket.id);

        if (room.players.length === 0) {
            // Supprimer la room si plus personne
            delete rooms[roomId];
            console.log(`Room ${roomId} supprimée (vide).`);
        } else {
            // Prévenir le joueur restant et réinitialiser son état
            const remainingPlayer = room.players[0];
            remainingPlayer.ready = false;
            remainingPlayer.board = Array.from({length: 10}, () => Array(10).fill(0));
            remainingPlayer.ships = {};
            room.gameActive = false;
            room.currentTurn = null;
            remainingPlayer.socket.emit('opponent_left');
            console.log(`Joueur ${remainingPlayer.number} attend un adversaire dans ${roomId}.`);
        }
    });
});

// Lancer le serveur HTTP
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

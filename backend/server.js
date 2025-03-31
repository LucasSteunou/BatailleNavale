// server.js (Node.js + Socket.IO)
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Servir les fichiers statiques (HTML, CSS, JS).
// Si server.js est dans un sous-dossier (ex: "backend"), adapter le chemin ci-dessous.
app.use(express.static(path.join(__dirname, '../frontend')));

// État du jeu
let players = [];        // Liste des joueurs connectés (max 2)
let currentTurn = null;  // Joueur dont c'est le tour (1 ou 2)
let gameActive = false;  // Indique si une partie est en cours

// Informations sur les bateaux (id : nom et taille)
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
    // Assigner un numéro de joueur (1 ou 2) et stocker ses informations
    const playerNum = players.length + 1;
    players.push({
        socket: socket,
        number: playerNum,
        ready: false,
        board: [],   // plateau 10x10 du joueur (sera rempli après placement)
        ships: {}    // états des navires (cellsLeft pour suivre les cellules restantes de chaque bateau)
    });
    socket.emit('player_number', playerNum);
    console.log(`Joueur ${playerNum} connecté.`);

    // Si deux joueurs sont connectés, notifier qu'une partie peut commencer (phase de placement)
    if (players.length === 2) {
        players.forEach(p => p.socket.emit('opponent_connected'));
        console.log("Deux joueurs connectés. Phase de placement des bateaux.");
    }

    // Réception de l'événement "ready" lorsqu'un joueur a placé tous ses bateaux et a cliqué sur "Prêt"
    socket.on('ready', (board) => {
        const player = players.find(p => p.socket.id === socket.id);
        if (!player) return;
        player.board = board;   // Enregistrer le plateau du joueur (tableau 10x10 avec identifiants de bateaux)
        player.ready = true;
        // Initialiser les informations des navires du joueur (compter les cellules restantes par bateau)
        player.ships = {};
        for (let id in shipInfos) {
            player.ships[id] = {
                name: shipInfos[id].name,
                cellsLeft: shipInfos[id].size
            };
        }
        console.log(`Joueur ${player.number} prêt. Bateaux placés:`, board);

        // Si l'autre joueur n'est pas encore prêt, l'en informer
        const opponent = players.find(p => p.socket.id !== socket.id);
        if (opponent && !opponent.ready) {
            opponent.socket.emit('opponent_ready');
        }

        // Si les deux joueurs sont prêts, démarrer la partie
        if (players.length === 2 && players.every(p => p.ready)) {
            currentTurn = 1;      // Le joueur 1 commence la partie
            gameActive = true;
            io.emit('game_start');  // Notifier les deux joueurs que la partie commence
            console.log("Les deux joueurs sont prêts. La partie commence !");
        }
    });

    // Réception d'une attaque (tir) d'un joueur sur une case (x, y)
    socket.on('attack', ({ x, y }) => {
        if (!gameActive) return;  // Ignorer si la partie n'est pas en cours
        const attacker = players.find(p => p.socket.id === socket.id);
        if (!attacker) return;
        if (attacker.number !== currentTurn) {
            // Ce n'est pas le tour de ce joueur, on ignore (sécurité côté serveur)
            return;
        }
        const defender = players.find(p => p.number !== attacker.number);
        if (!defender) return;

        let result;
        let shipName = '';           // Nom du bateau coulé (pour l'attaquant) si applicable
        let defenderShipName = '';   // Nom du bateau touché (pour le défenseur)
        const cellValue = defender.board[y][x];  // Valeur de la case ciblée sur le plateau du défenseur

        if (cellValue === 0 || cellValue === 'miss' || cellValue === 'hit') {
            // Tir dans l'eau (case vide ou déjà tirée auparavant)
            result = 'miss';
            defender.board[y][x] = 'miss';  // Marquer la case comme "à l'eau" sur le plateau du défenseur
        } else if (typeof cellValue === 'number') {
            // Un bateau est présent sur cette case
            const shipId = cellValue;
            defender.board[y][x] = 'hit';   // Marquer la case comme touchée sur le plateau du défenseur
            defender.ships[shipId].cellsLeft -= 1;  // Réduire le nombre de cellules intactes de ce navire
            defenderShipName = defender.ships[shipId].name;
            if (defender.ships[shipId].cellsLeft === 0) {
                // Le navire est entièrement coulé
                result = 'sunk';
                shipName = defenderShipName;  // Nom du navire coulé, envoyé à l'attaquant
                console.log(`Le navire ${shipName} du joueur ${defender.number} est coulé.`);
            } else {
                result = 'hit';
            }
        }

        // Envoyer le résultat du tir à l'attaquant et au défenseur
        attacker.socket.emit('attack_result', { x, y, result, shipName });
        defender.socket.emit('opponent_attack', { x, y, result, shipName: defenderShipName });

        // Vérifier la fin de partie (tous les bateaux du défenseur sont coulés)
        if (result === 'sunk') {
            const shipsLeft = Object.values(defender.ships).some(ship => ship.cellsLeft > 0);
            if (!shipsLeft) {
                // Plus aucun bateau chez le défenseur -> l'attaquant gagne
                gameActive = false;
                io.emit('game_over', { winner: attacker.number });
                console.log(`Partie terminée - Joueur ${attacker.number} a gagné.`);
                return;
            }
        }
        // Changer de tour (passer la main à l'autre joueur)
        currentTurn = defender.number;
        console.log(`Tour suivant : Joueur ${currentTurn}`);
    });

    // Gestion de la demande de "rejouer" une partie
    socket.on('restart', () => {
        if (players.length < 2) {
            // Si un seul joueur connecté, réinitialiser simplement son état
            players.forEach(p => {
                p.ready = false;
                p.board = [];
                p.ships = {};
            });
            socket.emit('game_reset');
            return;
        }
        // Réinitialiser l'état de chaque joueur pour une nouvelle partie
        players.forEach(p => {
            p.ready = false;
            p.board = [];
            p.ships = {};
        });
        gameActive = false;
        currentTurn = null;
        io.emit('restart_game');  // Demander aux clients de réinitialiser leur interface pour une nouvelle partie
        console.log("Demande de rejouer - Réinitialisation du jeu, en attente d'un nouveau placement.");
    });

    // Gestion de la déconnexion d'un joueur
    socket.on('disconnect', () => {
        console.log(`Joueur ${playerNum} déconnecté.`);
        // Retirer le joueur de la liste
        players = players.filter(p => p.socket.id !== socket.id);
        // Si un joueur reste connecté tout seul, on peut le repasser en attente d'un nouvel adversaire
        if (players.length === 1) {
            players[0].ready = false;
            players[0].board = [];
            players[0].ships = {};
            players[0].socket.emit('opponent_left');  // informer le joueur restant que son adversaire a quitté la partie
            console.log("L'autre joueur a quitté la partie. En attente d'un nouvel adversaire...");
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

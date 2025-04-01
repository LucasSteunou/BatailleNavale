// socket.js – Gestion des événements Socket.IO côté client

const socket = io();

// Éléments du chat
const chatMessages = document.getElementById('chat-messages');
const chatInput   = document.getElementById('chat-input');
const sendBtn     = document.getElementById('send-btn');

// Attribution du numéro de joueur par le serveur
socket.on('player_number', (num) => {
    playerNumber = num;
    if (playerNumber === 1) {
        updateInfoBox("En attente d'un adversaire...");
    } else {
        updateInfoBox("Placez vos bateaux.");  // Joueur 2 peut placer directement
    }
});

window.roomId = null;
socket.on('room_assigned', (id) => {
    window.roomId = id;
});

// Un deuxième joueur a rejoint la partie
socket.on('opponent_connected', () => {
    if (playerNumber === 1) {
        updateInfoBox("Un adversaire a rejoint. Placez vos bateaux.");
    }
    if (playerNumber === 2) {
        updateInfoBox("Placez vos bateaux.");
    }
});

// L'adversaire est prêt (bateaux placés)
socket.on('opponent_ready', () => {
    updateInfoBox("Adversaire prêt. Cliquez sur 'Prêt' lorsque vous l'êtes.");
});

// Début de la partie (les deux joueurs ont cliqué "Prêt")
socket.on('game_start', () => {
    gameStarted = true;
    // Change la musique
    lobbyMusic.pause();
    lobbyMusic.currentTime = 0;
    battleMusic.play();

    if (playerNumber === 1) {
        isMyTurn = true;
        updateInfoBox("La partie commence ! C'est votre tour.");
    } else {
        isMyTurn = false;
        updateInfoBox("La partie commence ! C'est au tour de l'adversaire.");
    }
    // Masquer les boutons de placement une fois la partie lancée
    readyBtn.classList.add('hidden');
    randomBtn.classList.add('hidden');
    rotateBtn.classList.add('hidden');
});

// Résultat d'une attaque effectuée par le joueur
socket.on('attack_result', ({ x, y, result, shipName, sunkCoords}) => {
    // Mettre à jour la grille adverse selon le résultat
    if (result === 'hit' || result === 'sunk') {
        enemyBoard[y][x] = 'hit';
    } else if (result === 'miss') {
        enemyBoard[y][x] = 'miss';
    }
    drawGrid(enemyCtx, enemyBoard, true);
    // Effet d'explosion côté attaquant si touché
    if (result === 'hit' || result === 'sunk') {
        triggerExplosion(enemyCtx, x, y);
        hitSound.play();
    }
    // Message de résultat pour le joueur
    if (result === 'miss') {
        missSound.play();
        triggerWater(enemyCtx, x, y);
        updateInfoBox("À l'eau ! Tour de l'adversaire...");
        isMyTurn = false;
    } else if (result === 'hit') {
        updateInfoBox("Touché ! Vous pouvez jouer à nouveau !");
    } else if (result === 'sunk') {
        updateInfoBox(`Touché coulé ! Vous avez coulé le ${shipName} adverse.`);
        if (Array.isArray(sunkCoords)) {
            sunkCoords.forEach(coord => {
                enemyBoard[coord.y][coord.x] = 'sunk';
            });
        }
        sunkSound.play();
        drawGrid(enemyCtx, enemyBoard, true);
    }
});

// Attaque reçue de l'adversaire sur notre grille
socket.on('opponent_attack', ({ x, y, result, shipName, sunkCoords}) => {
    // Mettre à jour la grille selon le résultat du tir adverse
    if (result === 'miss') {
        playerBoard[y][x] = 'miss';
    } else {
        playerBoard[y][x] = 'hit';
    }
    drawGrid(playerCtx, playerBoard, false, true);
    // Effet d'explosion côté défenseur si touché
    if (result === 'hit' || result === 'sunk') {
        triggerExplosion(playerCtx, x, y);
        hitSound.play();
    }
    // Message pour le joueur défenseur
    if (result === 'miss') {
        triggerWater(enemyCtx, x, y);
        missSound.play();
        updateInfoBox("L'adversaire a manqué. À vous de jouer !");
        isMyTurn = true;
    } else if (result === 'hit') {
        updateInfoBox(shipName 
            ? `L'adversaire a touché votre ${shipName}. C'est à nouveau à lui de jouer !`
            : "L'adversaire a touché l'un de vos bateaux. C'est à nouveau à lui de jouer !");
        isMyTurn = false;
    } else if (result === 'sunk') {
        updateInfoBox(`L'adversaire a coulé votre ${shipName} ! C'est à nouveau à lui de jouer !`);
        if (Array.isArray(sunkCoords)) {
            sunkCoords.forEach(coord => {
                playerBoard[coord.y][coord.x] = 'sunk';
            });
        }
        sunkSound.play();
        drawGrid(playerCtx, playerBoard, false, true);
        isMyTurn = false;
    }
});

// Fin de partie (tous les bateaux d'un joueur coulés)
socket.on('game_over', ({ winner }) => {
    battleMusic.pause();
    battleMusic.currentTime = 0;
    let message;
    if (winner === playerNumber) {
        message = "Vous avez gagné !";
    } else {
        message = "Vous avez perdu...";
    }
    gameOverText.innerText = message;
    gameOverOverlay.classList.remove('hidden');
    // Désactiver les tirs après la fin
    gameStarted = false;
    isMyTurn = false;
});

// Nouvelle partie (les deux joueurs redémarrent une manche)
socket.on('restart_game', () => {
    startPlacementPhase();
});

// Salle pleine (un troisième joueur a tenté de se connecter)
socket.on('room_full', () => {
    alert("La salle est pleine ! Impossible de rejoindre la partie.");
});

// L'adversaire a quitté la partie
socket.on('opponent_left', () => {
    alert("Votre adversaire a quitté la partie. En attente d'un nouveau joueur...");
    startPlacementPhase();
});

// Réception d'un message de chat
socket.on('chat_message', ({ player, message }) => {
    const alignment = (player === playerNumber) ? 'self' : 'opponent';
    const msgElem = document.createElement('div');
    msgElem.classList.add('chat-msg', alignment);
    msgElem.textContent = `${alignment === 'self' ? 'Moi' : 'Adversaire'}: ${message}`;
    chatMessages.appendChild(msgElem);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Envoi d'un message de chat
sendBtn.addEventListener('click', () => {
    if (chatInput.value.trim() === "" || !roomId) return;
    socket.emit('chat_message', {
        message: chatInput.value,
        roomId
    });
    chatInput.value = "";
});
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendBtn.click();
        roomId
    }
});

// socket.js (gestion des événements Socket.IO côté client)
const socket = io();

// Événement : attribution du numéro de joueur (1 ou 2) par le serveur
socket.on('player_number', (num) => {
    playerNumber = num;
    if (playerNumber === 1) {
        updateInfoBox("En attente d'un adversaire...");
    } else {
        updateInfoBox("Placez vos bateaux.");  // Joueur 2 peut directement placer ses bateaux
    }
});

// Événement : un deuxième joueur a rejoint la partie (les deux joueurs sont connectés)
socket.on('opponent_connected', () => {
    if (playerNumber === 1) {
        updateInfoBox("Un adversaire a rejoint. Placez vos bateaux.");
    }
    // Le joueur 2 reçoit aussi cet événement, on peut simplement s'assurer que l'info-box indique de placer les bateaux
    if (playerNumber === 2) {
        updateInfoBox("Placez vos bateaux.");
    }
});

// Événement : l'adversaire a fini de placer ses bateaux et est prêt
socket.on('opponent_ready', () => {
    updateInfoBox("Adversaire prêt. Cliquez sur 'Prêt' lorsque vous êtes prêt.");
});

// Événement : début de la partie (les deux joueurs ont cliqué "Prêt")
socket.on('game_start', () => {
    gameStarted = true;
    // Déterminer à qui est le tour initial (joueur 1 commence)
    if (playerNumber === 1) {
        isMyTurn = true;
        updateInfoBox("La partie commence ! C'est votre tour.");
    } else {
        isMyTurn = false;
        updateInfoBox("La partie commence ! C'est au tour de l'adversaire.");
    }
});

// Événement : résultat d'une attaque que j'ai effectuée (réponse du serveur à mon tir)
socket.on('attack_result', (data) => {
    const { x, y, result, shipName } = data;
    // Mettre à jour la grille adverse en fonction du résultat
    if (result === 'hit' || result === 'sunk') {
        enemyBoard[y][x] = 'hit';  // touché (on marque en rouge)
    } else if (result === 'miss') {
        enemyBoard[y][x] = 'miss'; // à l'eau (on marque en bleu)
    }
    drawGrid(enemyCtx, enemyBoard, true);
    // Préparer le message de résultat pour l'attaquant
    if (result === 'miss') {
        updateInfoBox("À l'eau ! C'est au tour de l'adversaire.");
    } else if (result === 'hit') {
        updateInfoBox("Touché ! C'est au tour de l'adversaire.");
    } else if (result === 'sunk') {
        // Un navire ennemi est coulé - shipName contient le nom du navire coulé
        updateInfoBox(`Touché coulé ! Vous avez coulé le ${shipName} adverse. C'est au tour de l'adversaire.`);
    }
    // Fin de tour pour l'attaquant (on attend l'adversaire)
    isMyTurn = false;
});

// Événement : on reçoit une attaque de l'adversaire sur notre grille
socket.on('opponent_attack', (data) => {
    const { x, y, result, shipName } = data;
    // Mettre à jour notre grille (playerBoard) en fonction du résultat du tir de l'adversaire
    if (result === 'miss') {
        playerBoard[y][x] = 'miss';  // tir dans l'eau sur notre grille
    } else {
        playerBoard[y][x] = 'hit';   // l'adversaire a touché un de nos bateaux
    }
    drawGrid(playerCtx, playerBoard);
    // Préparer le message pour le défenseur (nous)
    if (result === 'miss') {
        updateInfoBox("L'adversaire a manqué son tir. C'est votre tour !");
    } else if (result === 'hit') {
        // shipName contient le nom de notre bateau touché (facultatif si non fourni, on peut l'utiliser si présent)
        if (shipName) {
            updateInfoBox(`L'adversaire a touché votre ${shipName}. C'est à vous de jouer !`);
        } else {
            updateInfoBox("L'adversaire a touché l'un de vos bateaux. C'est à vous de jouer !");
        }
    } else if (result === 'sunk') {
        // Un de nos bateaux a été coulé
        updateInfoBox(`L'adversaire a coulé votre ${shipName} ! C'est votre tour.`);
    }
    // À nous de jouer au tour suivant
    isMyTurn = true;
});

// Événement : la partie est terminée (tous les bateaux d'un joueur coulés)
socket.on('game_over', ({ winner }) => {
    // Afficher l'écran de fin avec le nom du gagnant
    let message;
    if (winner === playerNumber) {
        message = "Vous avez gagné !";
    } else {
        message = "Vous avez perdu...";
    }
    gameOverText.innerText = message;
    gameOverOverlay.classList.remove('hidden');
    // Désactiver toute interaction de tir après la fin
    gameStarted = false;
    isMyTurn = false;
});

// Événement : demande de redémarrage de la partie (les deux joueurs préparent une nouvelle partie)
socket.on('restart_game', () => {
    // Réinitialiser l'interface pour une nouvelle partie
    startPlacementPhase();
});

// Événement : la salle est pleine (un troisième joueur a tenté de se connecter)
socket.on('room_full', () => {
    alert("La salle est pleine ! Impossible de rejoindre la partie.");
});

// Événement : l'adversaire a quitté la partie
socket.on('opponent_left', () => {
    alert("Votre adversaire a quitté la partie. En attente d'un nouveau joueur...");
    // Réinitialisation pour attendre un nouveau joueur
    startPlacementPhase();
});

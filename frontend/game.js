// game.js (logique du jeu côté client)
const cellSize = 30;
const playerCanvas = document.getElementById('playerGrid');
const enemyCanvas = document.getElementById('enemyGrid');
const playerCtx = playerCanvas.getContext('2d');
const enemyCtx = enemyCanvas.getContext('2d');
const infoBox = document.getElementById('info-box');
const randomBtn = document.getElementById('random-btn');
const rotateBtn = document.getElementById('rotate-btn');
const readyBtn = document.getElementById('ready-btn');
const gameOverOverlay = document.getElementById('game-over');
const gameOverText = document.getElementById('game-over-text');
const restartBtn = document.getElementById('restart-btn');

// Paramètres des bateaux (tailles) à placer
const shipsToPlace = [
    { id: 1, name: "Porte-avions", size: 5 },
    { id: 2, name: "Croiseur", size: 4 },
    { id: 3, name: "Destroyer", size: 3 },
    { id: 4, name: "Sous-marin", size: 3 },
    { id: 5, name: "Torpilleur", size: 2 }
];
let selectedShip = shipsToPlace[0];
let currentOrientation = 'horizontal'; // orientation actuelle ('horizontal' ou 'vertical')
let hoverX = -1;
let hoverY = -1;
let placedShips = {}; // {shipId: {x, y, orientation}}


// Plateau du joueur et de l'adversaire (10x10)
let playerBoard = Array.from({ length: 10 }, () => Array(10).fill(0));
let enemyBoard = Array.from({ length: 10 }, () => Array(10).fill(0));

// États du jeu
let playerNumber = null;
let isMyTurn = false;
let gameStarted = false;   // indique si la phase de jeu (tirs) est commencée

// Dessiner une grille (ctx: contexte du canvas, board: plateau, hideShips: cacher les bateaux ?)
function drawGrid(ctx, board, hideShips = false, isPlayer = false) {
    ctx.clearRect(0, 0, 300, 300);
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            ctx.strokeStyle = 'white';
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            const cell = board[y][x];
            if (!hideShips && typeof cell === 'number' && cell !== 0) {
                ctx.fillStyle = 'gray';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
            if (cell === 'hit') {
                ctx.fillStyle = 'red';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            } else if (cell === 'miss') {
                ctx.fillStyle = 'blue';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }

    // Affichage du bateau en survol
    if (!gameStarted && isPlayer && selectedShip && hoverX >= 0 && hoverY >= 0) {
        const size = shipSizes[currentShipIndex];
        const valid = canPlaceShip(playerBoard, hoverX, hoverY, selectedShip.size, currentOrientation);
        ctx.fillStyle = valid ? 'rgba(0,255,0,0.5)' : 'rgba(255,0,0,0.5)';
        for (let i = 0; i < size; i++) {
            const x = hoverX + (currentOrientation === 'horizontal' ? i : 0);
            const y = hoverY + (currentOrientation === 'vertical' ? i : 0);
            if (x < 10 && y < 10) {
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }
}


// Vérifier si un bateau de taille donnée peut être placé aux coordonnées (x, y) avec l'orientation donnée
function canPlaceShip(board, startX, startY, size, orientation) {
    if (orientation === 'horizontal') {
        if (startX + size > 10) return false; // dépasse à droite du plateau
        for (let i = 0; i < size; i++) {
            if (board[startY][startX + i] !== 0) return false; // case déjà occupée
        }
    } else { // vertical
        if (startY + size > 10) return false; // dépasse en bas du plateau
        for (let i = 0; i < size; i++) {
            if (board[startY + i][startX] !== 0) return false;
        }
    }
    return true;
}

// Placer un bateau sur le plateau (en marquant chaque case avec un identifiant de navire)
function placeShip(board, startX, startY, size, orientation, shipId) {
    if (orientation === 'horizontal') {
        for (let i = 0; i < size; i++) {
            board[startY][startX + i] = shipId;
        }
    } else {
        for (let i = 0; i < size; i++) {
            board[startY + i][startX] = shipId;
        }
    }
}

function removeShip(shipId) {
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            if (playerBoard[y][x] === shipId) {
                playerBoard[y][x] = 0;
            }
        }
    }
    delete placedShips[shipId];

    shipsToPlace.unshift({
        id: shipId,
        name: getShipName(shipId),
        size: getShipSize(shipId)
    });
    selectedShip = shipsToPlace[0];

    updateInfoBox(`Placez votre ${selectedShip.name} (${selectedShip.size} cases).`);
    drawGrid(playerCtx, playerBoard, false, true);
    readyBtn.disabled = true;
}



function getShipName(id) {
    const names = ["Porte-avions", "Croiseur", "Destroyer", "Sous-marin", "Torpilleur"];
    return names[id - 1];
}

function getShipSize(id) {
    return [5, 4, 3, 3, 2][id - 1];
}


// Placement aléatoire de tous les bateaux sur le plateau donné
function placeShipsRandomly(board, shipSizesArray) {
    // Vider le plateau
    for (let y = 0; y < 10; y++) {
        board[y].fill(0);
    }
    // Placer chaque bateau selon sa taille, avec un identifiant unique
    for (let i = 0; i < shipSizesArray.length; i++) {
        const size = shipSizesArray[i];
        const shipId = i + 1;  // identifiant du navire (1 à 5)
        let placed = false;
        while (!placed) {
            const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            const x = Math.floor(Math.random() * 10);
            const y = Math.floor(Math.random() * 10);
            if (canPlaceShip(board, x, y, size, orientation)) {
                placeShip(board, x, y, size, orientation, shipId);
                placed = true;
            }
        }
    }
}

// Mettre à jour le message d'information (info-box)
function updateInfoBox(message) {
    infoBox.innerText = message;
}

// Démarrer une nouvelle phase de placement (utilisé au début et lors d'un "Rejouer")
function startPlacementPhase() {
    gameStarted = false;
    isMyTurn = false;
    currentShipIndex = 0;
    currentOrientation = 'horizontal';
    shipsToPlace.length = 0;
    shipsToPlace.push(
        { id: 1, name: "Porte-avions", size: 5 },
        { id: 2, name: "Croiseur", size: 4 },
        { id: 3, name: "Destroyer", size: 3 },
        { id: 4, name: "Sous-marin", size: 3 },
        { id: 5, name: "Torpilleur", size: 2 }
    );
    selectedShip = shipsToPlace[0];

    // Réinitialiser les plateaux
    playerBoard = Array.from({ length: 10 }, () => Array(10).fill(0));
    enemyBoard = Array.from({ length: 10 }, () => Array(10).fill(0));
    // Afficher les grilles vides
    drawGrid(playerCtx, playerBoard);
    drawGrid(enemyCtx, enemyBoard, true);
    // Réinitialiser l'interface des boutons
    readyBtn.disabled = true;
    randomBtn.disabled = false;
    rotateBtn.disabled = false;
    readyBtn.classList.remove('hidden');
    randomBtn.classList.remove('hidden');
    rotateBtn.classList.remove('hidden');
    gameOverOverlay.classList.add('hidden');
    // Si le joueur 2 attendait, il reste en attente d'un adversaire
    if (playerNumber === 1) {
        updateInfoBox("En attente d'un adversaire...");
    } else {
        updateInfoBox("Placez vos bateaux.");
    }
}

// Événement de clic sur la grille du joueur (placement manuel d'un bateau)
playerCanvas.addEventListener('click', (e) => {
    if (gameStarted || playerNumber === null || !selectedShip) return;
    const rect = playerCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    const clickedValue = playerBoard[y][x];
    if (typeof clickedValue === 'number' && clickedValue !== 0) {
        removeShip(clickedValue);
        updateInfoBox(`Déplacement du ${getShipName(clickedValue)} (${getShipSize(clickedValue)} cases)`);
        drawGrid(playerCtx, playerBoard, false, true);
        readyBtn.disabled = true;
        return;
    }

    const size = selectedShip.size;
    if (canPlaceShip(playerBoard, x, y, size, currentOrientation)) {
        placeShip(playerBoard, x, y, size, currentOrientation, selectedShip.id);
        shipsToPlace.shift();
        selectedShip = shipsToPlace[0];
        drawGrid(playerCtx, playerBoard, false, true);
        if (shipsToPlace.length === 0) {
            updateInfoBox("Tous vos bateaux sont placés. Cliquez sur 'Prêt'.");
            readyBtn.disabled = false;
        } else {
            updateInfoBox(`Placez votre ${selectedShip.name} (${selectedShip.size} cases).`);
        }
    } else {
        updateInfoBox("Impossible de placer le bateau ici.");
    }
});



playerCanvas.addEventListener('mousemove', (e) => {
    const rect = playerCanvas.getBoundingClientRect();
    hoverX = Math.floor((e.clientX - rect.left) / cellSize);
    hoverY = Math.floor((e.clientY - rect.top) / cellSize);
    drawGrid(playerCtx, playerBoard, false, true);
});
playerCanvas.addEventListener('mouseleave', () => {
    hoverX = -1;
    hoverY = -1;
    drawGrid(playerCtx, playerBoard, false, true);
});


// Bouton "Placement aléatoire" - place tous les bateaux du joueur aléatoirement
randomBtn.addEventListener('click', () => {
    placeShipsRandomly(playerBoard, shipSizes);
    drawGrid(playerCtx, playerBoard);
    currentShipIndex = shipSizes.length; // tous placés
    readyBtn.disabled = false;
    updateInfoBox("Bateaux placés aléatoirement. Cliquez sur 'Prêt'.");
});

// Bouton "Rotation" - changer l'orientation du prochain bateau à placer
rotateBtn.addEventListener('click', () => {
    if (currentOrientation === 'horizontal') {
        currentOrientation = 'vertical';
        rotateBtn.innerText = "Rotation : Vertical";
    } else {
        currentOrientation = 'horizontal';
        rotateBtn.innerText = "Rotation : Horizontal";
    }
});

// Bouton "Prêt" - envoie le plateau du joueur au serveur et attend l'adversaire
readyBtn.addEventListener('click', () => {
    if (currentShipIndex < shipSizes.length) {
        // Si tous les bateaux ne sont pas placés (sécurité supplémentaire)
        return;
    }
    // Désactiver les actions de placement
    readyBtn.disabled = true;
    randomBtn.disabled = true;
    rotateBtn.disabled = true;
    // Envoyer l'événement 'ready' au serveur avec le plateau du joueur
    socket.emit('ready', playerBoard);
    updateInfoBox("En attente que l'adversaire soit prêt...");
});

// Gestion du tir sur la grille adverse
enemyCanvas.addEventListener('click', (event) => {
    if (!gameStarted || !isMyTurn) {
        // Si la partie n'a pas commencé ou que ce n'est pas le tour du joueur
        return;
    }
    const rect = enemyCanvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);
    // Vérifier qu'on n'a pas déjà tiré sur cette case
    if (enemyBoard[y][x] === 'hit' || enemyBoard[y][x] === 'miss') {
        return; // tir déjà effectué sur cette coordonnée
    }
    // Envoyer l'attaque au serveur
    socket.emit('attack', { x, y });
    // On attend le résultat du serveur avant d'actualiser la grille
    // (isMyTurn passera à false dès réception du résultat dans socket.js)
});

// Bouton "Rejouer" (écran de fin de partie) - demander au serveur de recommencer une partie
restartBtn.addEventListener('click', () => {
    socket.emit('restart');
});

// Dessiner les grilles initiales vides au chargement
drawGrid(playerCtx, playerBoard);
drawGrid(enemyCtx, enemyBoard, true);

// game.js – Logique du jeu côté client

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

// Navires à placer (identifiant, nom, taille)
const shipsToPlace = [
    { id: 1, name: "Porte-avions", size: 5 },
    { id: 2, name: "Croiseur", size: 4 },
    { id: 3, name: "Destroyer", size: 3 },
    { id: 4, name: "Sous-marin", size: 3 },
    { id: 5, name: "Torpilleur", size: 2 }
];
let selectedShip = shipsToPlace[0];
let currentOrientation = 'horizontal';
let hoverX = -1, hoverY = -1;

// Plateaux 10x10 (0 = vide, nombre = id du navire, 'hit' = touché, 'miss' = manqué)
let playerBoard = Array.from({ length: 10 }, () => Array(10).fill(0));
let enemyBoard = Array.from({ length: 10 }, () => Array(10).fill(0));

// États du jeu
let playerNumber = null;
let isMyTurn = false;
let gameStarted = false;

// Dessiner une grille de jeu dans un canvas
function drawGrid(ctx, board, hideShips = false, isPlayer = false) {
    ctx.clearRect(0, 0, 300, 300);
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            ctx.strokeStyle = 'white';
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            const cell = board[y][x];
            if (!hideShips && typeof cell === 'number' && cell !== 0) {
                // Dessiner le navire (cases grises) si non masqué
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
    // Indiquer le positionnement possible du navire sélectionné sous le curseur
    if (!gameStarted && isPlayer && selectedShip && hoverX >= 0 && hoverY >= 0) {
        const size = selectedShip.size;
        const valid = canPlaceShip(playerBoard, hoverX, hoverY, size, currentOrientation);
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

// Vérifier si un navire peut être placé à une position donnée
function canPlaceShip(board, startX, startY, size, orientation) {
    if (orientation === 'horizontal') {
        if (startX + size > 10) return false;  // Dépasse à droite du plateau
        for (let i = 0; i < size; i++) {
            if (board[startY][startX + i] !== 0) return false;  // Espace déjà occupé
        }
    } else {  // vertical
        if (startY + size > 10) return false;  // Dépasse en bas du plateau
        for (let i = 0; i < size; i++) {
            if (board[startY + i][startX] !== 0) return false;
        }
    }
    return true;
}

// Placer un navire sur le plateau (marquer chaque case avec son identifiant)
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

// Retirer un navire du plateau (pour le repositionner)
function removeShip(shipId) {
    // Enlever toutes les cases de ce navire du plateau joueur
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            if (playerBoard[y][x] === shipId) {
                playerBoard[y][x] = 0;
            }
        }
    }
    // Remettre le navire retiré dans la liste des navires à placer
    const shipInfo = shipsToPlace.find(s => s.id === shipId)
        || { id: shipId, name: getShipName(shipId), size: getShipSize(shipId) };
    shipsToPlace.unshift(shipInfo);
    selectedShip = shipsToPlace[0];
    updateInfoBox(`Déplacement du ${selectedShip.name} (${selectedShip.size} cases)`);
    drawGrid(playerCtx, playerBoard, false, true);
    readyBtn.disabled = true;
}

// Obtenir le nom d'un navire à partir de son identifiant
function getShipName(id) {
    const names = ["Porte-avions", "Croiseur", "Destroyer", "Sous-marin", "Torpilleur"];
    return names[id - 1];
}

// Obtenir la taille d'un navire à partir de son identifiant
function getShipSize(id) {
    return [5, 4, 3, 3, 2][id - 1];
}

function placeShipsRandomly(board) {
    // Vider entièrement le plateau
    for (let y = 0; y < 10; y++) {
        board[y].fill(0);
    }

    // Réinitialiser la liste des bateaux à placer
    shipsToPlace.length = 0;
    shipsToPlace.push(
        { id: 1, name: "Porte-avions", size: 5 },
        { id: 2, name: "Croiseur", size: 4 },
        { id: 3, name: "Destroyer", size: 3 },
        { id: 4, name: "Sous-marin", size: 3 },
        { id: 5, name: "Torpilleur", size: 2 }
    );
    selectedShip = shipsToPlace[0];

    // Placer chaque navire aléatoirement
    for (const ship of [...shipsToPlace]) {
        const { id, size } = ship;
        let placed = false;
        while (!placed) {
            const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            const x = Math.floor(Math.random() * 10);
            const y = Math.floor(Math.random() * 10);
            if (canPlaceShip(board, x, y, size, orientation)) {
                placeShip(board, x, y, size, orientation, id);
                placed = true;
            }
        }
    }

    // Vider la file d’attente (tous les bateaux ont été placés)
    shipsToPlace.length = 0;
    selectedShip = null;

    readyBtn.disabled = false;
    updateInfoBox("Bateaux placés aléatoirement. Cliquez sur 'Prêt'.");
}

// Mise à jour du message d'information affiché à l'écran
function updateInfoBox(message) {
    infoBox.innerText = message;
}

// Démarrer une nouvelle phase de placement (au début ou après un "Rejouer")
function startPlacementPhase() {
    gameStarted = false;
    isMyTurn = false;
    // Réinitialiser la liste des navires à placer
    shipsToPlace.length = 0;
    shipsToPlace.push(
        { id: 1, name: "Porte-avions", size: 5 },
        { id: 2, name: "Croiseur", size: 4 },
        { id: 3, name: "Destroyer", size: 3 },
        { id: 4, name: "Sous-marin", size: 3 },
        { id: 5, name: "Torpilleur", size: 2 }
    );
    selectedShip = shipsToPlace[0];
    currentOrientation = 'horizontal';
    // Réinitialiser les plateaux de jeu
    playerBoard = Array.from({ length: 10 }, () => Array(10).fill(0));
    enemyBoard = Array.from({ length: 10 }, () => Array(10).fill(0));
    // Redessiner les grilles vides
    drawGrid(playerCtx, playerBoard, false, true);
    drawGrid(enemyCtx, enemyBoard, true);
    // Réinitialiser l'interface des boutons
    readyBtn.disabled = true;
    randomBtn.disabled = false;
    rotateBtn.disabled = false;
    readyBtn.classList.remove('hidden');
    randomBtn.classList.remove('hidden');
    rotateBtn.classList.remove('hidden');
    gameOverOverlay.classList.add('hidden');
    // Indiquer au joueur 1 d'attendre un adversaire, ou au joueur 2 de placer ses bateaux
    if (playerNumber === 1) {
        updateInfoBox("En attente d'un adversaire...");
    } else if (playerNumber === 2) {
        updateInfoBox("Placez vos bateaux.");
    }
}

// Clic sur la grille du joueur (placement manuel d'un navire)
playerCanvas.addEventListener('click', (e) => {
    if (gameStarted || playerNumber === null) return;
    const rect = playerCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    const clickedValue = playerBoard[y][x];
    if (typeof clickedValue === 'number' && clickedValue !== 0) {
        // Un navire se trouve ici : on le retire pour permettre un repositionnement
        removeShip(clickedValue);
        return;
    }
    if (!selectedShip) return;  // Tous les navires sont déjà placés
    const size = selectedShip.size;
    if (canPlaceShip(playerBoard, x, y, size, currentOrientation)) {
        placeShip(playerBoard, x, y, size, currentOrientation, selectedShip.id);
        // Enlever ce navire de la liste des navires restants à placer
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

// Surligner la position possible du navire en bougeant la souris sur la grille
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

// Bouton "Placement aléatoire"
randomBtn.addEventListener('click', () => {
    placeShipsRandomly(playerBoard);
    drawGrid(playerCtx, playerBoard, false, true);
    readyBtn.disabled = false;
    updateInfoBox("Bateaux placés aléatoirement. Cliquez sur 'Prêt'.");
});

// Bouton "Rotation"
rotateBtn.addEventListener('click', () => {
    if (currentOrientation === 'horizontal') {
        currentOrientation = 'vertical';
        rotateBtn.innerText = "Rotation : Vertical__";
    } else {
        currentOrientation = 'horizontal';
        rotateBtn.innerText = "Rotation : Horizontal";
    }
});

// Bouton "Prêt"
readyBtn.addEventListener('click', () => {
    // Ne rien faire si tous les navires ne sont pas encore placés
    if (shipsToPlace.length !== 0) {
        return;
    }
    // Désactiver les actions de placement après validation
    readyBtn.disabled = true;
    randomBtn.disabled = true;
    rotateBtn.disabled = true;
    // Envoyer au serveur que le joueur est prêt (avec son plateau)
    socket.emit('ready', playerBoard);
    updateInfoBox("En attente que l'adversaire soit prêt...");
});

// Clic sur la grille adverse (tirer un missile)
enemyCanvas.addEventListener('click', (e) => {
    if (!gameStarted || !isMyTurn) return;
    const rect = enemyCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    // Ne tirer que si la case n'a pas déjà été visée
    if (enemyBoard[y][x] === 'hit' || enemyBoard[y][x] === 'miss') return;
    socket.emit('attack', { x, y });
    // Le résultat du tir est géré via socket.io
});

// Bouton "Rejouer" (nouvelle partie)
restartBtn.addEventListener('click', () => {
    socket.emit('restart');
});

// Effet visuel d'explosion sur une case touchée
function triggerExplosion(ctx, x, y) {
    const explosionImg = new Image();
    explosionImg.src = 'explosion.png';
    explosionImg.onload = () => {
        ctx.drawImage(explosionImg, x * cellSize, y * cellSize, cellSize, cellSize);
        // Effacer l'explosion après 1 seconde en redessinant la grille concernée
        setTimeout(() => {
            drawGrid(ctx, ctx === playerCtx ? playerBoard : enemyBoard, ctx === enemyCtx);
        }, 1000);
    };
}

// Dessiner les grilles vides au chargement initial
drawGrid(playerCtx, playerBoard, false, true);
drawGrid(enemyCtx, enemyBoard, true);

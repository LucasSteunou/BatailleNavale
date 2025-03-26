// game.js

const cellSize = 30;
const playerCanvas = document.getElementById('playerGrid');
const enemyCanvas = document.getElementById('enemyGrid');
const playerCtx = playerCanvas.getContext('2d');
const enemyCtx = enemyCanvas.getContext('2d');

let playerBoard = Array.from({ length: 10 }, () => Array(10).fill(0));
let enemyBoard = Array.from({ length: 10 }, () => Array(10).fill(0));
let playerNumber;

function drawGrid(ctx, board, hideShips = false) {
    ctx.clearRect(0, 0, 300, 300);
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            if (board[y][x] === 1 && !hideShips) {
                ctx.fillStyle = 'gray';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            } else if (board[y][x] === 'hit') {
                ctx.fillStyle = 'red';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            } else if (board[y][x] === 'miss') {
                ctx.fillStyle = 'blue';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }
}

function placeShipsRandomly(board, shipSizes) {
    for (let size of shipSizes) {
        let placed = false;
        while (!placed) {
            const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            let x, y;
            if (direction === 'horizontal') {
                x = Math.floor(Math.random() * (10 - size));
                y = Math.floor(Math.random() * 10);
            } else {
                x = Math.floor(Math.random() * 10);
                y = Math.floor(Math.random() * (10 - size));
            }

            if (canPlaceShip(board, x, y, size, direction)) {
                placeShip(board, x, y, size, direction);
                placed = true;
            }
        }
    }
}

function canPlaceShip(board, x, y, size, direction) {
    if (direction === 'horizontal') {
        for (let i = 0; i < size; i++) {
            if (board[y][x + i] !== 0) return false;
        }
    } else {
        for (let i = 0; i < size; i++) {
            if (board[y + i][x] !== 0) return false;
        }
    }
    return true;
}

function placeShip(board, x, y, size, direction) {
    if (direction === 'horizontal') {
        for (let i = 0; i < size; i++) {
            board[y][x + i] = 1;
        }
    } else {
        for (let i = 0; i < size; i++) {
            board[y + i][x] = 1;
        }
    }
}

function initGame(playerNum) {
    playerNumber = playerNum;
    const shipSizes = [5, 4, 3, 3, 2];
    placeShipsRandomly(playerBoard, shipSizes);
    drawGrid(playerCtx, playerBoard);
    drawGrid(enemyCtx, enemyBoard, true); // Masquer les bateaux sur la grille adverse
}

enemyCanvas.addEventListener("click", (event) => {
    const rect = enemyCanvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);

    if (enemyBoard[y][x] === 0) {
        enemyBoard[y][x] = 'miss';
        socket.emit("attack", { x, y, result: 'miss' });
    } else if (enemyBoard[y][x] === 1) {
        enemyBoard[y][x] = 'hit';
        socket.emit("attack", { x, y, result: 'hit' });
    }

    drawGrid(enemyCtx, enemyBoard, true);
});

socket.on("attack", (data) => {
    const { x, y, result } = data;
    if (result === 'hit') {
        playerBoard[y][x] = 'hit';
    } else {
        playerBoard[y][x] = 'miss';
    }
    drawGrid(playerCtx, playerBoard);
});

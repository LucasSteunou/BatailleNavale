const playerCanvas = document.getElementById("playerGrid");
const enemyCanvas = document.getElementById("enemyGrid");

if (!playerCanvas || !enemyCanvas) {
    console.error("❌ Les éléments <canvas> ne sont pas trouvés !");
}

const playerCtx = playerCanvas.getContext("2d");
const enemyCtx = enemyCanvas.getContext("2d");

const gridSize = 10;
const cellSize = 40;

playerCanvas.width = enemyCanvas.width = gridSize * cellSize;
playerCanvas.height = enemyCanvas.height = gridSize * cellSize;

let playerBoard = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0)); // 0 = vide, 1 = bateau
let placingShips = true; // Mode de placement des bateaux
let shipsToPlace = 5; // Nombre de bateaux à placer

function drawGrid(ctx, board) {
    ctx.clearRect(0, 0, playerCanvas.width, playerCanvas.height);
    ctx.strokeStyle = "black";

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            ctx.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize);
            if (board[j][i] === 1) {  // 🔥 Correction : inversé i et j
                ctx.fillStyle = "gray";
                ctx.fillRect(j * cellSize + 2, i * cellSize + 2, cellSize - 4, cellSize - 4);
            }
        }
    }
}

// 🔥 Correction : Placement des bateaux avec clic
playerCanvas.addEventListener("click", (event) => {
    if (!placingShips) return;

    const rect = playerCanvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);

    console.log(`Clic détecté en (${x}, ${y})`);

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && playerBoard[y][x] === 0) {
        playerBoard[y][x] = 1;
        shipsToPlace--;
        drawGrid(playerCtx, playerBoard);
        console.log(`🚢 Bateau placé en (${x}, ${y}) - Restants : ${shipsToPlace}`);

        if (shipsToPlace === 0) {
            placingShips = false;
            alert("Tous vos bateaux sont placés !");
            socket.emit("ships_placed", playerBoard);
        }
    } else {
        console.log("❌ Impossible de placer un bateau ici !");
    }
});

// Dessiner les grilles au chargement
drawGrid(playerCtx, playerBoard);
drawGrid(enemyCtx, Array(gridSize).fill(null).map(() => Array(gridSize).fill(0)));

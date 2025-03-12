// Récupérer les canvases et leur contexte
const playerCanvas = document.getElementById("playerGrid");
const enemyCanvas = document.getElementById("enemyGrid");

if (!playerCanvas || !enemyCanvas) {
    console.error("Les éléments <canvas> ne sont pas trouvés !");
}

const playerCtx = playerCanvas.getContext("2d");
const enemyCtx = enemyCanvas.getContext("2d");

// Définir la taille de la grille
const gridSize = 10;
const cellSize = 40; // Taille d'une case en pixels

// Définir les dimensions des grilles
playerCanvas.width = enemyCanvas.width = gridSize * cellSize;
playerCanvas.height = enemyCanvas.height = gridSize * cellSize;

// Fonction pour dessiner une grille
function drawGrid(ctx) {
    console.log("Dessin de la grille...");
    ctx.strokeStyle = "black";
    ctx.beginPath();
    for (let i = 0; i <= gridSize; i++) {
        // Lignes verticales
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, gridSize * cellSize);

        // Lignes horizontales
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(gridSize * cellSize, i * cellSize);
    }
    ctx.stroke();
    console.log("Grille dessinée !");
}

// Dessiner les deux grilles
drawGrid(playerCtx);
drawGrid(enemyCtx);

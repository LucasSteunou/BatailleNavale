// Récupérer le canvas et son contexte
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Définir la taille de la grille
const gridSize = 10;
const cellSize = 40; // Taille d'une case en pixels

canvas.width = gridSize * cellSize;
canvas.height = gridSize * cellSize;

// Fonction pour dessiner la grille
function drawGrid() {
    ctx.strokeStyle = "black";
    for (let i = 0; i <= gridSize; i++) {
        // Lignes verticales
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvas.height);

        // Lignes horizontales
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvas.width, i * cellSize);
    }
    ctx.stroke();
}

// Dessiner la grille au chargement
drawGrid();
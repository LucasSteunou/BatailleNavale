// socket.js

const socket = io();

socket.on("game_start", (playerNum) => {
    console.log("🚀 La partie commence ! Vous êtes le joueur " + playerNum);
    initGame(playerNum); // Initialise le jeu avec le numéro du joueur
});

socket.on("attack", (data) => {
    handleAttack(data);
});

function handleAttack(data) {
    const { x, y, result } = data;
    if (result === 'hit') {
        playerBoard[y][x] = 'hit';
    } else {
        playerBoard[y][x] = 'miss';
    }
    drawGrid(playerCtx, playerBoard);
}

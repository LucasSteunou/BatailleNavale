// socket.js

const socket = io();

socket.on("game_start", (playerNum) => {
    console.log("🚀 La partie commence ! Vous êtes le joueur " + playerNum);
    initGame(playerNum);
});

socket.on("attack", (data) => {
    handleAttack(data);
});

socket.on("room_full", () => {
    alert("La salle est pleine ! Impossible de rejoindre la partie.");
});

function handleAttack(data) {
    const { x, y, result } = data;
    if (result === 'hit') {
        playerBoard[y][x] = 'hit';
    } else {
        playerBoard[y][x] = 'miss';
    }
    drawGrid(playerCtx, playerBoard);
    isMyTurn = true; // C'est votre tour après l'attaque de l'adversaire
}

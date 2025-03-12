const socket = io();

// Quand le serveur assigne un rôle au joueur
socket.on("player_assigned", (player) => {
    console.log(`🟢 Vous êtes : ${player}`);
});

// Si la partie est pleine
socket.on("room_full", () => {
    alert("La partie est pleine ! Essayez plus tard.");
    window.location.reload();
});

// Quand la partie peut commencer
socket.on("game_start", () => {
    console.log("🚀 La partie commence !");
});

// Si un joueur quitte, afficher un message
socket.on("waiting_for_player", () => {
    alert("Un joueur a quitté. En attente d'un adversaire...");
    window.location.reload();
});

socket.on("both_ships_placed", () => {
    alert("Tous les bateaux sont placés ! La bataille commence !");
});


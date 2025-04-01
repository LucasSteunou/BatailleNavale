🛳️ Bataille Navale – Multijoueur Local (Socket.IO)
Un jeu web de bataille navale classique, jouable en multijoueur local sur deux navigateurs.
Développé avec Node.js, Socket.IO, HTML/CSS/JS.

📁 Arborescence du projet
bash
Copier
Modifier
bataille-navale/
├── frontend/
│   ├── index.html              # Interface principale
│   ├── style.css               # Styles du jeu
│   ├── game.js                 # Logique du jeu côté client
│   ├── socket.js               # Gestion des sockets côté client
│   ├── explosion.png       # Effet visuel lors d’un tir réussi
│
├── backend/
│   └── server.js               # Serveur Node.js + Socket.IO
│
├── package.json               # Dépendances (express, socket.io)
└── README.md                  # Ce fichier
🚀 Lancement en local
1. Cloner ou récupérer le projet
   bash
   Copier
   Modifier
   git clone <url-du-dépôt>
   cd bataille-navale
2. Installer les dépendances
   Depuis la racine (où se trouve package.json), exécute :

nginx
Copier
Modifier
npm install
⚠️ Si package.json est dans le dossier backend/, navigue d’abord dedans : cd backend && npm install

3. Lancer le serveur
   bash
   Copier
   Modifier
   node backend/server.js
   Par défaut, le serveur écoute sur le port 3000.

4. Ouvrir deux navigateurs
   Accède à l’adresse suivante dans deux fenêtres/onglets séparés :

arduino
Copier
Modifier
http://localhost:3000
👥 Le jeu détecte automatiquement les joueurs 1 et 2 via Socket.IO.

🎮 Fonctionnalités
Placement des bateaux :

5 bateaux à placer (porte-avion, croiseur, destroyer, sous-marin, torpilleur)

Positionnement manuel avec rotation (horizontal / vertical)

Placement aléatoire possible

Visualisation en survol (vert = ok, rouge = invalide)

Modification d’un bateau tant que "Prêt" n’est pas cliqué

Déroulement du jeu :

Chaque joueur joue à son tour

Si un tir touche un bateau, le joueur peut rejouer

Feedback immédiat : touché, coulé, à l’eau

Explosion visuelle lors d’un tir réussi

Fin de partie :

Quand tous les bateaux d’un joueur sont coulés

Écran de victoire/défaite + bouton rejouer

Chat intégré :

Discussion en temps réel entre les deux joueurs

Interface :

Ergonomique, responsive, lisible

Coordonnées visibles (A–J et 1–10)

Explosion visuelle (image)
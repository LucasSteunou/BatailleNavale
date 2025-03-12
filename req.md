# Guide du projet

## Buts

* Jeu de base
* Chat entre utilisateurs
* Salons
* Gestion des déconnexions

## Moyens utilisés :
* Canvas
* Matrice pour les cases

## Structure du projet (arborescence) :

    bataille-navale/
    │── frontend/
    │   ├── index.html         # Page principale
    │   ├── style.css          # Styles
    │   ├── game.js            # Gestion du jeu sur le navigateur
    │   ├── socket.js          # Communication avec le serveur via Socket.io
    │── backend/
    │   ├── server.js          # Serveur Node.js avec Express + Socket.io
    │── assets/                # Images, sons, icônes...
    │── package.json           # Dépendances Node.js
    │── README.md              # Explication du projet

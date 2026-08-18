# SIGS COPEC — Système de Gestion Scolaire

Mémoire de Licence (L3 Informatique) — Stage à l'école privée COPEC, Isaha, Fianarantsoa, Madagascar.

## Structure du dépôt

```
copec-sigs/
├── backend/     API REST (Node.js, Express, Prisma, PostgreSQL)
├── frontend/    Interface web (React, Vite, TailwindCSS)
└── docs/        Cahier des charges, UML, questions à l'école, notes de stage
```

## Stack technique

- **Frontend** : React 18 + Vite + TailwindCSS + React Router
- **Backend** : Node.js + Express + Prisma ORM
- **Base de données** : PostgreSQL
- **Authentification** : JWT

## Démarrage — développement local

### Prérequis
- Node.js ≥ 18
- PostgreSQL installé localement (ou via Docker)

### 1. Backend

```bash
cd backend
cp .env.example .env      # puis renseigner DATABASE_URL et JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run dev
```

L'API tourne sur `http://localhost:4000`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

L'interface tourne sur `http://localhost:5173`.

## État d'avancement

- [x] Structure du projet (backend + frontend)
- [x] Schéma de base de données initial (Prisma)
- [x] Authentification (login + JWT + rôles)
- [x] Module Élèves (squelette CRUD)
- [ ] Module Notes & bulletins
- [ ] Module Paiements
- [ ] Module Présences
- [ ] Module Emploi du temps
- [ ] Déploiement à l'école

Voir `docs/dossier-conception-copec.md` pour le cahier des charges complet, l'architecture, et les diagrammes UML.

## Contexte de déploiement

Ce système est conçu pour fonctionner **sans connexion internet** : toute l'application (backend + base de données) tourne en local sur un PC à l'école, les autres postes s'y connectant via le réseau local.

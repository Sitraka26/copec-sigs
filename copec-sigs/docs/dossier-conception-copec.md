# Système de Gestion Scolaire — COPEC Fianarantsoa
### Cahier des charges & Dossier de conception — Mémoire de Licence (L3 Informatique)

---

## 1. Contexte et objectifs

COPEC est un établissement privé (du préscolaire à la terminale) à Isaha, Fianarantsoa, dont la gestion administrative et pédagogique est actuellement manuelle/papier ou sur Excel. L'objectif du stage est de concevoir et développer un **Système d'Information de Gestion Scolaire (SIGS)** couvrant l'ensemble du cycle de vie d'un élève, du préscolaire à la terminale, adapté à un contexte **sans accès internet fiable**.

**Objectif académique (mémoire L3) :** démontrer la maîtrise du cycle complet de développement logiciel — analyse des besoins, modélisation UML, conception de base de données, architecture technique, développement, tests, déploiement — sur un cas réel et vérifiable.

---

## 2. Périmètre fonctionnel

Vu l'ampleur du projet, je recommande un découpage en **deux versions** : cela te permet d'avoir un produit fonctionnel et démontrable même si le temps de stage est limité, tout en montrant une vision complète dans ton mémoire (partie "perspectives").

### Version 1 — MVP (à développer et déployer réellement pendant le stage)
| # | Module | Priorité |
|---|--------|----------|
| 1 | Gestion des élèves & inscriptions | Critique |
| 2 | Gestion des classes, niveaux, années scolaires | Critique |
| 3 | Gestion des notes & génération de bulletins | Critique |
| 4 | Gestion des présences (élèves) | Haute |
| 5 | Gestion des paiements / frais de scolarité | Haute |
| 6 | Emploi du temps | Moyenne |

### Version 2 — Extensions (décrites en conception, développement optionnel/perspective)
- Gestion des enseignants (présence, matières assignées, salaires)
- Communication parents (SMS via passerelle GSM locale, puisque pas d'internet)
- Portail consultation notes/absences pour les parents (à activer si l'école obtient internet un jour)
- Statistiques et tableaux de bord de direction

### Spécificités "préscolaire → terminale" à prévoir dans le modèle
- **Cycles différents** : Préscolaire, Primaire (T1-T5), Collège (6e-3e), Lycée (2nde-Terminale) — chaque cycle a ses propres règles (ex. le préscolaire n'a pas de notes chiffrées mais des appréciations/compétences).
- **Système de notation malgache** : notes sur 20, coefficients par matière, moyennes trimestrielles, mention/appréciation.
- **Informations santé & contact d'urgence** de l'élève (souvent exigé par les écoles à Madagascar).
- **Photo de l'élève** pour la fiche et le bulletin.
- **Redoublement / passage de classe** en fin d'année.

---

## 3. Acteurs et rôles (RBAC)

| Rôle | Droits principaux |
|------|-------------------|
| **Administrateur** | Gestion totale (utilisateurs, paramétrage année scolaire, sauvegardes) |
| **Directeur/Directrice** | Vue globale, validation des bulletins, statistiques |
| **Secrétaire** | Inscriptions, paiements, gestion des dossiers élèves |
| **Enseignant** | Saisie des notes de ses matières/classes, appel (présence) |
| **Surveillant/Censeur** | Gestion des présences, discipline |
| *(V2)* **Parent** | Consultation des notes/absences de son enfant |

---

## 4. Architecture technique

```
┌─────────────────────────────────────────────────┐
│  PC "Serveur" (bureau de la direction/secrétariat)│
│                                                     │
│   ┌───────────────┐      ┌────────────────────┐ │
│   │  Backend API   │──────│   PostgreSQL DB     │ │
│   │  Node.js +     │      │   (données locales) │ │
│   │  Express.js    │      └────────────────────┘ │
│   └───────┬───────┘                                │
│           │  sert aussi le frontend buildé          │
│   ┌───────▼───────┐                                │
│   │  Frontend      │                                │
│   │  React (Vite)  │                                │
│   └───────────────┘                                │
└──────────────────┬──────────────────────────────┘
                    │  Réseau local (WiFi/câble, SANS internet)
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   PC Secrétariat  PC Direction  PC Salle des profs
   (navigateur)    (navigateur)  (navigateur)
```

**Stack recommandée :**
- **Frontend** : React 18 + Vite, TailwindCSS (interface rapide à développer et propre), React Router, Axios/TanStack Query pour les appels API.
- **Backend** : Node.js + Express.js, architecture en couches (routes → contrôleurs → services → modèles).
- **ORM** : Prisma ou Sequelize (fortement recommandé : Prisma, plus moderne, génère aussi un schéma clair — bon pour l'annexe du mémoire).
- **Base de données** : PostgreSQL (installée en local sur le PC serveur).
- **Authentification** : JWT + bcrypt pour les mots de passe.
- **Génération de bulletins/PDF** : bibliothèque comme `pdfkit` ou `puppeteer`.

**Pourquoi cette architecture répond à la contrainte "pas d'internet" :**
Toute l'application (base de données + backend + frontend) tourne **en local** sur un ordinateur de l'école. Aucune connexion internet n'est nécessaire pour l'usage quotidien. Seuls les autres postes ont besoin d'être sur le même réseau local (un simple routeur WiFi sans abonnement internet suffit).

**Sauvegarde (point critique à Madagascar à cause des coupures de courant) :**
- Script automatique de `pg_dump` planifié (ex. chaque nuit) vers un fichier local + copie sur clé USB.
- Recommander à l'école un onduleur (UPS) pour le PC serveur.

---

## 5. Modélisation UML

### 5.1 Diagramme de cas d'utilisation — acteurs et cas principaux
- **Secrétaire** : Inscrire un élève, Modifier un dossier élève, Enregistrer un paiement, Éditer une classe
- **Enseignant** : Saisir les notes, Faire l'appel (présence)
- **Directeur** : Valider les bulletins, Consulter les statistiques
- **Administrateur** : Gérer les utilisateurs, Paramétrer l'année scolaire, Lancer une sauvegarde

*(Je peux te générer ce diagramme visuellement juste après ce document.)*

### 5.2 Diagramme de classes — entités principales

- **Utilisateur** (id, nom, email, motDePasse, rôle)
- **AnneeScolaire** (id, libellé, dateDébut, dateFin, active)
- **Niveau** (id, libellé, cycle [préscolaire/primaire/collège/lycée])
- **Classe** (id, nom, niveau_id, année_id, enseignantPrincipal_id)
- **Eleve** (id, matricule, nom, prénom, dateNaissance, sexe, adresse, photo, contactUrgence, infoSanté)
- **Inscription** (id, eleve_id, classe_id, année_id, dateInscription, statut)
- **Matiere** (id, nom, coefficient)
- **Enseignant** (id, nom, prénom, matières[])
- **Note** (id, eleve_id, matiere_id, trimestre, valeur, coefficient, date)
- **Bulletin** (id, eleve_id, trimestre, année_id, moyenneGénérale, rang, appréciation)
- **Presence** (id, eleve_id, date, statut [présent/absent/retard], justifié)
- **Paiement** (id, eleve_id, montant, datePaiement, typeFrais, moyenPaiement, statut)
- **EmploiDuTemps** (id, classe_id, jour, heureDébut, heureFin, matiere_id, enseignant_id)

**Relations clés :** Eleve 1—N Inscription N—1 Classe ; Classe 1—N EmploiDuTemps ; Eleve 1—N Note N—1 Matiere ; Eleve 1—N Paiement.

### 5.3 Diagramme de séquence — exemple "Saisie de notes par un enseignant"
1. L'enseignant se connecte (authentification JWT)
2. Sélectionne sa classe et sa matière
3. Le système affiche la liste des élèves de la classe
4. L'enseignant saisit une note par élève
5. Le système valide (note entre 0 et 20) et enregistre
6. Le système recalcule automatiquement la moyenne de l'élève

### 5.4 Diagramme d'activité — exemple "Génération de bulletin"
Saisie des notes par tous les enseignants → Vérification que toutes les matières sont complètes → Calcul des moyennes pondérées → Calcul du rang dans la classe → Génération du PDF → Validation par le Directeur → Impression/distribution.

### 5.5 Diagramme de déploiement
PC Serveur (Node.js + PostgreSQL) ↔ réseau local (WiFi/Ethernet) ↔ postes clients (navigateur web uniquement, aucune installation requise).

---

## 6. Sécurité
- Mots de passe hashés (bcrypt), jamais en clair.
- Contrôle d'accès par rôle sur chaque route API (middleware).
- Journalisation (logs) des actions sensibles (paiements, modification de notes).
- Sauvegardes régulières + procédure de restauration documentée (important pour la soutenance : montre la maturité du projet).

---

## 7. Planning indicatif (à ajuster selon la durée réelle du stage)

| Phase | Durée indicative | Livrable |
|-------|-------------------|----------|
| Analyse des besoins + validation avec l'école | 1-2 semaines | Cahier des charges validé |
| Modélisation UML + conception BDD | 1-2 semaines | Diagrammes + schéma PostgreSQL |
| Développement backend (API) | 3-4 semaines | API testée (Postman) |
| Développement frontend (React) | 3-4 semaines | Interfaces fonctionnelles |
| Intégration + tests avec utilisateurs réels | 1-2 semaines | Version testée en conditions réelles |
| Déploiement + formation du personnel | 1 semaine | Système en production à l'école |
| Rédaction du mémoire | en parallèle dès le début | Mémoire complet |

---

## 8. Informations à obtenir absolument auprès de l'école (avant de figer la conception)

1. Combien d'élèves environ, combien de classes, quels niveaux exacts sont couverts (juste primaire+collège ou jusqu'au lycée) ?
2. Combien d'ordinateurs sont disponibles à l'école (1 seul PC ? plusieurs en réseau ?)
3. Le système de notation exact utilisé (barème, nombre de trimestres ou semestres, matières et coefficients par niveau)
4. Comment les frais de scolarité sont structurés (mensuel, trimestriel, frais d'inscription séparés, réductions fratrie, etc.)
5. Un exemple de bulletin papier actuel (pour reproduire le format exact attendu)
6. Qui utilisera le système au quotidien (juste la secrétaire ? aussi les enseignants directement ?)
7. Y a-t-il un onduleur/protection contre les coupures de courant pour le futur PC serveur ?

### Complément — autres questions importantes

**Sur les utilisateurs et l'organisation**
8. Combien de personnes géreront le système au quotidien, et quel est leur niveau d'aisance avec l'informatique (besoin de formation simple ou poussée) ?
9. Y a-t-il déjà des données existantes à migrer (fichiers Excel, registres papier, anciens logiciels) ? Si oui, sous quel format ?
10. L'école a-t-elle un logo officiel et un format d'en-tête à utiliser pour les bulletins et documents générés ?

**Sur le calendrier et la pédagogie**
11. Le découpage de l'année est en trimestres ou en semestres ? Dates approximatives de chaque période ?
12. Y a-t-il des jours fériés/vacances spécifiques à intégrer dans le calendrier scolaire (hors calendrier national) ?
13. Comment se passe le calcul de la moyenne annuelle (moyenne simple des trimestres, ou pondérée) et les critères de passage/redoublement ?
14. L'école doit-elle transmettre des données aux autorités (Ministère de l'Éducation Nationale — MEN), et sous quel format (registre matricule, statistiques) ?

**Sur les frais et paiements**
15. Y a-t-il des frais annexes à suivre séparément (cantine, transport, uniforme, assurance, fournitures) en plus de l'écolage ?
16. Existe-t-il des réductions (fratrie, bourse, cas sociaux) à gérer dans le système ?
17. Comment les paiements sont-ils enregistrés aujourd'hui (reçu papier, cahier de caisse) — faut-il générer un reçu imprimable ?

**Sur le matériel et l'impression**
18. Y a-t-il une imprimante disponible à l'école pour les bulletins et reçus ?
19. Quelle est la marque/l'état du ou des PC disponibles (pour dimensionner correctement l'installation de PostgreSQL et Node.js) ?

**Sur la vision à long terme**
20. L'école prévoit-elle d'avoir internet dans le futur (pour activer plus tard le module de communication parents ou un accès à distance pour la direction) ?
21. Y a-t-il d'autres sites/annexes de l'école à prendre en compte, ou tout se passe sur un seul site ?

---

## 9. Structure recommandée du mémoire (plan type)

1. Introduction générale
2. Présentation de l'organisme d'accueil (COPEC)
3. Étude de l'existant et critique
4. Spécification des besoins (ce document, reformulé)
5. Conception (UML complet)
6. Réalisation (choix techniques, captures d'écran)
7. Tests et déploiement
8. Conclusion et perspectives (Version 2)

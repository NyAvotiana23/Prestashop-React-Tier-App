# Prestashop React App

Single-page React app (Vite + Tailwind) that reads and manages Prestashop data through the Prestashop Webservice API.

## FR

### Fonctionnalites

- Back-office: dashboard, reset base, import CSV/ZIP.
- Front-office: parcours produits, panier, commandes.
- Client PrestaShop Webservice: XML sur le wire, JSON nettoye dans l'app.
- Import CSV: produits, combinaisons, commandes (UI) + clients (support code).
- Import d'images via ZIP (reference produit comme nom de fichier).

### Pre-requis

- Node.js 18+ (ou LTS recent).
- Une instance PrestaShop avec Webservice active.

### Installation

```bash
npm install
```

### Variables d'environnement

Creer un fichier `.env` a la racine:

```bash
VITE_PRESTASHOP_API_URL=http://localhost/prestashop/api/
VITE_PRESTASHOP_API_KEY=YOUR_KEY_HERE
```

Note: la cle API est exposee dans le navigateur; limiter ses permissions.

### Lancer

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

### Scripts

- `npm run dev`: demarre Vite.
- `npm run build`: build de production.
- `npm run preview`: previsualisation du build.
- `npm run lint`: lint ESLint.
- `npm run csv:demo`: parse le premier produit CSV et affiche le payload.

### Documentation

- Client API PrestaShop: `docs/prestashop-api.md`
- Parametres de liste: `docs/prestashop-list-parameters.md`
- Import CSV/ZIP: `docs/csv-import.md`
- Handler global API: `docs/api-response-handler.md`
- Structure du projet: `docs/project-structure.md`

### Donnees

- Exemples API: `api_docs/`
- Exemples CSV: `csv_import/`

## EN

### Features

- Back office: dashboard, database reset, CSV/ZIP import.
- Front office: product browsing, cart, orders.
- PrestaShop Webservice client: XML on the wire, cleaned JSON in app code.
- CSV import: products, combinations, orders (UI) + customers (code support).
- Image import via ZIP (product reference as filename).

### Prerequisites

- Node.js 18+ (or recent LTS).
- A running PrestaShop instance with Webservice enabled.

### Install

```bash
npm install
```

### Environment variables

Create a `.env` file at the project root:

```bash
VITE_PRESTASHOP_API_URL=http://localhost/prestashop/api/
VITE_PRESTASHOP_API_KEY=YOUR_KEY_HERE
```

Note: the API key is exposed in the browser; use restricted permissions.

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

### Scripts

- `npm run dev`: start the Vite dev server.
- `npm run build`: production build.
- `npm run preview`: preview the production build.
- `npm run lint`: run ESLint.
- `npm run csv:demo`: parse the first CSV product and print the payload.

### Documentation

- PrestaShop API client: `docs/prestashop-api.md`
- List parameters reference: `docs/prestashop-list-parameters.md`
- CSV/ZIP import: `docs/csv-import.md`
- Global API handler: `docs/api-response-handler.md`
- Project structure: `docs/project-structure.md`

### Data

- Sample API payloads: `api_docs/`
- CSV import examples: `csv_import/`

# Prestashop React App

Single-page React app (Vite + Tailwind) that reads and manages Prestashop data through the Prestashop Webservice API.

## Features

- Catalogue browsing and product details UI
- Prestashop Webservice API client with XML over the wire and JSON in the app
- Admin utilities (including database reset helpers)
- CSV seed data and API reference docs

## Getting started

### Prerequisites

- Node.js 18+ (or a recent LTS)
- A running Prestashop instance with Webservice enabled

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

## Scripts

- `npm run dev`: start the Vite dev server
- `npm run build`: production build
- `npm run preview`: preview the production build
- `npm run lint`: run ESLint
- `npm run csv:demo`: parse le premier produit du CSV et affiche le payload

## Documentation

- Prestashop API client: `docs/prestashop-api.md`
- List parameters reference: `docs/prestashop-list-parameters.md`
- Products API examples: `docs/prestashop-products-test.md`
- CSV import: `docs/csv-import.md`
- Project structure: `docs/project-structure.md`

## Data and samples

- Sample API payloads: `api_docs/`
- CSV import examples: `csv_import/`

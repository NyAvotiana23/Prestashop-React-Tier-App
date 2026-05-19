# Project Structure / Structure du projet

## FR

### Racine

- `index.html`: point d'entree Vite.
- `package.json`: scripts, dependances, metadata.
- `vite.config.js`: config Vite (proxy dev possible vers PrestaShop).
- `tailwind.config.js` et `postcss.config.js`: config Tailwind/PostCSS.
- `eslint.config.js`: config ESLint.
- `public/`: assets statiques servis tels quels.
- `api_docs/`: exemples d'API et payloads.
- `csv_import/`: exemples CSV PrestaShop.
- `docs/`: documentation du projet.
- `scripts/`: scripts utilitaires (ex: demo CSV).
- `src/`: code applicatif.

### Structure `src/`

- `main.jsx`: point d'entree React.
- `index.css`: styles globaux.
- `api/`: client PrestaShop (XML/JSON) + helpers CRUD.
- `assets/`: images et SVG.
- `components/`: composants UI par domaine.
- `constants/`: config statique et liste des ressources API.
- `context/`: providers et gardes (admin/client).
- `hooks/`: hooks reutilisables.
- `layouts/`: layouts BackOffice/FrontOffice.
- `pages/`: pages routees (dashboard, import, reset, front).
- `router/`: routes par domaine.
- `utils/`: helpers partages.
- `csv/`: parsing CSV, mappings, import, templates.

### Fichiers clefs

- `src/api/prestashopApi.js`: client XML/JSON bas niveau.
- `src/api/prestashopCrud.js`: helpers CRUD + reset.
- `src/api/api-response-handler.js`: payloads API + historique.
- `src/layouts/BackOfficeLayout.jsx`: layout admin + banner API.
- `src/layouts/FrontOfficeLayout.jsx`: layout front.
- `src/router/router.jsx`: routes principales.
- `src/router/catalogue-router.jsx`: routes catalogue.
- `src/router/customer-router.jsx`: routes clients.
- `src/router/order-router.jsx`: routes commandes.
- `src/pages/Dashboard.jsx`: stats commandes/paniers.
- `src/pages/ImportDatabase.jsx`: import CSV/ZIP.
- `src/pages/ResetDatabase.jsx`: reset ressources.
- `src/constants/apiData.js`: ressources API + metadata.
- `src/csv/csvImportConfig.js`: config des imports.
- `src/csv/csvImporter.js`: moteur d'import.
- `src/csv/CsvUploader.jsx`: upload CSV.
- `src/csv/CsvTemplateHolder.jsx`: template CSV.
- `src/csv/mappings/csvProductMapping.js`: mapping produits.
- `src/csv/mappings/csvProductCombinationMapping.js`: mapping combinaisons.
- `src/csv/mappings/csvOrderMapping.js`: mapping commandes.
- `src/csv/mappings/csvCustomerMapping.js`: mapping clients.
- `src/csv/mappings/imageMappingZip.js`: import images ZIP.
- `scripts/csv-import-demo.mjs`: demo locale CSV.

## EN

### Top-level

- `index.html`: Vite entry point.
- `package.json`: scripts, dependencies, metadata.
- `vite.config.js`: Vite config (optional dev proxy to PrestaShop).
- `tailwind.config.js` and `postcss.config.js`: Tailwind/PostCSS config.
- `eslint.config.js`: ESLint config.
- `public/`: static assets.
- `api_docs/`: API examples and payloads.
- `csv_import/`: PrestaShop CSV samples.
- `docs/`: project documentation.
- `scripts/`: local tooling (ex: CSV demo).
- `src/`: application source.

### `src/` structure

- `main.jsx`: React entry point.
- `index.css`: global styles.
- `api/`: PrestaShop client (XML/JSON) + CRUD helpers.
- `assets/`: images and SVGs.
- `components/`: UI components by domain.
- `constants/`: static config and API resources.
- `context/`: providers and guards.
- `hooks/`: reusable hooks.
- `layouts/`: BackOffice/FrontOffice layouts.
- `pages/`: routed pages (dashboard, import, reset, front).
- `router/`: route definitions.
- `utils/`: shared helpers.
- `csv/`: CSV parsing, mappings, import, templates.

### Key files

- `src/api/prestashopApi.js`: low-level XML/JSON client.
- `src/api/prestashopCrud.js`: CRUD helpers + reset.
- `src/api/api-response-handler.js`: API payloads + history.
- `src/layouts/BackOfficeLayout.jsx`: admin layout + API banner.
- `src/layouts/FrontOfficeLayout.jsx`: front layout.
- `src/router/router.jsx`: main routes.
- `src/router/catalogue-router.jsx`: catalogue routes.
- `src/router/customer-router.jsx`: customer routes.
- `src/router/order-router.jsx`: order routes.
- `src/pages/Dashboard.jsx`: order/cart stats.
- `src/pages/ImportDatabase.jsx`: CSV/ZIP import UI.
- `src/pages/ResetDatabase.jsx`: reset tools.
- `src/constants/apiData.js`: API resources + metadata.
- `src/csv/csvImportConfig.js`: import config.
- `src/csv/csvImporter.js`: import engine.
- `src/csv/CsvUploader.jsx`: CSV upload.
- `src/csv/CsvTemplateHolder.jsx`: CSV template download.
- `src/csv/mappings/csvProductMapping.js`: product mapping.
- `src/csv/mappings/csvProductCombinationMapping.js`: combination mapping.
- `src/csv/mappings/csvOrderMapping.js`: order mapping.
- `src/csv/mappings/csvCustomerMapping.js`: customer mapping.
- `src/csv/mappings/imageMappingZip.js`: ZIP image import.
- `scripts/csv-import-demo.mjs`: local CSV demo.

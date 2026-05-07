# Project Structure

This document lists the main folders and files with a short description of their role.

## Top-level

- `index.html`: Vite entry HTML.
- `package.json`: scripts, dependencies, and project metadata.
- `vite.config.js`: Vite configuration.
- `tailwind.config.js` and `postcss.config.js`: Tailwind and PostCSS setup.
- `eslint.config.js`: ESLint configuration.
- `public/`: static assets served as-is.
- `api_docs/`: API examples and data payloads.
- `csv_import/`: CSV samples for Prestashop imports.
- `docs/`: project documentation.
- `logs/`: local logs and query traces.
- `src/`: application source code.

## Source structure (`src/`)

- `main.jsx`: application entry point; mounts the React app.
- `index.css`: global styles (Tailwind base).
- `api/`: Prestashop Webservice client and CRUD helpers.
- `assets/`: bundled images and SVGs.
- `components/`: UI building blocks by feature and shared layout.
- `constants/`: static configuration, API resource list.
- `context/`: shared React context providers.
- `hooks/`: reusable hooks.
- `layouts/`: layout shells such as `RootLayout.jsx`.
- `pages/`: top-level routed pages like `Home.jsx` and `Dashboard.jsx`.
- `router/`: app routing configuration.
- `utils/`: utility helpers and small shared functions.
- `csv/`: CSV templates, parsing, and import configs.

## Key files (quick reference)

- `src/api/prestashopApi.js`: low-level XML/JSON request layer.
- `src/api/prestashopCrud.js`: convenience CRUD helpers (list, get, create, update, delete).
- `src/router/router.jsx`: root router configuration.
- `src/router/catalogue-router.jsx`: catalogue-related routes.
- `src/router/commande-router.jsx`: order-related routes.
- `src/components/shared/Header.jsx`: global header UI.
- `src/components/shared/Sidebar.jsx`: navigation sidebar.
- `src/components/shared/Footer.jsx`: global footer UI.
- `src/components/shared/Loading.jsx`: loading state component.
- `src/components/product/Products.jsx`: product list view.
- `src/components/product/ProductDetail.jsx`: product detail view.
- `src/pages/ResetDatabase.jsx`: tools for resetting Prestashop data.
- `src/constants/apiData.js`: API resource metadata for the app.
- `src/csv/csvImportConfig.js`: per-resource CSV import configuration.
- `src/csv/csvImporter.js`: generalized CSV -> API import runner.
- `src/csv/csvProductMapping.js`: products CSV row -> payload mapping.
- `scripts/csv-import-demo.mjs`: local demo to preview a product payload.

## Tree snapshot (main paths)

```
prestashop-react-app/
  api_docs/
  csv_import/
  docs/
  logs/
  public/
  src/
    api/
    assets/
    components/
      product/
      shared/
    constants/
    context/
    hooks/
    layouts/
    pages/
    router/
    utils/
    csv/
  eslint.config.js
  index.html
  package.json
  postcss.config.js
  README.md
  tailwind.config.js
  vite.config.js
```

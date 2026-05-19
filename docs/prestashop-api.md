# Prestashop API Client (JSON in app, XML over the wire)

## FR

Ce projet utilise un client axios generique pour l'API Webservice PrestaShop. Le transport reste en XML (exigence PrestaShop), mais l'app travaille en JSON. Les payloads JSON sont convertis en XML a l'envoi, et les reponses XML sont parsees/nettoyees au retour.

### 1) Variables d'environnement

Vite expose uniquement les variables prefixees `VITE_`:

```
VITE_PRESTASHOP_API_URL=/api
VITE_PRESTASHOP_API_KEY=YOUR_KEY_HERE
```

Notes:
- `VITE_PRESTASHOP_API_URL` alimente le `baseURL` axios.
- En dev, un proxy peut router `/api` vers `/prestashop/api` (voir `vite.config.js`).
- `VITE_PRESTASHOP_API_BASE_URL` n'est pas utilise par le client actuel.

Important: l'app est front, la cle API est visible dans le navigateur. Restreindre ses permissions cote PrestaShop.

### 2) Emplacement du client

- `src/api/prestashopApi.js`
- `src/api/prestashopCrud.js`

Le client axios est configure avec:
- `baseURL` = `VITE_PRESTASHOP_API_URL`
- `Authorization: Basic <base64(apiKey:)>`
- `Accept: application/xml`
- `responseType: "text"` (XML brut, puis parse)

### 3) Helpers generiques

#### Appel brut

```js
import { prestashopRequest } from "../api/prestashopApi";

const response = await prestashopRequest({
  method: "GET",
  endpoint: "products/1",
});

console.log(response.data); // XML brut
```

#### Helpers JSON

```js
import { getJson, sendJson } from "../api/prestashopApi";

const product = await getJson("products/1");

const createPayload = {
  product: {
    name: {
      language: [{ "@_id": "1", "#text": "New product" }],
    },
  },
};

const created = await sendJson("POST", "products", createPayload);
```

Notes:
- `getJson`/`sendJson` renvoient `response.data` nettoye (suppression `#text`, `@_...`).
- Le XML brut reste accessible via `response.rawXml`.
- Les payloads peuvent etre `{ product: { ... } }` ou `{ prestashop: { product: { ... } } }`.
- `buildFullUrl()` reconstruit une URL complete utile pour les logs.

### 4) CRUD helpers (recommande)

```js
import {
  getList,
  getById,
  createResource,
  updateResource,
  patchResource,
  deleteResource,
  getAllIds,
  resetDatabase,
} from "../api/prestashopCrud";

const products = await getList("products", {
  display: "[id,name]",
  sort: "[id_DESC]",
  limit: "0,10",
});

const product = await getById("products", 1);

await updateResource("products", 1, {
  product: { name: { language: [{ "@_id": "1", "#text": "Updated" }] } },
});

await patchResource("products", 1, {
  product: { price: "19.99" },
});

const ids = await getAllIds("products");
await deleteResource("products", ids[0]);

const report = await resetDatabase(["products", "orders"]);
```

### 5) Handler global de reponses

Chaque appel emit un payload normalise:
- Handler: `src/api/api-response-handler.js`
- UI: `src/layouts/BackOfficeLayout.jsx` + `src/components/shared/StatusBanner.jsx`

Le handler parse aussi les erreurs XML PrestaShop (`<errors><error>...</error></errors>`) et les ajoute aux `details`.

### 6) Notes

- 401/403: verifier les permissions de la cle API.
- CORS: configurer le serveur PrestaShop.
- Le parse/build XML utilise `fast-xml-parser` (CDATA et non-self-closing tags).

## EN

This project uses a generic axios client for the PrestaShop Webservice API. Transport stays XML (PrestaShop requirement), while app code uses JSON. JSON payloads are converted to XML on write and XML responses are parsed/cleaned on read.

### 1) Environment variables

Vite only exposes `VITE_` vars:

```
VITE_PRESTASHOP_API_URL=/api
VITE_PRESTASHOP_API_KEY=YOUR_KEY_HERE
```

Notes:
- `VITE_PRESTASHOP_API_URL` drives the axios `baseURL`.
- In dev, `/api` can be proxied to `/prestashop/api` (see `vite.config.js`).
- `VITE_PRESTASHOP_API_BASE_URL` is not used by the current client code.

Important: this is a frontend app, the API key is visible in the browser. Use a restricted key.

### 2) Client location

- `src/api/prestashopApi.js`
- `src/api/prestashopCrud.js`

Axios is configured with:
- `baseURL` = `VITE_PRESTASHOP_API_URL`
- `Authorization: Basic <base64(apiKey:)>`
- `Accept: application/xml`
- `responseType: "text"` (raw XML, then parsed)

### 3) Generic helpers

#### Raw request

```js
import { prestashopRequest } from "../api/prestashopApi";

const response = await prestashopRequest({
  method: "GET",
  endpoint: "products/1",
});

console.log(response.data); // raw XML
```

#### JSON helpers

```js
import { getJson, sendJson } from "../api/prestashopApi";

const product = await getJson("products/1");

const createPayload = {
  product: {
    name: {
      language: [{ "@_id": "1", "#text": "New product" }],
    },
  },
};

const created = await sendJson("POST", "products", createPayload);
```

Notes:
- `getJson`/`sendJson` return cleaned JSON in `response.data`.
- Raw XML is kept in `response.rawXml`.
- Payloads can be `{ product: { ... } }` or `{ prestashop: { product: { ... } } }`.
- `buildFullUrl()` rebuilds a full URL for logging.

### 4) CRUD helpers (recommended)

```js
import {
  getList,
  getById,
  createResource,
  updateResource,
  patchResource,
  deleteResource,
  getAllIds,
  resetDatabase,
} from "../api/prestashopCrud";

const products = await getList("products", {
  display: "[id,name]",
  sort: "[id_DESC]",
  limit: "0,10",
});

const product = await getById("products", 1);

await updateResource("products", 1, {
  product: { name: { language: [{ "@_id": "1", "#text": "Updated" }] } },
});

await patchResource("products", 1, {
  product: { price: "19.99" },
});

const ids = await getAllIds("products");
await deleteResource("products", ids[0]);

const report = await resetDatabase(["products", "orders"]);
```

### 5) Global API response handler

Each call emits a normalized payload:
- Handler: `src/api/api-response-handler.js`
- UI: `src/layouts/BackOfficeLayout.jsx` + `src/components/shared/StatusBanner.jsx`

The handler also parses PrestaShop XML errors (`<errors><error>...</error></errors>`) and appends them to `details`.

### 6) Notes

- 401/403: check API key permissions.
- CORS: allow the frontend origin on the PrestaShop server.
- XML parsing/building uses `fast-xml-parser` (CDATA, no self-closing tags).

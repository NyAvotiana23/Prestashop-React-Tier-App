# Prestashop API Client (JSON in app, XML over the wire)

This project uses a small, generic axios client for the Prestashop Webservice API. The HTTP layer still sends and receives XML (Prestashop requirement), but the app code works with JSON objects. JSON payloads are converted to XML on write, and XML responses are parsed into plain JS objects on read.

## 1) Environment variables

Vite only exposes variables that start with `VITE_`, so the client reads:

```
VITE_PRESTASHOP_API_URL=/api
VITE_PRESTASHOP_API_KEY=YOUR_KEY_HERE
```

Notes:
- `VITE_PRESTASHOP_API_URL` is used as the axios `baseURL`.
- In dev, `/api` is proxied to `/prestashop/api` by `vite.config.js`.
- `VITE_PRESTASHOP_API_BASE_URL` exists in `.env` but is not used by the current client code.

Important: because this is a frontend app, the API key will be visible to anyone who can load the app in a browser. Use a safe key and restrict its permissions on the Prestashop side.

## 2) Client location

The client is implemented here:

- `src/api/prestashopApi.js`
- `src/api/prestashopCrud.js`

It creates a single axios instance with:

- `baseURL` set to `VITE_PRESTASHOP_API_URL`
- `Authorization: Basic <base64(apiKey:)>`
- `Accept: application/xml`
- `responseType: "text"` (XML is returned as raw text, then parsed to JSON)

The CRUD helpers in `src/api/prestashopCrud.js` wrap list/detail requests, CRUD calls, list filtering, and database reset helpers.

## 3) Generic request helper

Use `prestashopRequest` for full control or the JSON helpers.

### Generic request

```js
import { prestashopRequest } from "../api/prestashopApi";

const response = await prestashopRequest({
  method: "GET",
  endpoint: "products/1",
});

console.log(response.data); // XML as string
```

### JSON helpers

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
- `getJson` and `sendJson` return a cleaned JSON object in `response.data`.
- Cleaning removes `#text` and `@_...` keys, mapping attributes to plain keys
  (for example `@_id` becomes `id`). If a node only contains `#text`, it is
  collapsed into a plain string value.
- Raw XML is still available in `response.rawXml` when needed.
- Payloads can be either `{ product: { ... } }` or `{ prestashop: { product: { ... } } }`.

## 4) CRUD helpers (recommended in the app)

```js
import {
  getList,
  getById,
  createResource,
  updateResource,
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

const ids = await getAllIds("products");
await deleteResource("products", ids[0]);

const report = await resetDatabase(["products", "orders"]);
```

## 5) Notes and troubleshooting

- If requests fail with 401/403, check the API key permissions in Prestashop.
- If you see CORS errors, configure your Prestashop server to allow requests from your frontend origin.
- XML parsing and building are handled by the client using `fast-xml-parser`.
- `getJson`/`sendJson` return a cleaned object in `response.data` and keep the raw XML in `response.rawXml` if you need it.
- `sendJson` wraps payloads in a `<prestashop>` root automatically.

## 6) CSV import

The CSV importer builds JSON payloads and submits them through `createResource`.
The product mapping lives in `src/csv/csvProductMapping.js` and is documented in `docs/csv-import.md`.

```js
import { importCsvResource } from "../csv/csvImporter";
import { CSV_IMPORT_CONFIGS } from "../csv/csvImportConfig";

const result = await importCsvResource({
  ref: "products",
  csvText,
  config: CSV_IMPORT_CONFIGS.products,
  delimiter: ";",
});
```

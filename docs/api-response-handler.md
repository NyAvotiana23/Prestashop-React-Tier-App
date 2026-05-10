# API Response Handler (global banner)

This module centralizes API success/error reporting for the PrestaShop Webservice. Each API call emits a payload, and the Root layout renders a banner at the top of the main content area.

## Location

- `src/api/api-response-handler.js`
- `src/layouts/RootLayout.jsx` (banner rendering)
- `src/components/shared/StatusBanner.jsx` (banner UI)

## What it does

- Stores the latest API response (success or error).
- Lets the UI subscribe and react to new responses.
- Builds extra context from the endpoint (resource + id).
- Parses PrestaShop XML error payloads to show codes/messages.
- Adds potential causes for common HTTP statuses (404, 401, 403, 500...).

## Response payload shape

```js
{
  ok: true | false,
  status: 200,
  statusText: "OK",
  method: "GET",
  endpoint: "orders/1",
  fullUrl: "https://example.com/api/orders/1",
  title: "API: succes",
  message: "Requete GET reussie.",
  details: ["Ressource: orders.", "ID: 1.", "..."],
  resource: "orders",
  id: "1",
  rawXml: "<prestashop>...</prestashop>",
  errors: [{ code: "78", message: "..." }],
  timestamp: 1710000000000
}
```

Notes:
- `details` will include potential causes for known HTTP codes.
- `errors` is filled when the response XML contains `<errors>`.
- `resource` and `id` are inferred from `endpoint` (first two segments).

## Usage (in code)

```js
import {
  emitApiResponse,
  buildApiErrorPayload,
  buildApiSuccessPayload,
} from "../api/api-response-handler";

emitApiResponse(buildApiSuccessPayload({
  method: "GET",
  endpoint: "orders/1",
  status: 200,
}));

emitApiResponse(buildApiErrorPayload({
  error,
  method: "GET",
  endpoint: "orders/1",
}));
```

## UI behavior

- The banner appears in `RootLayout` for every success or error.
- Success banners auto-dismiss after 5 seconds.
- Error banners stay until the next response (or manual dismissal in code).
- The request line shows `METHOD` + `fullUrl` for quick debugging.

## Extending it

- Add more status codes in `buildPotentialCauses`.
- Extend the payload with extra metadata (shop id, params, etc.).
- Add a dismiss button in the UI if needed.

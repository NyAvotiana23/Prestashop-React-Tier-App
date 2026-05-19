# API Response Handler (global banner)

## FR

Ce module centralise les succes/erreurs de l'API PrestaShop. Chaque appel emet un payload et le layout admin affiche un banner (avec historique).

### Emplacement

- `src/api/api-response-handler.js`
- `src/layouts/BackOfficeLayout.jsx` (render du banner)
- `src/components/shared/StatusBanner.jsx` (UI)
- `src/components/shared/ApiHistoryModal.jsx` (historique)

### Ce que fait le module

- Stocke la derniere reponse (success/erreur).
- Stocke un historique (limite par defaut: 50).
- Laisse l'UI s'abonner aux changements.
- Ajoute du contexte (resource + id) depuis l'endpoint.
- Parse les erreurs XML PrestaShop.
- Ajoute des causes probables pour certains statuts (401/403/404/500...).

### Format du payload

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
- `details` inclut des causes potentielles selon le code HTTP.
- `errors` est rempli si `<errors>` est present.
- `resource` et `id` sont derives de l'endpoint.

### Usage (code)

```js
import {
  emitApiResponse,
  buildApiErrorPayload,
  buildApiSuccessPayload,
  setApiResponseHistoryLimit,
} from "../api/api-response-handler";

setApiResponseHistoryLimit(100);

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

### UI

- Le banner s'affiche dans `BackOfficeLayout`.
- L'historique affiche les dernieres reponses (hors celle courante).
- Le bouton ouvre un modal d'historique.

## EN

This module centralizes PrestaShop API success/error reporting. Each call emits a payload and the admin layout renders a banner (with history).

### Location

- `src/api/api-response-handler.js`
- `src/layouts/BackOfficeLayout.jsx` (banner rendering)
- `src/components/shared/StatusBanner.jsx` (UI)
- `src/components/shared/ApiHistoryModal.jsx` (history)

### What it does

- Stores the latest response (success/error).
- Stores a history list (default limit: 50).
- Lets the UI subscribe to changes.
- Adds resource/id context from the endpoint.
- Parses PrestaShop XML errors.
- Adds likely causes for common status codes.

### Payload shape

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
- `details` includes likely causes for known HTTP codes.
- `errors` is filled when `<errors>` exists.
- `resource` and `id` are derived from the endpoint.

### Usage (code)

```js
import {
  emitApiResponse,
  buildApiErrorPayload,
  buildApiSuccessPayload,
  setApiResponseHistoryLimit,
} from "../api/api-response-handler";

setApiResponseHistoryLimit(100);

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

### UI

- The banner renders in `BackOfficeLayout`.
- The history button opens a modal with recent calls.

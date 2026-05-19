# Custom Order State (custom_order_state)

## FR

Endpoint personnalise pour changer le statut d'une commande avec logique metier (stock, email, dates).

### Prerequis

- Module `monapicustom` installe et actif sur PrestaShop.
- Webservice actif dans le back-office.
- La cle API dispose de l'acces a la ressource `custom_order_state`.
- La base URL Webservice est configuree via `VITE_PRESTASHOP_API_URL` et la cle via `VITE_PRESTASHOP_API_KEY`.

### Payload attendu (XML)

Le module attend une balise racine `<manual_order_state>` :

```xml
<manual_order_state>
  <id_order>12</id_order>
  <id_order_state>5</id_order_state>
  <id_employee>1</id_employee>
  <date>2026-05-18 10:30:00</date>
</manual_order_state>
```

Champs:
- `id_order` (obligatoire) : identifiant de commande.
- `id_order_state` (obligatoire) : `5` (livre) ou `6` (annule).
- `id_employee` (optionnel) : employe qui effectue la mise a jour.
- `date` (optionnel) : date effective (formats acceptes: `YYYY-MM-DD HH:MM:SS`, `YYYY-MM-DD`, `DD/MM/YYYY`).

### Service front (React)

Le wrapper est dans `src/service/custom-stock-service.js` et construit le XML automatiquement.

```js
import { updateOrderState } from "../service/custom-stock-service";

const response = await updateOrderState({
  orderId: 12,
  stateId: 5,
  employeeId: 1,
  effectiveDate: "2026-05-18 10:30:00",
});

console.log(response.data);
```

### Reponse type

```json
{
  "success": "1",
  "id_order": "12",
  "previous_state": "3",
  "new_state": "5",
  "changed": "1",
  "history_id": "42",
  "id_employee": "1",
  "effective_date": "2026-05-18 10:30:00",
  "delivery_date": "2026-05-18 10:30:00",
  "invoice_number": "123"
}
```

Notes:
- Si la commande est deja au bon statut, `changed = 0` et `history_id = 0`.
- Les erreurs XML PrestaShop sont converties en exceptions par le client.

## EN

Custom endpoint to update an order state with business logic (stock, email, dates).

### Prerequisites

- `monapicustom` module installed and enabled on PrestaShop.
- Webservice enabled in back-office.
- API key has access to the `custom_order_state` resource.
- Webservice base URL is set in `VITE_PRESTASHOP_API_URL` and key in `VITE_PRESTASHOP_API_KEY`.

### Expected payload (XML)

The module expects a `<manual_order_state>` root node:

```xml
<manual_order_state>
  <id_order>12</id_order>
  <id_order_state>5</id_order_state>
  <id_employee>1</id_employee>
  <date>2026-05-18 10:30:00</date>
</manual_order_state>
```

Fields:
- `id_order` (required): order id.
- `id_order_state` (required): `5` (delivered) or `6` (canceled).
- `id_employee` (optional): employee performing the update.
- `date` (optional): effective date (accepted formats: `YYYY-MM-DD HH:MM:SS`, `YYYY-MM-DD`, `DD/MM/YYYY`).

### Frontend service (React)

Wrapper in `src/service/custom-stock-service.js` builds the XML automatically.

```js
import { updateOrderState } from "../service/custom-stock-service";

const response = await updateOrderState({
  orderId: 12,
  stateId: 5,
  employeeId: 1,
  effectiveDate: "2026-05-18 10:30:00",
});

console.log(response.data);
```

### Sample response

```json
{
  "success": "1",
  "id_order": "12",
  "previous_state": "3",
  "new_state": "5",
  "changed": "1",
  "history_id": "42",
  "id_employee": "1",
  "effective_date": "2026-05-18 10:30:00",
  "delivery_date": "2026-05-18 10:30:00",
  "invoice_number": "123"
}
```

Notes:
- If the order already has the target status, `changed = 0` and `history_id = 0`.
- PrestaShop XML errors are surfaced as exceptions by the client.


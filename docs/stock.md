# Stock — guide complet (API + import + UI)

## FR

### 1) Systeme de stock dans ce projet

Le projet manipule le stock via deux voies:

- `stock_availables`: quantite visible et effective pour le front.
- `stock_movements`: historique et mouvements (entree/sortie) pour audit et calcul de cout (WA/CUMP).

L'import CSV/ZIP et l'UI admin utilisent ces ressources pour:

- Initialiser le stock a l'import produits/combinaisons.
- Diminuer le stock lors de la creation des commandes.
- Tracer les mouvements via `stock_movements`.

### 2) Ressources et roles

#### `stock_availables`

- Contient la quantite en stock par produit et par combinaison.
- Utilise par le front pour afficher la disponibilite.
- Mis a jour via `PATCH` dans l'import.

Champs clefs utilises:

- `id_product`
- `id_product_attribute` (0 pour produit simple)
- `quantity`

#### `stock_movements`

- Enregistre chaque mouvement (entree ou sortie).
- Utilise `sign` et `physical_quantity` pour representer le delta.
- Porte le `price_te` (cout unitaire HT) pour la valorisation.

Champs clefs utilises:

- `id_stock` (dans l'app, issu de `stock_availables.id`)
- `id_product`, `id_product_attribute`
- `sign` (1 ou -1)
- `physical_quantity` (toujours positif)
- `price_te` (cout HT avec 6 decimales)
- `date_add`

#### `stocks` (ASM)

- Lie produits/combinaisons aux entrepots dans l'Advanced Stock Management.
- Non manipule directement par l'app, mais influence `stock_movements` si ASM est active.

### 3) Ce qui peut arriver (cas et effets)

1) Import produit (sans combinaisons)
- Cree le produit.
- Le stock est ajuste via `stock_availables` (combinaison `0`).
- Un `stock_movement` est cree avec `sign=1` et `price_te=wholesale_price`.

2) Import combinaisons
- Cree la combinaison.
- PrestaShop cree un `stock_available` pour la combinaison.
- L'app met a jour `quantity` et cree un `stock_movement`.

3) Import commandes
- Creation de `cart` puis `order`.
- Stock diminue via un `stock_movement` avec `sign=-1`.
- `price_te` est le prix HT calcule pour la ligne commande.

4) Erreurs possibles
- `401/403`: cle API sans droits sur `stock_availables`/`stock_movements`.
- `404`: mauvaise ressource ou id inexistant.
- `405`: methode non autorisee (ressource protegee).
- ASM active et `id_stock` non valide: les `stock_movements` peuvent echouer.

5) Cas particuliers
- Combinaison introuvable: la commande echoue (erreur explicite).
- Produit non trouve: import commande stoppe.
- `stock_initial` negatif: validation echoue.

### 4) WA/CUMP, FIFO, LIFO et `price_te`

#### WA / CUMP (Weighted Average / Cout Moyen Pondere)

- PrestaShop calcule le cout moyen avec `price_te` lors des mouvements.
- Formule:

```
current_wa = ((existing_qty * last_wa) + (incoming_qty * price_te))
             / (existing_qty + incoming_qty)
```

#### FIFO / LIFO

- FIFO/LIFO sont des strategies de valorisation dans ASM.
- L'app n'applique pas FIFO/LIFO directement.
- Si ASM est active et configuree, PrestaShop peut utiliser ces regles a partir des mouvements.

#### `price_te`

- Valeur unitaire HT au moment du mouvement.
- Entree stock: vrai cout d'achat (wholesale).
- Sortie stock: 0.000000 acceptable (cout non pertinent).

### 5) Implementation actuelle (ou et comment)

- Mise a jour stock:
  - `src/csv/mappings/csvMappingUtils.js` -> `patchStockAvailable()`
- Creation mouvement:
  - `src/csv/mappings/csvMappingUtils.js` -> `createStockMvt()`
- Import combinaisons:
  - `src/csv/mappings/csvProductCombinationMapping.js`
- Import commandes:
  - `src/csv/mappings/csvOrderMapping.js`

Flux type:

1. Lire `stock_availables` avec filtre (produit + combinaison)
2. `PATCH stock_availables/{id}` avec la nouvelle quantite
3. `POST stock_movements` avec `sign`, `physical_quantity`, `price_te`

### 6) Features stock possibles (basees sur les donnees existantes)

#### Feature A — Alertes de stock bas

- Source: `stock_availables.quantity` + seuil configurable.
- UI: badge ou liste dans le dashboard admin.
- Bonus: suivi par produit/combinaison.

#### Feature B — Reconciliation / Audit stock

- Compare stock theorique (somme des mouvements) vs `stock_availables.quantity`.
- Detecte des ecarts (import, mouvement manquant, suppression manuelle).
- Peut exporter un rapport CSV.

#### Feature C — Historique stock par produit

- Vue detaillee par produit/combinaison.
- Liste des `stock_movements` avec date, quantite, prix.
- Calcul de la valeur du stock a une date donnee (WA).

### 7) Points de vigilance

- ASM active: `id_stock` peut devoir provenir de `ps_stock`.
- `stock_movements` peut etre bloque si la ressource est desactivee.
- Les conversions HT/TTC doivent rester coherentes (precision 6 decimales).

---

## EN

### 1) Stock system in this project

The project manipulates stock through two paths:

- `stock_availables`: the effective quantity for the storefront.
- `stock_movements`: movement history (in/out) for audit and cost valuation.

The import pipeline and admin UI use these resources to:

- Initialize stock on product/combination import.
- Decrease stock when orders are created.
- Track movements via `stock_movements`.

### 2) Resources and roles

#### `stock_availables`

- Holds quantity per product and per combination.
- Used by the storefront to show availability.
- Updated with `PATCH` in the import flow.

Key fields:

- `id_product`
- `id_product_attribute` (0 for simple products)
- `quantity`

#### `stock_movements`

- Records each movement (in/out).
- Uses `sign` + `physical_quantity` to represent the delta.
- Carries `price_te` (unit cost, tax excluded).

Key fields:

- `id_stock` (in this app, taken from `stock_availables.id`)
- `id_product`, `id_product_attribute`
- `sign` (1 or -1)
- `physical_quantity` (always positive)
- `price_te` (unit cost with 6 decimals)
- `date_add`

#### `stocks` (ASM)

- Links product/combination to warehouses in Advanced Stock Management.
- Not manipulated directly by the app, but affects `stock_movements` if ASM is enabled.

### 3) What can happen (cases and effects)

1) Product import (no combinations)
- Creates product.
- Stock updated via `stock_availables` (combination `0`).
- A `stock_movement` is created with `sign=1` and `price_te=wholesale_price`.

2) Combination import
- Creates the combination.
- PrestaShop creates a `stock_available` entry for it.
- The app updates `quantity` and creates a `stock_movement`.

3) Order import
- Creates `cart` then `order`.
- Stock decreases via a `stock_movement` with `sign=-1`.
- `price_te` is the computed HT price for the order line.

4) Possible errors
- `401/403`: API key lacks rights for `stock_availables`/`stock_movements`.
- `404`: wrong resource or invalid id.
- `405`: method not allowed on protected resources.
- ASM enabled and invalid `id_stock`: `stock_movements` may fail.

5) Special cases
- Missing combination: order import fails with explicit error.
- Missing product: order import stops.
- Negative `stock_initial`: validation fails.

### 4) WA/CUMP, FIFO, LIFO and `price_te`

#### WA / CUMP (Weighted Average)

- PrestaShop computes weighted average using `price_te`.
- Formula:

```
current_wa = ((existing_qty * last_wa) + (incoming_qty * price_te))
             / (existing_qty + incoming_qty)
```

#### FIFO / LIFO

- FIFO/LIFO are valuation strategies in ASM.
- The app does not implement FIFO/LIFO directly.
- If ASM is enabled and configured, PrestaShop may apply these rules.

#### `price_te`

- Unit cost price at movement time (tax excluded).
- Stock IN: real purchase cost (wholesale).
- Stock OUT: `0.000000` is acceptable.

### 5) Current implementation (where and how)

- Stock update:
  - `src/csv/mappings/csvMappingUtils.js` -> `patchStockAvailable()`
- Movement creation:
  - `src/csv/mappings/csvMappingUtils.js` -> `createStockMvt()`
- Combination import:
  - `src/csv/mappings/csvProductCombinationMapping.js`
- Order import:
  - `src/csv/mappings/csvOrderMapping.js`

Flow:

1. Read `stock_availables` with filters (product + combination)
2. `PATCH stock_availables/{id}` with new quantity
3. `POST stock_movements` with `sign`, `physical_quantity`, `price_te`

### 6) Stock feature ideas (based on existing data)

#### Feature A — Low stock alerts

- Source: `stock_availables.quantity` + configurable threshold.
- UI: badge or list in admin dashboard.
- Bonus: per product/combination view.

#### Feature B — Stock reconciliation / audit

- Compare theoretical stock (sum of movements) vs `stock_availables.quantity`.
- Detect drift (import, missing movement, manual changes).
- Can export a CSV report.

#### Feature C — Stock history by product

- Detailed view by product/combination.
- List `stock_movements` with date, qty, price.
- Compute stock valuation at a given date (WA).

### 7) Caveats

- ASM enabled: `id_stock` may need to come from `ps_stock`.
- `stock_movements` can be blocked if the resource is disabled.
- HT/TTC conversions should keep 6-decimal precision.


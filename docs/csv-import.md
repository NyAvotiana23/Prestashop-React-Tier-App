# CSV Import / Import CSV

## FR

Ce document decrit comment les CSV (et le ZIP d'images) sont parses et transformes avant envoi vers l'API PrestaShop.

### 1) Emplacement

- Config: `src/csv/csvImportConfig.js`
- Headers: `src/csv/csvHeaders.js`
- Mappings: `src/csv/mappings/`
- Moteur d'import: `src/csv/csvImporter.js`
- UI: `src/pages/ImportDatabase.jsx`, `src/csv/CsvUploader.jsx`, `src/csv/CsvTemplateHolder.jsx`

### 2) Ressources supportees

- CSV: `products`, `combinations`, `orders` (UI admin)
- CSV: `customers` (support code, pas expose dans l'UI)
- ZIP: `images` (import images produits)

### 3) Formats communs

- Delimiteur CSV: configurables par ressource dans l'UI (defaut: `,`).
- Separateur decimal: configurable (defaut: `,`).
- Dates: format `JJ/MM/AAAA` (converti en ISO).
- Validation: les headers manquants sont signales mais l'import continue.
- `stopOnError` actif pour produits, combinaisons, commandes (arret au 1er blocage).

### 4) Headers attendus

#### Produits (`products`)

```
date_availability_produit,nom,reference,prix_ttc,Taxe,categorie,prix_achat
```

#### Combinaisons (`combinations`)

```
reference,specificite,karazany,stock_initial,prix_vente_ttc
```

`specificite` peut aussi etre fourni en `specificité` (accent) si le CSV contient cette entete.

#### Commandes (`orders`)

```
date,nom,email,pwd,adresse,achat,etat
```

#### Clients (`customers`)

```
id,Password,Last Name,First Name,Email,Active (0/1),Title ID (Mr = 1, Ms = 2, else 0),Groupe ID(Visiteur = 1, Invite = 2, CLient = 3)
```

### 5) Mapping principal

#### Produits

- `nom` -> `product.name` (i18n)
- `reference` -> `product.reference`
- `prix_ttc` -> `product.price` (converti en HT)
- `Taxe` -> `product.id_tax_rules_group` (creation si besoin)
- `categorie` -> `product.id_category_default` + association categorie
- `prix_achat` -> `product.wholesale_price`
- `date_availability_produit` -> `product.available_date`

Par defaut, le mapping force aussi `active=1`, `available_for_order=1`, `visibility=both`.

#### Combinaisons

- Recherche du produit par `reference`.
- Si `specificite`/`karazany` sont vides: maj du stock du produit simple (combinaison `0`).
- Sinon: creation du groupe d'attributs + valeur, creation de la combinaison.
- `prix_vente_ttc` est converti en delta HT: `combination.price`.
- `stock_initial` met a jour `stock_availables` + cree un `stock_movement`.

#### Commandes

- Cree/recupere le client par email (fallback client anonyme si email vide).
- Cree l'adresse si absente.
- Cree un `cart` avec `cart_rows`.
- Si `etat` est vide ou "dans le panier": pas de commande, panier uniquement.
- Sinon: creation de `order` + `order_rows`, puis decrement de stock via `stock_movements`.

Format de `achat`:

```
[("REF";qty;"variant"),("REF";qty;"variant")]
```

Le `variant` est optionnel et correspond au libelle de combinaison.

#### Clients

- Mapping direct vers `customer`.
- `Groupe ID...` accepte des noms (`VISITEUR/INVITE/CLIENT`) ou des ids numeriques.
- Plusieurs groupes separent par `/`.

#### Images ZIP

- Nom de fichier: `{reference}.{ext}` (reference produit uniquement).
- Extensions supportees: jpg, jpeg, png, webp, gif, bmp.
- Les fichiers dans des sous-dossiers et `__MACOSX` sont ignores.
- Envoi via `POST images/products/{productId}`.

### 6) Flux d'import (code)

1. Parse CSV via PapaParse.
2. Validation des headers + validation par ligne.
3. Mapping vers payload JSON.
4. `createResource()` envoie l'XML.
5. Progression par ligne.

### 7) Demo locale

```bash
npm run csv:demo
```

## EN

This document describes how CSV (and the image ZIP) are parsed and transformed before sending to the PrestaShop API.

### 1) Location

- Config: `src/csv/csvImportConfig.js`
- Headers: `src/csv/csvHeaders.js`
- Mappings: `src/csv/mappings/`
- Import engine: `src/csv/csvImporter.js`
- UI: `src/pages/ImportDatabase.jsx`, `src/csv/CsvUploader.jsx`, `src/csv/CsvTemplateHolder.jsx`

### 2) Supported resources

- CSV: `products`, `combinations`, `orders` (admin UI)
- CSV: `customers` (code support, not exposed in UI)
- ZIP: `images` (product image import)

### 3) Shared formats

- CSV delimiter: per-resource setting in UI (default: `,`).
- Decimal separator: configurable (default: `,`).
- Dates: `DD/MM/YYYY` (converted to ISO).
- Header validation: missing headers are reported but import continues.
- `stopOnError` is enabled for products, combinations, orders.

### 4) Expected headers

#### Products (`products`)

```
date_availability_produit,nom,reference,prix_ttc,Taxe,categorie,prix_achat
```

#### Combinations (`combinations`)

```
reference,specificite,karazany,stock_initial,prix_vente_ttc
```

`specificite` can also be provided as `specificité` if the CSV uses the accented header.

#### Orders (`orders`)

```
date,nom,email,pwd,adresse,achat,etat
```

#### Customers (`customers`)

```
id,Password,Last Name,First Name,Email,Active (0/1),Title ID (Mr = 1, Ms = 2, else 0),Groupe ID(Visiteur = 1, Invite = 2, CLient = 3)
```

### 5) Main mapping

#### Products

- `nom` -> `product.name` (i18n)
- `reference` -> `product.reference`
- `prix_ttc` -> `product.price` (converted to HT)
- `Taxe` -> `product.id_tax_rules_group` (created if needed)
- `categorie` -> `product.id_category_default` + category association
- `prix_achat` -> `product.wholesale_price`
- `date_availability_produit` -> `product.available_date`

Defaults: `active=1`, `available_for_order=1`, `visibility=both`.

#### Combinations

- Find product by `reference`.
- If `specificite`/`karazany` are empty: update stock for simple product (combination `0`).
- Else: ensure option group/value, create combination.
- `prix_vente_ttc` is converted to HT delta for `combination.price`.
- `stock_initial` updates `stock_availables` + creates a `stock_movement`.

#### Orders

- Find/create customer by email (fallback anonymous if email empty).
- Create address if missing.
- Create a `cart` with `cart_rows`.
- If `etat` empty or "dans le panier": no order, cart only.
- Else: create `order` + `order_rows`, then decrease stock via `stock_movements`.

`achat` format:

```
[("REF";qty;"variant"),("REF";qty;"variant")]
```

`variant` is optional and matches the combination label.

#### Customers

- Direct mapping to `customer`.
- `Groupe ID...` accepts names (`VISITEUR/INVITE/CLIENT`) or numeric ids.
- Multiple groups separated by `/`.

#### Images ZIP

- Filename pattern: `{reference}.{ext}` (product reference only).
- Supported extensions: jpg, jpeg, png, webp, gif, bmp.
- Nested folders and `__MACOSX` are ignored.
- Uploads via `POST images/products/{productId}`.

### 6) Import flow (code)

1. Parse CSV with PapaParse.
2. Header + row validation.
3. Map to JSON payload.
4. `createResource()` sends XML.
5. Per-row progress callbacks.

### 7) Local demo

```bash
npm run csv:demo
```

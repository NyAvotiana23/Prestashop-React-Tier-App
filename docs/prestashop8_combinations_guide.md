# PrestaShop 8 — Guide complet : Combinaisons (Déclinaisons) et Import CSV

> Documentation générée suite à l'implémentation d'un import CSV de produits avec combinaisons via l'API Webservice PrestaShop 8.

---

## Table des matières

1. [Concepts fondamentaux](#1-concepts-fondamentaux)
2. [Architecture des prix : HT, TTC et TVA](#2-architecture-des-prix--ht-ttc-et-tva)
3. [Structure des ressources API](#3-structure-des-ressources-api)
4. [Tous les endpoints API concernés](#4-tous-les-endpoints-api-concernés)
5. [Flux complet de création d'un produit avec combinaisons](#5-flux-complet-de-création-dun-produit-avec-combinaisons)
6. [Le prix dans combination.price : la logique du delta](#6-le-prix-dans-combinationprice--la-logique-du-delta)
7. [Pourquoi pas specific_prices ?](#7-pourquoi-pas-specific_prices-)
8. [Gestion du stock](#8-gestion-du-stock)
9. [Structure des fichiers CSV utilisés](#9-structure-des-fichiers-csv-utilisés)
10. [Code implémenté](#10-code-implémenté)
11. [Récapitulatif des décisions techniques](#11-récapitulatif-des-décisions-techniques)

---

## 1. Concepts fondamentaux

### Qu'est-ce qu'une combinaison (déclinaison) ?

Une **combinaison** est une variante d'un produit définie par une ou plusieurs **valeurs d'attributs**. Par exemple, un T-shirt peut avoir les combinaisons suivantes :

- Taille S, Couleur Rouge
- Taille M, Couleur Rouge
- Taille S, Couleur Bleu

Chaque combinaison est une entité indépendante qui peut avoir son propre :

- Prix (sous forme de delta par rapport au produit de base)
- Référence / SKU
- Codes-barres (EAN13, UPC, ISBN, MPN)
- Quantité en stock
- Quantité minimale de commande
- Prix d'achat (wholesale)
- Image par défaut
- Statut "combinaison par défaut"

En interne dans la base de données PrestaShop, une combinaison est stockée dans la table `ps_product_attribute`, mais l'API Webservice l'expose sous le nom `combination`.

### La hiérarchie des attributs

Avant de créer une combinaison, il faut comprendre le système à trois niveaux :

```
product_option  (Groupe d'attributs = "Couleur", "Taille")
    └── product_option_value  (Valeur d'attribut = "Rouge", "S", "XL")

combination  (lie un produit + une ou plusieurs valeurs d'options)
    └── stock_available  (créé automatiquement, contient la quantité)
```

Un groupe d'attributs (`product_option`) représente la **dimension** de variation (ex: Taille). Une valeur d'attribut (`product_option_value`) représente une **option concrète** dans cette dimension (ex: S, M, L). Une combinaison associe un produit à une ou plusieurs valeurs, une par groupe.

> **Règle importante** : une combinaison ne peut pas contenir deux valeurs du même groupe. Taille=S ET Taille=M est invalide. Taille=S ET Couleur=Rouge est valide.

---

## 2. Architecture des prix : HT, TTC et TVA

C'est l'aspect le plus critique de l'intégration. PrestaShop stocke **tous les prix en HT (Hors Taxe)** dans sa base de données. L'affichage TTC est calculé à la volée selon le groupe de règles de taxe (`tax_rules_group`) associé au produit.

### Définitions

| Terme | Signification | Formule         |
|---|---|-----------------|
| **HT** | Hors Taxe — prix sans TVA | `TTC /  (1 + taux)` |
| **TTC** | Toutes Taxes Comprises — prix avec TVA | `HT × (1 + taux)` |
| **TVA** | Taxe sur la Valeur Ajoutée | `taux = (TTC / HT) - 1`              |
| **Taux** | Le taux TVA en décimal | `TVA = TTC - HT` |

### Formules de conversion

#### TTC → HT (pour stocker dans l'API)

```
prix_HT = prix_TTC / (1 + taux_TVA)
```

**Exemples avec taux = 11.65% :**

| prix_TTC (CSV) | Calcul | prix_HT (API) |
|---|---|---|
| 12,50 | 12.50 / 1.1165 | 11.196591... |
| 15,00 | 15.00 / 1.1165 | 13.435819... |
| 23,49 | 23.49 / 1.1165 | 21.039139... |
| 18,99 | 18.99 / 1.1165 | 17.007614... |

#### HT → TTC (pour affichage ou vérification)

```
prix_TTC = prix_HT × (1 + taux_TVA)
```

**Exemple :**
```
11.196591 × 1.1165 = 12.4999...  ≈ 12,50 ✓
```

### En JavaScript (code utilisé)

```js
// Conversion TTC → HT
const taxRate = 11.65;                        // récupéré depuis l'API
const taxMultiplier = 1 + taxRate / 100;      // → 1.1165
const priceHt = priceTtc / taxMultiplier;

// Stockage avec précision suffisante
const priceHtStr = priceHt.toFixed(6);        // ex: "11.196591"
```

> **Pourquoi 6 décimales ?** PrestaShop utilise jusqu'à 6 décimales pour les prix afin d'éviter les erreurs d'arrondi sur les calculs de TVA, notamment lors des totaux de commandes multi-produits.

### Où est stocké le taux TVA dans PrestaShop ?

Le taux TVA n'est **pas stocké directement sur le produit**. La chaîne complète est :

```
product.id_tax_rules_group
    └── tax_rule_group (ex: "TVA Madagascar 11.65%")
        └── tax_rule (lie le groupe à un pays et une taxe)
            └── tax.rate = 11.65
```

Pour résoudre le taux depuis un `id_tax_rules_group`, il faut donc :

1. `GET /api/tax_rules?filter[id_tax_rules_group]={id}` → récupère la règle, qui contient `id_tax`
2. `GET /api/taxes?filter[id]={id_tax}` → récupère la taxe, qui contient `rate`

C'est exactement ce que fait la fonction `getTaxRateForGroup()` implémentée dans le projet.

---

## 3. Structure des ressources API

### Ressource : `product`

Représente le produit parent. Champs clés pour les combinaisons :

| Champ | Type | Description |
|---|---|---|
| `id` | int | Identifiant unique |
| `reference` | string | Référence produit (ex: T_01) |
| `price` | decimal | Prix **HT** de base |
| `id_tax_rules_group` | int | Groupe de règles de taxe |
| `product_type` | string | Doit être `standard` pour avoir des combinaisons |
| `state` | int | `1` = actif |

### Ressource : `product_option` (groupe d'attributs)

| Champ | Type | Description |
|---|---|---|
| `id` | int | Identifiant unique |
| `name` | i18n | Nom multilingue (ex: "Taille") |
| `public_name` | i18n | Nom affiché au client |
| `group_type` | string | `select`, `radio`, ou `color` |
| `is_color_group` | bool | `1` si c'est un groupe de couleurs |

### Ressource : `product_option_value` (valeur d'attribut)

| Champ | Type | Description |
|---|---|---|
| `id` | int | Identifiant unique |
| `id_attribute_group` | int | ID du groupe parent |
| `name` | i18n | Nom multilingue (ex: "S", "Rouge") |
| `position` | int | Ordre d'affichage |

### Ressource : `combination`

| Champ | Type | Description |
|---|---|---|
| `id` | int | Identifiant unique |
| `id_product` | int | Produit parent |
| `reference` | string | SKU de cette variante |
| `price` | decimal | **Delta HT** par rapport au prix de base du produit |
| `wholesale_price` | decimal | Prix d'achat HT |
| `weight` | decimal | Delta de poids |
| `minimal_quantity` | int | Quantité minimale de commande |
| `default_on` | bool | `1` = combinaison par défaut |
| `ean13` / `upc` / `isbn` / `mpn` | string | Codes-barres |
| `associations.product_option_values` | array | Les valeurs d'attributs de cette combinaison |

> ⚠️ **`combination.price` est un DELTA, pas un prix absolu.** Voir section 6 pour l'explication complète.

### Ressource : `stock_available`

Créée **automatiquement** par PrestaShop lors de la création d'une combinaison.

| Champ | Type | Description |
|---|---|---|
| `id` | int | Identifiant unique |
| `id_product` | int | Produit parent |
| `id_product_attribute` | int | ID de la combinaison (0 si stock du produit simple) |
| `quantity` | int | Quantité en stock |
| `depends_on_stock` | bool | Gestion avancée de stock |
| `out_of_stock` | int | Comportement si rupture |

---

## 4. Tous les endpoints API concernés

L'API Webservice PrestaShop utilise l'authentification **Basic Auth** : clé API en username, mot de passe vide. Le format d'échange est **XML**.

### Produits

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | Lister tous les produits |
| `GET` | `/api/products/{id}` | Récupérer un produit |
| `GET` | `/api/products?filter[reference]=T_01&display=full` | Chercher par référence |
| `POST` | `/api/products` | Créer un produit |
| `PUT` | `/api/products/{id}` | Mettre à jour un produit |
| `DELETE` | `/api/products/{id}` | Supprimer un produit |

### Groupes d'attributs

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/product_options` | Lister les groupes |
| `GET` | `/api/product_options/{id}` | Récupérer un groupe |
| `POST` | `/api/product_options` | Créer un groupe (ex: "Taille") |
| `PUT` | `/api/product_options/{id}` | Mettre à jour |
| `DELETE` | `/api/product_options/{id}` | Supprimer |

### Valeurs d'attributs

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/product_option_values` | Lister les valeurs |
| `GET` | `/api/product_option_values/{id}` | Récupérer une valeur |
| `POST` | `/api/product_option_values` | Créer une valeur (ex: "S") |
| `PUT` | `/api/product_option_values/{id}` | Mettre à jour |
| `DELETE` | `/api/product_option_values/{id}` | Supprimer |

### Combinaisons

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/combinations` | Lister toutes les combinaisons |
| `GET` | `/api/combinations/{id}` | Récupérer une combinaison |
| `GET` | `/api/combinations?filter[id_product]=42&display=full` | Combinaisons d'un produit |
| `POST` | `/api/combinations` | Créer une combinaison |
| `PUT` | `/api/combinations/{id}` | Mise à jour complète |
| `PATCH` | `/api/combinations/{id}` | Mise à jour partielle |
| `DELETE` | `/api/combinations/{id}` | Supprimer |

### Stock

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stock_availables?filter[id_product]={id}` | Stock d'un produit |
| `GET` | `/api/stock_availables?filter[id_product_attribute]={id}` | Stock d'une combinaison |
| `PUT` | `/api/stock_availables/{id}` | Mise à jour complète du stock |
| `PATCH` | `/api/stock_availables/{id}` | Mise à jour partielle (recommandé) |

### Taxes

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/taxes` | Lister les taxes |
| `GET` | `/api/taxes?filter[rate]=11.65` | Chercher par taux |
| `POST` | `/api/taxes` | Créer une taxe |
| `GET` | `/api/tax_rule_groups` | Lister les groupes de règles |
| `POST` | `/api/tax_rule_groups` | Créer un groupe |
| `GET` | `/api/tax_rules` | Lister les règles |
| `POST` | `/api/tax_rules` | Créer une règle |

---

## 5. Flux complet de création d'un produit avec combinaisons

### Vue d'ensemble

```
[CSV Produits]                     [CSV Combinaisons]
      │                                    │
      ▼                                    ▼
1. ensureCategory()              4. findProductByReference()
2. ensureTaxRuleGroup()          5. ensureProductOption()
3. POST /api/products            6. ensureProductOptionValue()
                                 7. Calcul delta HT
                                 8. POST /api/combinations
                                 9. PATCH /api/stock_availables
```

### Étape 1 — Créer le produit (CSV produits)

```xml
POST /api/products

<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <product>
    <id_category_default><![CDATA[5]]></id_category_default>
    <id_tax_rules_group><![CDATA[3]]></id_tax_rules_group>
    <product_type><![CDATA[standard]]></product_type>
    <reference><![CDATA[T_01]]></reference>
    <price><![CDATA[11.196591]]></price>  <!-- HT = 12.50 / 1.1165 -->
    <state><![CDATA[1]]></state>
    <active><![CDATA[1]]></active>
    <name>
      <language id="1"><![CDATA[Tshirt]]></language>
    </name>
    <link_rewrite>
      <language id="1"><![CDATA[tshirt]]></language>
    </link_rewrite>
  </product>
</prestashop>
```

→ Sauvegarder l'`id` retourné (ex: `42`).

### Étape 2 — Créer le groupe d'attributs

```xml
POST /api/product_options

<prestashop>
  <product_option>
    <group_type><![CDATA[select]]></group_type>
    <is_color_group><![CDATA[0]]></is_color_group>
    <name>
      <language id="1"><![CDATA[taille]]></language>
    </name>
    <public_name>
      <language id="1"><![CDATA[taille]]></public_name>
    </public_name>
  </product_option>
</prestashop>
```

→ Sauvegarder l'`id` du groupe (ex: `3`).

> Dans le code, `ensureProductOption()` vérifie d'abord si le groupe existe déjà avant de le créer.

### Étape 3 — Créer la valeur d'attribut

```xml
POST /api/product_option_values

<prestashop>
  <product_option_value>
    <id_attribute_group><![CDATA[3]]></id_attribute_group>
    <name>
      <language id="1"><![CDATA[ngoza]]></language>
    </name>
    <position><![CDATA[0]]></position>
  </product_option_value>
</prestashop>
```

→ Sauvegarder l'`id` de la valeur (ex: `10`).

### Étape 4 — Créer la combinaison

```xml
POST /api/combinations

<prestashop>
  <combination>
    <id_product><![CDATA[42]]></id_product>
    <price><![CDATA[0.000000]]></price>   <!-- delta = 0 si même prix que le produit de base -->
    <minimal_quantity><![CDATA[1]]></minimal_quantity>
    <associations>
      <product_option_values nodeType="product_option_value" api="product_option_values">
        <product_option_value>
          <id><![CDATA[10]]></id>
        </product_option_value>
      </product_option_values>
    </associations>
  </combination>
</prestashop>
```

→ PrestaShop crée automatiquement un `stock_available` avec `quantity = 0`.
→ Sauvegarder l'`id` de la combinaison (ex: `7`).

### Étape 5 — Mettre à jour le stock

PrestaShop crée le `stock_available` automatiquement. Il faut d'abord le retrouver :

```
GET /api/stock_availables?filter[id_product_attribute]=7&display=full
```

Puis patcher la quantité :

```xml
PATCH /api/stock_availables/{id_stock}

<prestashop>
  <stock_available>
    <id><![CDATA[{id_stock}]]></id>
    <quantity><![CDATA[13]]></quantity>
  </stock_available>
</prestashop>
```

---

## 6. Le prix dans combination.price : la logique du delta

### Principe fondamental

`combination.price` **n'est pas le prix de vente de la combinaison**. C'est un **écart (delta)** par rapport au prix de base HT du produit.

```
prix_final_combinaison_HT = product.price + combination.price
```

PrestaShop applique ensuite la TVA pour obtenir le prix TTC affiché au client :

```
prix_affiché_TTC = (product.price + combination.price) × (1 + taux_TVA)
```

### Exemples concrets avec les données CSV

**Produit T_01 :** `prix_ttc = 12,50`, `taux = 11.65%`

```
product.price (HT) = 12.50 / 1.1165 = 11.196591 HT
```

**Combinaison T_01 / taille / ngoza :** `prix_vente_ttc = 12,50`

```
combo_HT  = 12.50 / 1.1165 = 11.196591
delta_HT  = 11.196591 - 11.196591 = 0.000000
→ combination.price = 0.000000
```

Prix affiché : `(11.196591 + 0) × 1.1165 = 12.50 TTC ✓`

**Combinaison T_01 / taille / kely :** `prix_vente_ttc = 15,00`

```
combo_HT  = 15.00 / 1.1165 = 13.435819
delta_HT  = 13.435819 - 11.196591 = +2.239228
→ combination.price = +2.239228
```

Prix affiché : `(11.196591 + 2.239228) × 1.1165 = 15.00 TTC ✓`

**Combinaison P_01 / couleur / mainty :** `prix_vente_ttc = 23,49`, produit P_01 base `18,99 TTC`

```
product.price (HT) = 18.99 / 1.1165 = 17.007614
combo_HT  = 23.49 / 1.1165 = 21.039139
delta_HT  = 21.039139 - 17.007614 = +4.031525
→ combination.price = +4.031525
```

Prix affiché : `(17.007614 + 4.031525) × 1.1165 = 23.49 TTC ✓`

### Formule générale implémentée

```js
const taxRate        = await getTaxRateForGroup(taxRulesGroupId); // ex: 11.65
const taxMultiplier  = 1 + taxRate / 100;                         // ex: 1.1165

const productBaseHt  = parseFloat(product.price);                 // HT du produit
const comboTtc       = parseFloat(row.prix_vente_ttc);            // TTC du CSV
const comboHt        = comboTtc / taxMultiplier;                  // TTC → HT
const deltaHt        = comboHt - productBaseHt;                   // delta

combination.price    = deltaHt.toFixed(6);                        // stocké en HT
```

### Avantages du delta vs prix absolu

| Approche | Avantage | Inconvénient |
|---|---|---|
| **Delta (choisi)** | Standard PrestaShop, compatible back-office | Si `product.price` change, tous les deltas sont faux |
| **product.price = 0** | Delta = prix absolu, plus simple | Produit affiché sans prix si pas de combinaison choisie |
| **specific_prices** | Prix absolus propres | `id_cart` requis (bizarre), complexité supplémentaire |

---

## 7. Pourquoi pas `specific_prices` ?

`specific_prices` a été envisagé comme alternative pour stocker des prix absolus par combinaison. Voilà pourquoi cette piste a été abandonnée :

### Le champ `id_cart` est requis

```
id_cart   isUnsignedId   ✔️   Cart ID
```

Ce champ obligatoire révèle que `specific_prices` est conçu pour des **prix promotionnels contextuels** (prix pour un panier donné, une période, un client, un groupe). Ce n'est pas un mécanisme de prix de base par combinaison.

Mettre `id_cart = 0` (toutes les paniers) fonctionne techniquement mais est sémantiquement incorrect et potentiellement fragile.

### Les autres champs requis complexifient le payload

```
id_shop       ✔️
id_cart       ✔️
id_currency   ✔️
id_country    ✔️
id_group      ✔️
id_customer   ✔️
from          ✔️  (date de début)
to            ✔️  (date de fin)
```

Tous ces champs à `0` pour "tous" transforment un simple `POST combination` en un payload complexe supplémentaire pour chaque variante.

### Conclusion

Pour un import de catalogue de base, la méthode `combination.price` (delta HT) est la plus propre et la plus alignée avec le fonctionnement natif de PrestaShop.

---

## 8. Gestion du stock

### Comportement automatique de PrestaShop

Lors de la création d'une combinaison via `POST /api/combinations`, PrestaShop génère automatiquement une entrée dans `stock_availables` avec `quantity = 0`. Il ne faut **jamais** créer ce record manuellement.

### Procédure d'initialisation du stock

```
1. POST /api/combinations        → combinationId retourné
2. GET /api/stock_availables
      ?filter[id_product]={productId}
      &filter[id_product_attribute]={combinationId}
      &display=full              → stockId retourné
3. PATCH /api/stock_availables/{stockId}
      <quantity>13</quantity>    → stock mis à jour
```

### Pourquoi PATCH et non PUT ?

`PUT` remplace l'entité entière — il faudrait renvoyer tous les champs. `PATCH` ne met à jour que les champs fournis, ce qui est plus sûr et évite d'écraser accidentellement d'autres données comme `out_of_stock` ou `depends_on_stock`.

### Code implémenté (`patchStockAvailable`)

```js
export async function patchStockAvailable(productId, combinationId, quantity) {
    const response = await getList("stock_availables", {
        display: "full",
        filters: {id_product: productId, id_product_attribute: combinationId},
        limit: "0,1",
    });

    const stockItem = ensureArray(response?.data?.stock_availables?.stock_available ?? [])[0];
    const stockId = getScalarValue(stockItem?.id);
    if (!stockId) return;

    await patchResource("stock_availables", stockId, {
        stock_available: {
            id: stockId,
            quantity: String(quantity),
        },
    });
}
```

---

## 9. Structure des fichiers CSV utilisés

### CSV Produits

```
date_availability_produit,nom,reference,prix_ttc,Taxe,categorie,prix_achat
01/12/2025,Tshirt,T_01,"12,5","11,65%",Akanjo,"8,5"
02/05/2026,Pantalon,P_01,"18,99","11,65%",Akanjo,"14,33"
08/05/2026,Casquette,C_03,5,"5,60%",Accessoire,2
08/05/2026,Montre,M_02,56,"5,60%",Accessoire,40
```

| Colonne | Ressource API | Traitement |
|---|---|---|
| `date_availability_produit` | `product.available_date` | Converti en ISO 8601 |
| `nom` | `product.name` (i18n) | Direct |
| `reference` | `product.reference` | Direct, utilisé comme clé unique |
| `prix_ttc` | `product.price` | Converti en HT : `ttc / (1 + taux)` |
| `Taxe` | `product.id_tax_rules_group` | Résolution via `ensureTaxRuleGroup()` |
| `categorie` | `product.id_category_default` | Résolution via `ensureCategory()` |
| `prix_achat` | `product.wholesale_price` | Converti en HT |

### CSV Combinaisons

```
reference,specificité,karazany,stock_initial,prix_vente_ttc
T_01,taille,ngoza,13,"12,5"
T_01,taille,kely,10,15
P_01,couleur,mainty,5,"23,49"
P_01,couleur,fotsy,3,"18,99"
```

| Colonne | Ressource API | Traitement |
|---|---|---|
| `reference` | Clé de lookup → `findProductByReference()` | Permet de retrouver le produit existant |
| `specificité` | `product_option.name` | Résolution via `ensureProductOption()` |
| `karazany` | `product_option_value.name` | Résolution via `ensureProductOptionValue()` |
| `stock_initial` | `stock_available.quantity` | PATCH après création de la combinaison |
| `prix_vente_ttc` | `combination.price` (delta HT) | Calcul : `(ttc / taxMultiplier) - product.price` |

---

## 10. Code implémenté

### `getTaxRateForGroup()` — Résolution du taux depuis le groupe

Cette fonction est nécessaire dans le flux combinaisons car le CSV combinaisons ne contient pas de colonne `Taxe`. Le taux est récupéré depuis le produit déjà créé.

```js
async function getTaxRateForGroup(taxRulesGroupId) {
    if (!taxRulesGroupId) return 0;

    // Étape 1 : trouver la tax_rule liée au groupe
    const rulesResponse = await getList("tax_rules", {
        display: "full",
        filters: {id_tax_rules_group: String(taxRulesGroupId)},
        limit: "0,1",
    });
    const rule = ensureArray(rulesResponse?.data?.tax_rules?.tax_rule ?? [])[0];
    const taxId = getScalarValue(rule?.id_tax);
    if (!taxId) return 0;

    // Étape 2 : lire le taux depuis la taxe
    const taxResponse = await getList("taxes", {
        display: "full",
        filters: {id: taxId},
        limit: "0,1",
    });
    const tax = ensureArray(taxResponse?.data?.taxes?.tax ?? [])[0];
    return parseFloat(getScalarValue(tax?.rate) ?? "0");
}
```

### `processCombinationRow()` — Traitement complet d'une ligne CSV

```js
export async function processCombinationRow(row) {
    const reference = row?.reference?.trim();
    if (!reference) throw new Error("Reference produit manquante.");

    // 1. Retrouver le produit existant
    const product = await findProductByReference(reference);
    if (!product) throw new Error(`Produit introuvable: ${reference}`);

    const specificity = row?.specificite || row?.["specificité"];
    const variantName = row?.karazany;
    if (!specificity || !variantName) return {skipped: true};

    const productId      = getScalarValue(product?.id);
    const productBaseHt  = parseFloat(getScalarValue(product?.price) ?? "0");
    const taxRulesGroupId = getScalarValue(product?.id_tax_rules_group);

    // 2. Résoudre le taux de taxe depuis le produit
    const taxRate       = await getTaxRateForGroup(taxRulesGroupId);
    const taxMultiplier = 1 + taxRate / 100;

    // 3. Calculer le delta HT
    const comboTtc = parseFloat(parseCsvNumber(row?.prix_vente_ttc, {decimalSeparator: ","}));
    const comboHt  = comboTtc / taxMultiplier;
    const deltaHt  = comboHt - productBaseHt;

    // 4. Assurer le groupe et la valeur d'attribut
    const optionId      = await ensureProductOption(String(specificity).trim());
    const optionValueId = await ensureProductOptionValue(String(variantName).trim(), optionId);

    // 5. Créer la combinaison
    const payload = {
        combination: {
            id_product: productId,
            price: deltaHt.toFixed(6),
            minimal_quantity: "1",
            associations: {
                product_option_values: {
                    product_option_value: [{id: String(optionValueId)}],
                },
            },
        },
    };

    const response     = await createResource("combinations", payload);
    const combinationId = getScalarValue(response?.data?.combination?.id);

    // 6. Mettre à jour le stock initial
    const stockInitial = Number(parseCsvNumber(row?.stock_initial, {decimalSeparator: ","}) || 0);
    if (combinationId && Number.isFinite(stockInitial)) {
        await patchStockAvailable(productId, combinationId, stockInitial);
    }

    return {id: combinationId};
}
```

---

## 11. Récapitulatif des décisions techniques

| Question | Décision | Raison |
|---|---|---|
| Où stocker `stock_initial` ? | `stock_availables` via PATCH | PrestaShop crée le record automatiquement à la création de la combinaison |
| Où stocker `prix_vente_ttc` ? | `combination.price` comme delta HT | Plus simple que `specific_prices`, natif PrestaShop |
| Utiliser `specific_prices` ? | Non | `id_cart` requis, sémantique promotionnelle, complexité inutile |
| Mettre `product.price = 0` ? | Non | Le produit a déjà son prix depuis le CSV produits |
| Format des prix dans l'API ? | HT avec 6 décimales (`toFixed(6)`) | PrestaShop stocke en HT, précision pour éviter erreurs d'arrondi |
| Comment connaître le taux TVA dans le flux combinaisons ? | Via `getTaxRateForGroup()` | Le CSV combinaisons n'a pas de colonne taxe ; on la lit depuis le produit existant |
| PATCH ou PUT pour le stock ? | PATCH | Évite d'écraser les autres champs du stock_available |

---

*Documentation générée le 12 mai 2026 — PrestaShop 8 Webservice API*

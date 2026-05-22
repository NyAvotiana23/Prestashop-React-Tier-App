# PrestaShop Products API (Webservice)

This document describes the Products resource. The same request patterns apply to other resources listed in the project data (see src/constants/apiData.js).

## Base variables

- `{{webservice_url}}` = PrestaShop host (example: `http://localhost/prestashop`)
- `{{webservice_key}}` = PrestaShop Webservice key
- `{{product_id}}` = Product ID

## Authentication

Basic auth with the webservice key as the username and an empty password.

## Endpoints

### Get all products

- Method: `GET`
- URL: `{{webservice_url}}/api/products`

### Get product blank schema

- Method: `GET`
- URL: `{{webservice_url}}/api/products?schema=blank`

### Get product synopsis schema

- Method: `GET`
- URL: `{{webservice_url}}/api/products?schema=synopsis`

### Create product

- Method: `POST`
- URL: `{{webservice_url}}/api/products`
- Body (XML):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
<product>
	<id_manufacturer><![CDATA[1]]></id_manufacturer>
	<id_supplier><![CDATA[1]]></id_supplier>
	<id_category_default><![CDATA[1]]></id_category_default>
	<new><![CDATA[1]]></new>
	<cache_default_attribute><![CDATA[1]]></cache_default_attribute>
	<id_default_image><![CDATA[1]]></id_default_image>
	<id_default_combination><![CDATA[1]]></id_default_combination>
	<id_tax_rules_group><![CDATA[1]]></id_tax_rules_group>
	<type><![CDATA[1]]></type>
	<id_shop_default><![CDATA[1]]></id_shop_default>
	<reference><![CDATA[123456]]></reference>
	<supplier_reference><![CDATA[ABCDEF]]></supplier_reference>
	<location><![CDATA[123]]></location>
	<width><![CDATA[12]]></width>
	<height><![CDATA[24]]></height>
	<depth><![CDATA[36]]></depth>
	<weight><![CDATA[48]]></weight>
	<quantity_discount><![CDATA[0]]></quantity_discount>
	<ean13><![CDATA[1231231231231]]></ean13>
	<isbn><![CDATA[]]></isbn>
	<upc><![CDATA[]]></upc>
	<mpn><![CDATA[123456]]></mpn>
	<cache_is_pack><![CDATA[0]]></cache_is_pack>
	<cache_has_attachments><![CDATA[0]]></cache_has_attachments>
	<is_virtual><![CDATA[]]></is_virtual>
	<state><![CDATA[1]]></state>
	<additional_delivery_times><![CDATA[]]></additional_delivery_times>
	<delivery_in_stock><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></delivery_in_stock>
	<delivery_out_stock><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></delivery_out_stock>
	<product_type><![CDATA[standard]]></product_type>
	<on_sale><![CDATA[0]]></on_sale>
	<online_only><![CDATA[0]]></online_only>
	<ecotax><![CDATA[0]]></ecotax>
	<minimal_quantity><![CDATA[0]]></minimal_quantity>
	<low_stock_threshold><![CDATA[0]]></low_stock_threshold>
	<low_stock_alert><![CDATA[0]]></low_stock_alert>
	<price><![CDATA[123.45]]></price>
	<wholesale_price><![CDATA[200]]></wholesale_price>
	<unity><![CDATA[]]></unity>
	<unit_price><![CDATA[123.45]]></unit_price>
	<unit_price_ratio><![CDATA[]]></unit_price_ratio>
	<additional_shipping_cost><![CDATA[]]></additional_shipping_cost>
	<customizable><![CDATA[]]></customizable>
	<text_fields><![CDATA[]]></text_fields>
	<uploadable_files><![CDATA[]]></uploadable_files>
	<active><![CDATA[1]]></active>
	<redirect_type><![CDATA[]]></redirect_type>
	<id_type_redirected><![CDATA[]]></id_type_redirected>
	<available_for_order><![CDATA[1]]></available_for_order>
	<available_date><![CDATA[]]></available_date>
	<show_condition><![CDATA[]]></show_condition>
	<condition><![CDATA[]]></condition>
	<show_price><![CDATA[]]></show_price>
	<indexed><![CDATA[]]></indexed>
	<visibility><![CDATA[]]></visibility>
	<advanced_stock_management><![CDATA[]]></advanced_stock_management>
	<pack_stock_type><![CDATA[]]></pack_stock_type>
	<meta_description><language id="1"><![CDATA[Description]]></language><language id="2"><![CDATA[Description]]></language></meta_description>
	<meta_keywords><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></meta_keywords>
	<meta_title><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></meta_title>
	<link_rewrite><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></link_rewrite>
	<name><language id="1"><![CDATA[Product Name]]></language><language id="2"><![CDATA[Product Name]]></language></name>
	<description><language id="1"><![CDATA[Description]]></language><language id="2"><![CDATA[Description]]></language></description>
	<description_short><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></description_short>
	<available_now><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></available_now>
	<available_later><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></available_later>
<associations>
<categories>
	<category>
	<id><![CDATA[1]]></id>
	</category>
</categories>
<images>
	<image>
	<id><![CDATA[1]]></id>
	</image>
</images>
</associations>
</product>
</prestashop>
```

### Get product

- Method: `GET`
- URL: `{{webservice_url}}/api/products/{{product_id}}`

### Update product (complete)

- Method: `PUT`
- URL: `{{webservice_url}}/api/products/{{product_id}}`
- Body (XML):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
<product>
    <id>{{product_id}}</id>
	<id_manufacturer><![CDATA[1]]></id_manufacturer>
	<id_supplier><![CDATA[1]]></id_supplier>
	<id_category_default><![CDATA[1]]></id_category_default>
	<new><![CDATA[1]]></new>
	<cache_default_attribute><![CDATA[1]]></cache_default_attribute>
	<id_default_image><![CDATA[1]]></id_default_image>
	<id_default_combination><![CDATA[1]]></id_default_combination>
	<id_tax_rules_group><![CDATA[1]]></id_tax_rules_group>
	<type><![CDATA[1]]></type>
	<id_shop_default><![CDATA[1]]></id_shop_default>
	<reference><![CDATA[123456]]></reference>
	<supplier_reference><![CDATA[ABCDEF]]></supplier_reference>
	<location><![CDATA[123]]></location>
	<width><![CDATA[12]]></width>
	<height><![CDATA[24]]></height>
	<depth><![CDATA[36]]></depth>
	<weight><![CDATA[48]]></weight>
	<quantity_discount><![CDATA[0]]></quantity_discount>
	<ean13><![CDATA[1231231231231]]></ean13>
	<isbn><![CDATA[]]></isbn>
	<upc><![CDATA[]]></upc>
	<mpn><![CDATA[123456]]></mpn>
	<cache_is_pack><![CDATA[0]]></cache_is_pack>
	<cache_has_attachments><![CDATA[0]]></cache_has_attachments>
	<is_virtual><![CDATA[]]></is_virtual>
	<state><![CDATA[1]]></state>
	<additional_delivery_times><![CDATA[]]></additional_delivery_times>
	<delivery_in_stock><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></delivery_in_stock>
	<delivery_out_stock><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></delivery_out_stock>
	<product_type><![CDATA[standard]]></product_type>
	<on_sale><![CDATA[0]]></on_sale>
	<online_only><![CDATA[0]]></online_only>
	<ecotax><![CDATA[0]]></ecotax>
	<minimal_quantity><![CDATA[0]]></minimal_quantity>
	<low_stock_threshold><![CDATA[0]]></low_stock_threshold>
	<low_stock_alert><![CDATA[0]]></low_stock_alert>
	<price><![CDATA[123.45]]></price>
	<wholesale_price><![CDATA[200]]></wholesale_price>
	<unity><![CDATA[]]></unity>
	<unit_price><![CDATA[123.45]]></unit_price>
	<unit_price_ratio><![CDATA[]]></unit_price_ratio>
	<additional_shipping_cost><![CDATA[]]></additional_shipping_cost>
	<customizable><![CDATA[]]></customizable>
	<text_fields><![CDATA[]]></text_fields>
	<uploadable_files><![CDATA[]]></uploadable_files>
	<active><![CDATA[1]]></active>
	<redirect_type><![CDATA[]]></redirect_type>
	<id_type_redirected><![CDATA[]]></id_type_redirected>
	<available_for_order><![CDATA[1]]></available_for_order>
	<available_date><![CDATA[]]></available_date>
	<show_condition><![CDATA[]]></show_condition>
	<condition><![CDATA[]]></condition>
	<show_price><![CDATA[]]></show_price>
	<indexed><![CDATA[]]></indexed>
	<visibility><![CDATA[]]></visibility>
	<advanced_stock_management><![CDATA[]]></advanced_stock_management>
	<pack_stock_type><![CDATA[]]></pack_stock_type>
	<meta_description><language id="1"><![CDATA[Description]]></language><language id="2"><![CDATA[Description]]></language></meta_description>
	<meta_keywords><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></meta_keywords>
	<meta_title><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></meta_title>
	<link_rewrite><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></link_rewrite>
	<name><language id="1"><![CDATA[Product Name]]></language><language id="2"><![CDATA[Product Name]]></language></name>
	<description><language id="1"><![CDATA[Description]]></language><language id="2"><![CDATA[Description]]></language></description>
	<description_short><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></description_short>
	<available_now><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></available_now>
	<available_later><language id="1"><![CDATA[]]></language><language id="2"><![CDATA[]]></language></available_later>
<associations>
<categories>
	<category>
	<id><![CDATA[1]]></id>
	</category>
</categories>
<images>
	<image>
	<id><![CDATA[1]]></id>
	</image>
</images>
</associations>
</product>
</prestashop>
```

### Update product (partial)

- Method: `PATCH`
- URL: `{{webservice_url}}/api/products/{{product_id}}`
- Body (XML):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <product>
        <id><![CDATA[{{product_id}}]]></id>
	    <name>
            <language id="1"><![CDATA[Product Name updated]]></language>
            <language id="2"><![CDATA[Product Name updated]]></language>
        </name>
    </product>
</prestashop>
```

### Delete product

- Method: `DELETE`
- URL: `{{webservice_url}}/api/products/{{product_id}}`
- Body (XML):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <product>
        <id><![CDATA[{{product_id}}]]></id>
    </product>
</prestashop>
```

## CSV import mapping

The CSV import mapping for products is documented in `docs/csv-import.md` and implemented in `src/csv/csvProductMapping.js`.

# PrestaShop 8.2.6 — Webservice API : Specific Prices (prix spécifiques)

> **Source officielle :** [devdocs.prestashop-project.org — Specific prices](https://devdocs.prestashop-project.org/9/webservice/tutorials/advanced-use/specific-price/)  
> Compatible PrestaShop 8.x / 9.x — Webservice REST (XML)

---

## Sommaire

1. [Principe général](#1-principe-général)
2. [Syntaxe de base](#2-syntaxe-de-base)
3. [Paramètres disponibles](#3-paramètres-disponibles)
4. [Exemples détaillés par cas d'usage](#4-exemples-détaillés-par-cas-dusage)
    - 4.1 [Prix simple d'un produit](#41-prix-simple-dun-produit)
    - 4.2 [Prix d'une combinaison (product_attribute)](#42-prix-dune-combinaison-product_attribute)
    - 4.3 [Prix TTC et HT en même temps](#43-prix-ttc-et-ht-en-même-temps)
    - 4.4 [Prix avec réduction incluse et montant de réduction seul](#44-prix-avec-réduction-incluse-et-montant-de-réduction-seul)
    - 4.5 [Montant de réduction uniquement (only_reduction)](#45-montant-de-réduction-uniquement-only_reduction)
    - 4.6 [Prix par pays (country)](#46-prix-par-pays-country)
    - 4.7 [Prix par devise (currency)](#47-prix-par-devise-currency)
    - 4.8 [Prix par groupe client (group)](#48-prix-par-groupe-client-group)
    - 4.9 [Prix en fonction de la quantité (quantity)](#49-prix-en-fonction-de-la-quantité-quantity)
    - 4.10 [Prix avec eco-taxe (use_ecotax)](#410-prix-avec-eco-taxe-use_ecotax)
    - 4.11 [Prix avec nombre de décimales personnalisé (decimals)](#411-prix-avec-nombre-de-décimales-personnalisé-decimals)
    - 4.12 [Combinaison de plusieurs filtres](#412-combinaison-de-plusieurs-filtres)
    - 4.13 [Prix spécifique sur une combinaison (combinations endpoint)](#413-prix-spécifique-sur-une-combinaison-combinations-endpoint)
    - 4.14 [Requête multi-prix dans le même appel](#414-requête-multi-prix-dans-le-même-appel)
5. [Structure de la réponse XML](#5-structure-de-la-réponse-xml)
6. [Récupérer les ID nécessaires](#6-récupérer-les-id-nécessaires)
7. [Notes importantes et limites](#7-notes-importantes-et-limites)

---

## 1. Principe général

Par défaut, l'API Webservice de PrestaShop ne retourne que le **prix générique** d'un produit (le prix de base sans prise en compte des règles de prix spécifiques, des taxes, des réductions, etc.).

Pour obtenir un **prix calculé** (prix réel affiché en boutique, tenant compte des taxes, remises, groupes clients, combinaisons…), il faut utiliser le paramètre spécial `price[alias][parametre]` dans la query string.

Ce paramètre est disponible sur deux ressources :
- `/api/products/{id}` — produits simples et produits avec déclinaisons
- `/api/combinations/{id}` — déclinaisons (combinaisons) directement

L'alias (`my_price`, `price_ttc`, etc.) est **libre** : il devient le nom du nœud XML ajouté dans la réponse.

---

## 2. Syntaxe de base

```
/api/products/{id_produit}?price[ALIAS][PARAMETRE]=VALEUR
```

Plusieurs paramètres pour le même alias :
```
/api/products/{id}?price[ALIAS][param1]=val1&price[ALIAS][param2]=val2
```

Plusieurs alias dans le même appel :
```
/api/products/{id}?price[ALIAS1][param]=val&price[ALIAS2][param]=val
```

---

## 3. Paramètres disponibles

| Paramètre | Type | Valeurs | Description |
|---|---|---|---|
| `country` | int | ID ressource | Pays du client (ID de `/api/countries`) |
| `state` | int | ID ressource | État/région du client (ID de `/api/states`) |
| `postcode` | int | Code postal | Code postal/zip du client |
| `currency` | int | ID ressource | Devise utilisée (ID de `/api/currencies`) |
| `group` | int | ID ressource | Groupe client (ID de `/api/groups`) |
| `quantity` | int | ≥ 1 | Quantité commandée (pour les dégressifs) |
| `product_attribute` | int | ID combinaison | ID de la déclinaison/combinaison du produit |
| `decimals` | int | ≥ 0 | Nombre de décimales pour l'arrondi |
| `use_tax` | bool | `0` ou `1` | Inclure les taxes dans le prix retourné |
| `use_reduction` | bool | `0` ou `1` | Inclure la réduction dans le prix retourné |
| `only_reduction` | bool | `0` ou `1` | Retourner uniquement le montant de la réduction |
| `use_ecotax` | bool | `0` ou `1` | Inclure l'éco-taxe dans le prix |

> **Note :** Tous les paramètres sont optionnels et combinables librement.

---

## 4. Exemples détaillés par cas d'usage

### 4.1 Prix simple d'un produit

**Objectif :** Obtenir le prix hors taxes du produit 5, sans réduction, sans alias particulier.

```
GET /api/products/5?price[prix_ht][use_tax]=0
```

**Réponse XML (extrait) :**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id><![CDATA[5]]></id>
    <prix_ht><![CDATA[24.990000]]></prix_ht>
    <!-- ... autres champs du produit ... -->
  </product>
</prestashop>
```

---

### 4.2 Prix d'une combinaison (product_attribute)

**Contexte :** Un produit (ex: T-shirt) a plusieurs déclinaisons (taille S, M, L). Chaque déclinaison a un ID de combination. Pour connaître l'ID, on interroge `/api/combinations` ou on lit les associations du produit.

**Objectif :** Prix TTC de la combinaison ID 25 du produit 2.

```
GET /api/products/2?price[my_price][use_tax]=1&price[my_price][product_attribute]=25
```

**Réponse XML :**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id><![CDATA[2]]></id>
    <my_price><![CDATA[34.460000]]></my_price>
  </product>
</prestashop>
```

**Récupérer les combinaisons d'un produit :**
```
GET /api/products/2?display=[id,associations]
```
Les associations listeront les `id` des combinaisons. Ensuite :
```
GET /api/combinations/25
```
Cela retourne les détails (référence, poids, prix de la combinaison, options associées…).

---

### 4.3 Prix TTC et HT en même temps

**Objectif :** Récupérer deux prix dans la même requête pour éviter deux appels API.

```
GET /api/products/2?price[prix_ttc][use_tax]=1&price[prix_ht][use_tax]=0
```

**Réponse XML :**
```xml
<product>
  <id><![CDATA[2]]></id>
  <prix_ttc><![CDATA[34.460000]]></prix_ttc>
  <prix_ht><![CDATA[28.716667]]></prix_ht>
</product>
```

> Très utile pour afficher simultanément les deux prix dans une application ou un ERP.

---

### 4.4 Prix avec réduction incluse et montant de réduction seul

**Objectif :** Obtenir le prix final après réduction ET savoir quel est le montant de la réduction.

```
GET /api/products/2?price[prix_reduit][use_tax]=1&price[prix_reduit][use_reduction]=1&price[montant_reduction][only_reduction]=1
```

**Réponse XML :**
```xml
<product>
  <id><![CDATA[2]]></id>
  <prix_reduit><![CDATA[27.570000]]></prix_reduit>
  <montant_reduction><![CDATA[6.890000]]></montant_reduction>
</product>
```

---

### 4.5 Montant de réduction uniquement (only_reduction)

**Objectif :** Connaître uniquement le montant de la remise applicable (utile pour afficher un badge "Économisez X€").

```
GET /api/products/3?price[remise][only_reduction]=1&price[remise][use_tax]=1
```

**Réponse XML :**
```xml
<product>
  <id><![CDATA[3]]></id>
  <remise><![CDATA[5.000000]]></remise>
</product>
```

> Si aucune réduction n'est définie, la valeur retournée sera `0.000000`.

---

### 4.6 Prix par pays (country)

**Objectif :** Calculer le prix pour un client situé en France (ID pays = 8 sur une installation standard).

```
GET /api/products/5?price[prix_france][use_tax]=1&price[prix_france][country]=8
```

**Réponse XML :**
```xml
<product>
  <id><![CDATA[5]]></id>
  <prix_france><![CDATA[35.880000]]></prix_france>
</product>
```

> L'ID du pays se récupère via `GET /api/countries`.

---

### 4.7 Prix par devise (currency)

**Objectif :** Obtenir le prix converti en dollars américains (currency ID = 2 généralement).

```
GET /api/products/5?price[prix_usd][use_tax]=0&price[prix_usd][currency]=2
```

**Réponse XML :**
```xml
<product>
  <id><![CDATA[5]]></id>
  <prix_usd><![CDATA[27.490000]]></prix_usd>
</product>
```

> L'ID de la devise se récupère via `GET /api/currencies`.

---

### 4.8 Prix par groupe client (group)

**Objectif :** Calculer le prix pour les clients du groupe "Grossiste" (ex: group ID = 4).

```
GET /api/products/5?price[prix_grossiste][use_tax]=0&price[prix_grossiste][group]=4&price[prix_grossiste][use_reduction]=1
```

**Réponse XML :**
```xml
<product>
  <id><![CDATA[5]]></id>
  <prix_grossiste><![CDATA[18.990000]]></prix_grossiste>
</product>
```

> L'ID du groupe se récupère via `GET /api/groups`.  
> Les groupes par défaut dans PrestaShop : 1 = Visiteur, 2 = Invité, 3 = Client.

---

### 4.9 Prix en fonction de la quantité (quantity)

**Objectif :** Vérifier le prix unitaire si on commande 10 unités (dégressif/palier de prix).

```
GET /api/products/5?price[prix_qte10][use_tax]=1&price[prix_qte10][quantity]=10&price[prix_qte10][use_reduction]=1
```

**Réponse XML :**
```xml
<product>
  <id><![CDATA[5]]></id>
  <prix_qte10><![CDATA[21.500000]]></prix_qte10>
</product>
```

> Si aucune règle de prix dégressif n'est configurée pour ce palier, le prix normal est retourné.

---

### 4.10 Prix avec eco-taxe (use_ecotax)

**Objectif :** Inclure l'éco-taxe dans le calcul du prix final.

```
GET /api/products/7?price[prix_ecotax][use_tax]=1&price[prix_ecotax][use_ecotax]=1
```

**Réponse XML :**
```xml
<product>
  <id><![CDATA[7]]></id>
  <prix_ecotax><![CDATA[42.300000]]></prix_ecotax>
</product>
```

---

### 4.11 Prix avec nombre de décimales personnalisé (decimals)

**Objectif :** Arrondir le prix retourné à 2 décimales.

```
GET /api/products/5?price[prix_arrondi][use_tax]=1&price[prix_arrondi][decimals]=2
```

**Réponse XML :**
```xml
<product>
  <id><![CDATA[5]]></id>
  <prix_arrondi><![CDATA[34.460000]]></prix_arrondi>
</product>
```

> Attention : le résultat peut toujours avoir des zéros de fin (pending zeros), mais l'arrondi respecte le nombre de décimales demandé.

---

### 4.12 Combinaison de plusieurs filtres

**Objectif :** Prix TTC de la combinaison 12, pour un client du groupe 4, en France (country=8), pour une quantité de 5.

```
GET /api/products/3
  ?price[prix_complet][use_tax]=1
  &price[prix_complet][product_attribute]=12
  &price[prix_complet][country]=8
  &price[prix_complet][group]=4
  &price[prix_complet][quantity]=5
  &price[prix_complet][use_reduction]=1
```

**(En une seule ligne URL) :**
```
/api/products/3?price[prix_complet][use_tax]=1&price[prix_complet][product_attribute]=12&price[prix_complet][country]=8&price[prix_complet][group]=4&price[prix_complet][quantity]=5&price[prix_complet][use_reduction]=1
```

**Réponse XML :**
```xml
<product>
  <id><![CDATA[3]]></id>
  <prix_complet><![CDATA[19.800000]]></prix_complet>
</product>
```

---

### 4.13 Prix spécifique sur une combinaison (combinations endpoint)

Le paramètre `price` fonctionne aussi directement sur l'endpoint `/api/combinations`.

**Objectif :** Récupérer le prix TTC de la combinaison 25 directement (sans passer par le produit parent).

```
GET /api/combinations/25?price[combo_price][use_tax]=1
```

**Réponse XML :**
```xml
<combination>
  <id><![CDATA[25]]></id>
  <id_product><![CDATA[2]]></id_product>
  <combo_price><![CDATA[34.460000]]></combo_price>
  <!-- ... autres champs ... -->
</combination>
```

---

### 4.14 Requête multi-prix dans le même appel

**Objectif :** Obtenir en une seule requête : prix HT, prix TTC, réduction seule, prix TTC pour la combinaison 25.

```
GET /api/products/2
  ?price[ht][use_tax]=0
  &price[ttc][use_tax]=1
  &price[remise][only_reduction]=1&price[remise][use_tax]=1
  &price[combi_ttc][use_tax]=1&price[combi_ttc][product_attribute]=25
```

**Réponse XML :**
```xml
<product>
  <id><![CDATA[2]]></id>
  <ht><![CDATA[28.716667]]></ht>
  <ttc><![CDATA[34.460000]]></ttc>
  <remise><![CDATA[6.890000]]></remise>
  <combi_ttc><![CDATA[34.460000]]></combi_ttc>
</product>
```

---

## 5. Structure de la réponse XML

Chaque alias défini est ajouté comme **nœud XML** dans la réponse standard du produit ou de la combinaison. La réponse contient tous les champs habituels du produit **plus** les nœuds de prix demandés.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id><![CDATA[2]]></id>
    <name>
      <language id="1"><![CDATA[T-Shirt Exemple]]></language>
    </name>
    <price><![CDATA[28.716667]]></price>   <!-- prix générique brut -->
    <!-- Nœuds ajoutés par le paramètre price[] : -->
    <mon_alias_1><![CDATA[34.460000]]></mon_alias_1>
    <mon_alias_2><![CDATA[28.716667]]></mon_alias_2>
  </product>
</prestashop>
```

---

## 6. Récupérer les ID nécessaires

| Besoin | Endpoint | Champ utile |
|---|---|---|
| ID des pays | `GET /api/countries` | `id`, `name` |
| ID des devises | `GET /api/currencies` | `id`, `iso_code` |
| ID des groupes clients | `GET /api/groups` | `id`, `name` |
| ID des combinaisons | `GET /api/combinations?filter[id_product]=[X]` | `id`, `reference` |
| ID des états/régions | `GET /api/states` | `id`, `name` |

**Exemple : lister les combinaisons du produit 2**
```
GET /api/combinations?filter[id_product]=[2]&display=[id,reference,price]
```

Réponse :
```xml
<combinations>
  <combination id="25" xlink:href="...">
    <id><![CDATA[25]]></id>
    <reference><![CDATA[TSHIRT-M-BLUE]]></reference>
    <price><![CDATA[0.000000]]></price>
  </combination>
  <combination id="26" xlink:href="...">
    <id><![CDATA[26]]></id>
    <reference><![CDATA[TSHIRT-L-BLUE]]></reference>
    <price><![CDATA[2.000000]]></price>
  </combination>
</combinations>
```

> Le champ `price` d'une combinaison est un **impact de prix** (positif ou négatif) ajouté au prix de base du produit parent, pas un prix absolu.

---

## 7. Notes importantes et limites

### L'alias est libre mais doit être unique dans la requête
Si vous utilisez le même alias avec des paramètres différents, la dernière valeur écrase les précédentes.

```
# ❌ Mauvais : les paramètres du 2e bloc écrasent le 1er
/api/products/2?price[p][use_tax]=1&price[p][use_tax]=0

# ✅ Bon : deux alias distincts
/api/products/2?price[ttc][use_tax]=1&price[ht][use_tax]=0
```

### Le prix de la combinaison est un impact, pas un prix absolu
Dans PrestaShop, `combinations.price` est un **delta** par rapport au prix du produit parent. Le vrai prix de la combinaison = `product.price + combination.price`. Le paramètre `price[]` sur l'API calcule ce total automatiquement.

### Comportement sans réduction définie
Si `use_reduction=1` mais qu'aucune réduction spécifique n'est configurée pour ce produit/groupe/pays, le prix retourné est le prix normal (la réduction est 0).

### Prix calculé = prix PrestaShop réel
Le calcul effectué est identique à celui de la boutique. Le résultat intègre les règles de prix spécifiques, les règles de catalogue, les groupes, et les taxes configurées dans le back-office.

### Authentification requise
Tous les appels nécessitent une clé API Webservice valide :
```
GET https://monsite.com/api/products/2?price[ttc][use_tax]=1
Authorization: Basic BASE64(CLE_API:)
```
Ou via l'URL :
```
https://CLE_API@monsite.com/api/products/2?price[ttc][use_tax]=1
```

### Compatibilité
- Compatible PrestaShop 1.7, 8.x et 9.x
- Le paramètre `price[]` est propre à l'API Webservice legacy (REST/XML), pas à la nouvelle Admin API OAuth2

---

*Documentation rédigée à partir de la [documentation officielle PrestaShop](https://devdocs.prestashop-project.org/9/webservice/tutorials/advanced-use/specific-price/) — Mai 2026*
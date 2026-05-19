# PrestaShop 8 — Stock Movements (stock_movements)

## FR

Ce guide decrit le payload utilise par l'app pour les mouvements de stock.

### Champs clefs

- `sign`: direction du mouvement (`1` entree, `-1` sortie).
- `physical_quantity`: quantite absolue (toujours positive).
- `price_te`: prix unitaire HT au moment du mouvement (6 decimales).

### Particularite de l'app

L'implementation courante utilise l'ID issu de `stock_availables` comme `id_stock` lors des `stock_movements`.

```
getList("stock_availables") -> stock_available.id -> id_stock
```

Cela fonctionne dans le contexte actuel du projet, mais si l'ASM (Advanced Stock Management) est active, PrestaShop peut exiger un `id_stock` venant de `ps_stock`. Verifier le comportement selon votre instance.

### Exemple minimal (entree de 5)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <stock_movement>
	<id_employee><![CDATA[1]]></id_employee>
	<id_stock><![CDATA[3]]></id_stock>
	<id_stock_mvt_reason><![CDATA[1]]></id_stock_mvt_reason>
	<physical_quantity><![CDATA[5]]></physical_quantity>
	<sign><![CDATA[1]]></sign>
	<price_te><![CDATA[0.000000]]></price_te>
	<date_add><![CDATA[2026-05-16 10:00:00]]></date_add>
  </stock_movement>
</prestashop>
```

### Regles `price_te`

- Entree stock: cout unitaire HT.
- Sortie stock: `0.000000` est acceptable.

## EN

This guide describes the payload used by the app for stock movements.

### Key fields

- `sign`: movement direction (`1` in, `-1` out).
- `physical_quantity`: absolute quantity (always positive).
- `price_te`: unit cost price (tax excluded, 6 decimals).

### App-specific behavior

The current implementation uses the `stock_availables` id as `id_stock` when creating `stock_movements`:

```
getList("stock_availables") -> stock_available.id -> id_stock
```

This works for the current setup, but if Advanced Stock Management is enabled, PrestaShop may require a `ps_stock` id instead. Validate against your instance.

### Minimal example (stock in +5)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <stock_movement>
	<id_employee><![CDATA[1]]></id_employee>
	<id_stock><![CDATA[3]]></id_stock>
	<id_stock_mvt_reason><![CDATA[1]]></id_stock_mvt_reason>
	<physical_quantity><![CDATA[5]]></physical_quantity>
	<sign><![CDATA[1]]></sign>
	<price_te><![CDATA[0.000000]]></price_te>
	<date_add><![CDATA[2026-05-16 10:00:00]]></date_add>
  </stock_movement>
</prestashop>
```

### `price_te` rules

- Stock IN: actual unit cost (tax excluded).
- Stock OUT: `0.000000` is acceptable.

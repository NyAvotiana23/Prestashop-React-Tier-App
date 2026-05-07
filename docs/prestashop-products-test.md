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

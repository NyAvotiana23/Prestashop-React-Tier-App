# PrestaShop specific protections and API notes

## Deletion protections

| Model    | Deletion behavior      | Condition for full delete                  | If condition not met         |
|----------|------------------------|--------------------------------------------|------------------------------|
| Cart     | Strong protection      | `!$this->orderExists()`                    | Returns false (blocked)      |
| Address  | Smart delete           | `!$this->isUsed()` (not used in any Order) | Soft delete (`softDelete()`) |
| Carrier  | Smart delete           | `!$this->isUsed()`                         | Soft delete                  |
| Currency | Protected              | Not the default currency + not used        | Blocked or soft delete       |
| State    | Protected              | `!$this->isUsed()`                         | Blocked (return false)       |
| Product  | Very strong protection | No physical stock + no supply orders       | Blocked (return false)       |

## Resource method exceptions

Most resources are available through standard REST methods (GET, POST, PUT, DELETE, HEAD). The exceptions are:

| Resource                       | GET | POST | PUT | PATCH | DELETE | HEAD |
|--------------------------------|-----|------|-----|-------|--------|------|
| search                         | ✅   |      |     |       |        | ✅    |
| stock_availables               | ✅   |      | ✅   | ✅     |        | ✅    |
| stock_movements                | ✅   |      |     |       |        | ✅    |
| stocks                         | ✅   |      |     |       |        | ✅    |
| supply_order_details           | ✅   |      |     |       |        | ✅    |
| supply_order_histories         | ✅   |      |     |       |        | ✅    |
| supply_order_receipt_histories | ✅   |      |     |       |        | ✅    |
| supply_order_states            | ✅   |      |     |       |        | ✅    |
| supply_orders                  | ✅   |      |     |       |        | ✅    |
| warehouse_product_locations    | ✅   |      |     |       |        | ✅    |
| warehouses                     | ✅   | ✅    | ✅   | ✅     |        | ✅    |

## Schema modes

All resources expose two schema modes via query parameters:

- `?schema=blank`: blank XML tree for the resource.
- `?schema=synopsis`: blank XML tree with expected formats, required flags, and max sizes.

## Available resources

| Resource                       | Description                                                                                                             |
|--------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| addresses                      | The Customer, Manufacturer and Customer addresses                                                                       |
| attachments                    | The product Attachments                                                                                                 |
| attachments/file               | The product Attachments files                                                                                           |
| carriers                       | The Carriers that perform deliveries                                                                                    |
| cart_rules                     | Cart rules management (discount, promotions, ...)                                                                       |
| carts                          | Customer's carts                                                                                                        |
| categories                     | The product categories                                                                                                  |
| combinations                   | The product combinations                                                                                                |
| configurations                 | Shop configuration, used to store miscellaneous parameters from the shop (maintenance, multi shop, email settings, ...) |
| contacts                       | Shop contacts                                                                                                           |
| content_management_system      | Content management system                                                                                               |
| countries                      | The countries available on the shop                                                                                     |
| currencies                     | The currencies installed on the shop                                                                                    |
| customer_messages              | Customer services messages                                                                                              |
| customer_threads               | Customer services threads                                                                                               |
| customers                      | The e-shop's customers                                                                                                  |
| customizations                 | The product customizations                                                                                              |
| deliveries                     | Product deliveries                                                                                                      |
| employees                      | The Employees                                                                                                           |
| groups                         | The customer's groups                                                                                                   |
| guests                         | The guests (customers not logged in)                                                                                    |
| image_types                    | The image types                                                                                                         |
| images                         | The images                                                                                                              |
| images/general/header          | The shop's logo in the header                                                                                           |
| images/general/mail            | The shop's logo in the e-mails                                                                                          |
| images/general/invoice         | The shop's logo in the invoice                                                                                          |
| images/general/store_icon      | The shop's logo as a favicon                                                                                            |
| images/products                | The products images                                                                                                     |
| images/categories              | The categories images                                                                                                   |
| images/manufacturers           | The manufacturers images                                                                                                |
| images/suppliers               | The suppliers images                                                                                                    |
| images/stores                  | The stores images                                                                                                       |
| images/customizations          | The customizations images                                                                                               |
| languages                      | Shop languages                                                                                                          |
| manufacturers                  | The product manufacturers                                                                                               |
| messages                       | The customers messages                                                                                                  |
| order_carriers                 | The order carriers                                                                                                      |
| order_details                  | Details of an order                                                                                                     |
| order_histories                | The Order histories                                                                                                     |
| order_invoices                 | The Order invoices                                                                                                      |
| order_payments                 | The Order payments                                                                                                      |
| order_slip                     | The Order slips (used for refund)                                                                                       |
| order_states                   | The Order states (Waiting for transfer, Payment accepted, ...)                                                          |
| orders                         | The Customers orders                                                                                                    |
| price_ranges                   | Price range                                                                                                             |
| product_customization_fields   | The Product customization fields                                                                                        |
| product_feature_values         | The product feature values (Ceramic, Polyester, ... - Removable cover, Short sleeves, ...)                              |
| product_features               | The product features (Composition, Property, ...)                                                                       |
| product_option_values          | The product options value (S, M, L, ... - White, Camel, ...)                                                            |
| product_options                | The product options (Size, Color, ...)                                                                                  |
| product_suppliers              | Product Suppliers                                                                                                       |
| products                       | The products                                                                                                            |
| search                         | Search                                                                                                                  |
| shop_groups                    | Shop groups from multi-shop feature                                                                                     |
| shop_urls                      | Shop urls from multi-shop feature                                                                                       |
| shops                          | Shops from multi-shop feature                                                                                           |
| specific_price_rules           | Specific price rules management                                                                                         |
| specific_prices                | Specific price management                                                                                               |
| states                         | The available states of countries                                                                                       |
| stock_availables               | Available quantities of products                                                                                        |
| stock_movement_reasons         | The stock movement reason (Increase, Decrease, Custom Order, ...)                                                       |
| stock_movements                | Stock movements management                                                                                              |
| stocks                         | Stocks for products                                                                                                     |
| stores                         | The stores                                                                                                              |
| suppliers                      | The product suppliers                                                                                                   |
| supply_order_details           | Supply Order Details                                                                                                    |
| supply_order_histories         | Supply Order Histories                                                                                                  |
| supply_order_receipt_histories | Supply Order Receipt Histories                                                                                          |
| supply_order_states            | Supply Order States                                                                                                     |
| supply_orders                  | Supply Orders                                                                                                           |
| tags                           | The Products tags                                                                                                       |
| tax_rule_groups                | Group of Tax rule, along with their name                                                                                |
| tax_rules                      | Tax rules, to associate Tax with a country, zip code, ...                                                               |
| taxes                          | The tax rate                                                                                                            |
| translated_configurations      | Shop configuration which are translated                                                                                 |
| warehouse_product_locations    | Location of products in warehouses                                                                                      |
| warehouses                     | Warehouses                                                                                                              |
| weight_ranges                  | Weight ranges for deliveries                                                                                            |
| zones                          | The Countries zones                                                                                                     |

## Schema synopsis format

When displaying a resource schema in synopsis mode, the API provides expected types and constraints.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <customer>
        <id_default_group></id_default_group>
        <id_lang format="isUnsignedId"></id_lang>
        <newsletter_date_add></newsletter_date_add>
        <ip_registration_newsletter></ip_registration_newsletter>
        <last_passwd_gen readOnly="true"></last_passwd_gen>
        <secure_key format="isMd5" readOnly="true"></secure_key>
        <deleted format="isBool"></deleted>
        <passwd required="true" maxSize="255" format="isPasswd"></passwd>
        <lastname required="true" maxSize="255" format="isCustomerName"></lastname>
        <firstname required="true" maxSize="255" format="isCustomerName"></firstname>
        <email required="true" maxSize="255" format="isEmail"></email>
        ...
    </customer>
</prestashop>
```

## Validation formats

### Generic value types

| Format             | Description                                                                 | Expected format       |
|--------------------|-----------------------------------------------------------------------------|-----------------------|
| isBool             | A boolean value (true or false).                                            | 0\|1                  |
| isFloat            | A floating-point value (between -3.4 x 10^38 and +3.4 x 10^38).             | n/a                   |
| isInt              | An integral value (between -2,147,483,648 and 2,147,483,647).               | n/a                   |
| isJson             | A valid JSON string.                                                        | n/a                   |
| isNullOrUnsignedId | An integral and unsigned value (between 0 and 4294967296), or a NULL value. | n/a                   |
| isSerializedArray  | PHP serialized data.                                                        | `/^a:[0-9]+:{.*;}$/s` |
| isString           | A string of characters.                                                     | n/a                   |
| isUnsignedId       | An integral and unsigned value (between 0 and 4294967296).                  | n/a                   |
| isUnsignedFloat    | A floating-point and unsigned value (between 0 and +6.8 x 10^38).           | n/a                   |

### Specific value types

| Format               | Description                                                                   | Expected format                                    |
|----------------------|-------------------------------------------------------------------------------|----------------------------------------------------|
| isAnything           | No validation                                                                 | n/a                                                |
| isApe                | A valid APE code.                                                             | `/^[0-9]{3,4}[a-zA-Z]{1}$/s`                       |
| isBirthDate          | A valid date, in YYYY-MM-DD format.                                           | n/a                                                |
| isCleanHtml          | Must not contain invalid HTML tags, nor XSS.                                  | n/a                                                |
| isColor              | A valid HTML/CSS color, in #xxxxxx format or text format.                     | `/^(#[0-9a-fA-F]{6}                                |[a-zA-Z0-9-]*)$/` |
| isDate               | A valid date.                                                                 | n/a                                                |
| isDateFormat         | A valid date format.                                                          | n/a                                                |
| isEmail              | A valid e-mail address.                                                       | n/a                                                |
| isImageSize          | A valid image size, between 0 and 9999.                                       | `/^[0-9]{1,4}$/`                                   |
| isIp2Long            | A valid IP for customer messages.                                             | `#^-?[0-9]+$#`                                     |
| isLanguageCode       | A valid language code, in XX or XX-XX format.                                 | `/^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/`                   |
| isLanguageIsoCode    | A valid ISO language code, in XX or XXX format.                               | `/^[a-zA-Z]{2,3}$/`                                |
| isLinkRewrite        | A valid link rewrite.                                                         | `/^[_a-zA-Z0-9\-]+$/`                              |
| isLocale             | A valid locale code, in xx-XX format.                                         | `/^[a-z]{2}-[A-Z]{2}$/`                            |
| isMd5                | A valid MD5 string: 32 characters, mixing lowercase, uppercase and numerals.  | `/^[a-f0-9A-F]{32}$/`                              |
| isNumericIsoCode     | A valid ISO code, in 000 format.                                              | `/^[0-9]{3}$/`                                     |
| isPasswd             | A valid password, between 5 and 72 characters long.                           | `/^[.a-zA-Z_0-9-!@#$%\^&*()]{5,72}$/`              |
| isPasswdAdmin        | A valid password, between 8 and 72 characters long.                           | `/^[.a-zA-Z_0-9-!@#$%\^&*()]{8,22}$/`              |
| isPercentage         | A valid percentage: float between 0 and 100.                                  | n/a                                                |
| isPhpDateFormat      | A valid PHP date, in fact a string without '<' nor '>'.                       | `/^[^<>]+$/`                                       |
| isPriceDisplayMethod | A valid price display method, value equals PS_TAX_EXC or PS_TAX_INC.          | 0\|1                                               |
| isReductionType      | A valid reduction type.                                                       | amount\|percentage                                 |
| isReference          | A valid product reference.                                                    | `/^[^<>;={}]*$/u`                                  |
| isSha1               | A valid SHA1 string: 40 characters, mixing lowercase, uppercase and numerals. | `/^[a-fA-F0-9]{40}$/`                              |
| isThemeName          | A theme name.                                                                 | `/^[\w-]{3,255}$/u`                                |
| isTrackingNumber     | A valid tracking number.                                                      | `/^[~:#,%&_=(\)\[\]\.\? \+\-@\/a-zA-Z0-9]+$/`      |
| isUrl                | A valid URL.                                                                  | `/^[~:#,$%&_=(\)\.\? \+\-@\/a-zA-Z0-9\pL\pS-]+$/u` |
| isStockManagement    | A stock management.                                                           | WA\|FIFO\|LIFO                                     |

### Names

| Format          | Description                       | Expected format                                                            |
|-----------------|-----------------------------------|----------------------------------------------------------------------------|
| isCatalogName   | A valid product or category name. | `/^[^<>;=#{}]*$/u`                                                         |
| isCarrierName   | A valid carrier name.             | `/^[^<>;=#{}]*$/u`                                                         |
| isConfigName    | A valid configuration key.        | `/^[a-zA-Z_0-9-]+$/`                                                       |
| isCustomerName  | A valid customer name.            | see `PrestaShop\PrestaShop\Core\ConstraintValidator\CustomerNameValidator` |
| isGenericName   | A valid standard name.            | `/^[^<>={}]*$/u`                                                           |
| isImageTypeName | A valid image type.               | `/^[a-zA-Z0-9_ -]+$/`                                                      |
| isModuleName    | A valid module name.              | `/^[a-zA-Z0-9_-]+$/`                                                       |
| isName          | A valid name.                     | `/^[^0-9!<>,;?=+()@#"°{}_$%:¤                                              |]*$/u` |
| isTplName       | A valid template name.            | `/^[a-zA-Z0-9_-]+$/`                                                       |

### Locations

| Format          | Description                                                                                                   | Expected format                              |
|-----------------|---------------------------------------------------------------------------------------------------------------|----------------------------------------------|
| isAddress       | A valid postal address.                                                                                       | `/^[^!<>?=+@{}_$%]*$/u`                      |
| isDniLite       | A valid DNI identifier. Specific to some Spanish speaking countries or any country configured with DNI field. | `/^[0-9A-Za-z-.]{1,16}$/U`                   |
| isCityName      | A valid city name.                                                                                            | `/^[^!<>;?=+@#"°{}_$%]*$/u`                  |
| isCoordinate    | A valid latitude-longitude coordinates, in 00000.0000 form.                                                   | `/^\-?[0-9]{1,8}\.[0-9]{1,8}$/s`             |
| isMessage       | A valid message.                                                                                              | `/[<>{}]/i`                                  |
| isPhoneNumber   | A valid phone number.                                                                                         | `/^[+0-9. ()\/-]*$/`                         |
| isPostCode      | A valid postal code.                                                                                          | `/^[a-zA-Z 0-9-]+$/`                         |
| isStateIsoCode  | A valid state ISO code.                                                                                       | `/^[a-zA-Z0-9]{1,4}((-)[a-zA-Z0-9]{1,4})?$/` |
| isZipCodeFormat | A valid zipcode format.                                                                                       | `/^[NLCnlc 0-9-]+$/`                         |

### Products

| Format                   | Description                                                      | Expected format                                               |
|--------------------------|------------------------------------------------------------------|---------------------------------------------------------------|
| isAbsoluteUrl            | A valid absolute URL.                                            | `/^(https?:)?\/\/[$~:;#,%&_=(\)\[\]\.\? \+\-@\/a-zA-Z0-9]+$/` |
| isEan13                  | A valid barcode (EAN13).                                         | `/^[0-9]{0,13}$/`                                             |
| isIsbn                   | A valid barcode (ISBN).                                          | `/^[0-9-]{0,32}$/`                                            |
| isLinkRewrite            | A valid friendly URL.                                            | `/^[_a-zA-Z0-9\-]+$/`                                         |
| isLinkRewrite (accented) | A valid friendly URL (with PS_ALLOW_ACCENTED_CHARS_URL enabled). | `/^[_a-zA-Z0-9\x{0600}-\x{06FF}\pL\pS-]+$/u`                  |
| isMpn                    | A valid mpn (Manufacturer Part Number) 40 characters max.        | n/a                                                           |
| isNegativePrice          | A valid price value (including negative price).                  | `/^[-]?[0-9]{1,10}(\.[0-9]{1,9})?$/`                          |
| isPrice                  | A valid price.                                                   | `/^[0-9]{1,10}(\.[0-9]{1,9})?$/`                              |
| isProductVisibility      | A valid product visibility.                                      | `/^both                                                       |catalog|search|none$/i` |
| isUpc                    | A valid barcode (UPC).                                           | `/^[0-9]{0,12}$/`                                             |

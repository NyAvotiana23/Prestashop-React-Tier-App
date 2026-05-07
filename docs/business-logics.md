# Business logics

Sources: `api_docs/business_logics.json`, `api_docs/objectmodel_methods.json`.

Notes:
- "Implementation" marks if the method has an override body in `objectmodel_methods.json`.
- "Default" means no custom logic beyond base ObjectModel behavior.

## Access.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Uses default ObjectModel::add(). No specific business logic. | Default |
| update | Uses default ObjectModel::update(). No specific business logic. | Default |
| delete | Uses default ObjectModel::delete(). No specific business logic. | Default |
| save | Uses default ObjectModel::save() (add or update). | Default |

## Address.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | parent::add() + resets customer address cache + updates internal $addressExists cache. | Override |
| update | Clears country/zone caches + updates address cache + if address is used in order, temporarily removes required field validation. | Override |
| delete | Complex delete logic:<br>1. Resets customer address cache if linked to a customer.<br>2. Unlinks from non-ordered carts.<br>3. If address is used in any Order → softDelete() (keeps data for order history).<br>4. If not used → hard parent::delete().<br>Important for webservice: Deleting an address used in orders only marks it as deleted. | Override |
| save | Uses default ObjectModel::save() | Default |

## AddressFormat.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Alias.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Normalizes alias/search (removes accents) + parent::add() + enables PS_ALIAS_FEATURE_ACTIVE. | Override |
| update | Default ObjectModel behavior. | Default |
| delete | parent::delete() + updates global configuration PS_ALIAS_FEATURE_ACTIVE. | Override |
| save | Default ObjectModel behavior. | Default |

## Attachment.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Sets file_size from physical file before parent::add(). | Override |
| update | Updates file_size before parent::update(). | Override |
| delete | Deletes physical file + removes product_attachment links + updates product attachment cache. | Override |
| save | Default ObjectModel behavior. | Default |

## AttributeGroup.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Sets is_color_group + auto position + parent::add() + hook actionAttributeGroupSave. | Override |
| update | Updates is_color_group + hook actionAttributeGroupSave. | Override |
| delete | Deletes linked attributes + cleans product combinations + cleans positions. Executes hooks. | Override |
| save | Default ObjectModel behavior. | Default |

## Carrier.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Auto position + parent::add() + sets default carrier if first + creates id_reference + links to all payment modules. | Override |
| update | Default ObjectModel behavior. | Default |
| delete | If used in orders → softDelete(). Else hard delete + cleans positions, module links, tax rules. | Override |
| save | Default ObjectModel behavior. | Default |

## Cart.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Sets default lang/shop if missing + parent::add() + actionCartSave hook. | Override |
| update | Clears product/weight cache + parent::update() + actionCartSave hook. | Override |
| delete | Prevents deletion if linked to an Order. Cleans customized files, customizations, cart rules and products. | Override |
| save | Default ObjectModel behavior. | Default |

## CartRule.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Sets default reduction_currency + parent::add() + enables feature flag. | Override |
| update | Clears cache + sets default currency + parent::update() + updates feature flag. | Override |
| delete | parent::delete() + disables feature flag if no more rules + cleans all associations (cart, carrier, shop, group, country, combinations, etc.). | Override |
| save | Default ObjectModel behavior. | Default |

## Category.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Calculates level_depth + sets root if needed + parent::add() + adds positions in all shops + regenerates ntree + updates groups. | Override |
| update | Prevents self-parent + updates level_depth/positions + regenerates ntree if parent changed. | Override |
| delete | Prevents root category deletion. Deletes all children + cleans associations, images, groups, cart rules + regenerates nested tree (ntree). | Override |
| save | Default ObjectModel behavior. | Default |

## CMS.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Sets position + parent::add(). | Override |
| update | parent::update() + cleans positions. | Override |
| delete | parent::delete() + cleans positions in its category. | Override |
| save | Default ObjectModel behavior. | Default |

## CMSCategory.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Sets position + level_depth + parent::add() + cleans positions. | Override |
| update | Recalculates level_depth. | Override |
| delete | Prevents deletion of ID 1. Deletes children recursively + cleans positions. | Override |
| save | Default ObjectModel behavior. | Default |

## CMSRole.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Combination.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Handles default_on + creates stock_available entry + applies specific price rules + updates default attribute. | Override |
| update | Handles default_on + updates default attribute. | Override |
| delete | Removes stock, specific prices, cart links, supplier/pack links + updates default attribute + clears color cache. | Override |
| save | Default ObjectModel behavior. | Default |

## Configuration.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Connection.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## ConnectionsSource.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Contact.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Country.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | parent::add() + adds module restrictions. | Override |
| update | Default ObjectModel behavior. | Default |
| delete | parent::delete() + removes cart_rule_country links. | Override |
| save | Default ObjectModel behavior. | Default |

## Currency.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Validates conversion_rate + prevents duplicate ISO. | Override |
| update | Validates conversion_rate. | Override |
| delete | Prevents deletion of default currency. Updates default if needed + softDelete() + removes module restrictions. | Override |
| save | Default ObjectModel behavior. | Default |

## Customer.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Sets shop/lang defaults, secure_key, birthday, default group, newsletter date + parent::add() + updates groups. | Override |
| update | Default (partial in file) | Override |
| delete | Cleans addresses (if no orders), groups, messages, specific prices, carts (without orders), threads, cart rules. | Override |
| save | Default ObjectModel behavior. | Default |

## FeatureFlag.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## FeatureValue.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | parent::add() + hook actionFeatureValueSave. | Override |
| update | parent::update() + hook. | Override |
| delete | Deletes linked feature_product entries + hook. | Override |
| save | Default ObjectModel behavior. | Default |

## Gender.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Group.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Enables group feature + assigns to home category + all carriers. | Override |
| update | Enables feature if reduction > 0. | Override |
| delete | Prevents deletion of default customer group. Cleans many associations + reassigns customers to default group. | Override |
| save | Default ObjectModel behavior. | Default |

## GroupReduction.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | parent::add() + cache. | Override |
| update | parent::update() + cache. | Override |
| delete | Cleans product_group_reduction_cache. | Override |
| save | Default ObjectModel behavior. | Default |

## Guest.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Hook.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Clears hook cache. | Override |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Image.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Auto position + handles cover flag. | Override |
| update | Handles cover flag. | Override |
| delete | parent::delete() + deletes physical images/thumbnails + updates positions. | Override |
| save | Default ObjectModel behavior. | Default |

## ImageType.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Language.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | parent::add() + generates RTL stylesheets if needed + loads update SQL. | Override |
| update | Regenerates RTL if changed. | Override |
| delete | Very heavy: deletes all _lang entries, tags, search words, mail/theme/module translation files, images. | Override |
| save | Default ObjectModel behavior. | Default |

## Mail.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Manufacturer.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Deletes linked address + parent::delete() + cleans cart rules + deletes image. | Override |
| save | Default ObjectModel behavior. | Default |

## Message.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Meta.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | parent::update() + regenerates .htaccess. | Override |
| delete | parent::delete() + regenerates .htaccess. | Override |
| save | Default ObjectModel behavior. | Default |

## Page.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## PrestaShopLogger.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Product.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Sets product_type for virtual + stock management + group reduction + unit ratio + hook. | Override |
| update | Syncs stock reference/EAN/etc. + hooks actionProductSave/Update. | Override |
| delete | Heavy safety checks (stock, supply orders). Deletes attributes, images, categories, features, tags, carts, attachments, etc. Executes actionProductDelete hook. | Override |
| save | Default ObjectModel behavior. | Default |

## ProductAttribute.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Auto position + hook. | Override |
| update | Hook. | Override |
| delete | Deletes combinations + cleans cart rules + positions. | Override |
| save | Default ObjectModel behavior. | Default |

## ProductDownload.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | parent::add() | Override |
| update | parent::update() | Override |
| delete | Optional file deletion. | Override |
| save | Default ObjectModel behavior. | Default |

## ProductSupplier.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Profile.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | parent::add() | Override |
| update | Default ObjectModel behavior. | Default |
| delete | Deletes access + module_access entries. | Override |
| save | Default ObjectModel behavior. | Default |

## QuickAccess.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## RequestSql.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Risk.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## SearchEngine.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## SpecificPrice.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Flushes cache + enables feature flag. | Override |
| update | Flushes cache. | Override |
| delete | Flushes cache + updates feature flag. | Override |
| save | Default ObjectModel behavior. | Default |

## SpecificPriceRule.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Deletes conditions + linked specific prices. | Override |
| save | Default ObjectModel behavior. | Default |

## State.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Only if not used. | Override |
| save | Default ObjectModel behavior. | Default |

## Store.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Default ObjectModel behavior. | Default |
| save | Default ObjectModel behavior. | Default |

## Supplier.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Deletes address + image + cleans cart rules. | Override |
| save | Default ObjectModel behavior. | Default |

## Tab.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Sets position + creates access + clears cache. | Override |
| update | Adjusts position if parent changes + clears cache. | Override |
| delete | Deletes authorization roles + cleans positions. | Override |
| save | Clears cache. | Override |

## Tag.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | parent::add() + optional setProducts(). | Override |
| update | Default ObjectModel behavior. | Default |
| delete | Removes products search index. | Override |
| save | Default ObjectModel behavior. | Default |

## Zone.php

| Method | Business logic | Implementation |
| --- | --- | --- |
| add | Default ObjectModel behavior. | Default |
| update | Default ObjectModel behavior. | Default |
| delete | Cleans carrier_zone, delivery + resets country/state zones. | Override |
| save | Default ObjectModel behavior. | Default |


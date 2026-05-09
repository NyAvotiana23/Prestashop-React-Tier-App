SELECT p.`id_product`,
       p.`reference`,
       p.`id_shop_default`,
       ps.`price`                                                        AS `price_tax_excluded`,
       ps.`ecotax`                                                       AS `ecotax_tax_excluded`,
       ps.`id_tax_rules_group`,
       ps.`active`,
       pl.`name`,
       pl.`link_rewrite`,
       cl.`name`                                                         AS `category`,
       img_shop.`id_image`,
       img_lang.legend,
       p.`id_tax_rules_group`,
       (ps.`price` + ps.`ecotax`)                                        AS `final_price_tax_excluded`,
       IF(sa.`quantity` IS NULL OR sa.`quantity` = '', 0, sa.`quantity`) AS quantity
FROM ps_product p
         INNER JOIN ps_product_shop ps ON ps.`id_product` = p.`id_product` AND ps.`id_shop` = 1
         LEFT JOIN ps_shop s ON s.`id_shop` = ps.`id_shop`
         LEFT JOIN ps_product_lang pl ON pl.`id_product` = p.`id_product` AND pl.`id_lang` = 1 AND pl.`id_shop` = 1
         LEFT JOIN ps_stock_available sa ON sa.`id_product` = p.`id_product`
    AND sa.`id_product_attribute` = 0
    AND sa.`id_shop` = 1
         LEFT JOIN ps_category_lang cl
                   ON cl.`id_category` = ps.`id_category_default` AND cl.`id_lang` = 1 AND cl.`id_shop` = 1
         LEFT JOIN ps_image_shop img_shop
                   ON img_shop.`id_product` = ps.`id_product` AND img_shop.`cover` = 1 AND img_shop.`id_shop` = 1
         LEFT JOIN ps_image_lang img_lang ON img_shop.`id_image` = img_lang.`id_image` AND img_lang.`id_lang` = 1
WHERE p.`state` = 1
ORDER BY id_product desc LIMIT 20

SELECT c.id_customer,
       c.firstname,
       c.lastname,
       c.email,
       c.active,
       c.newsletter,
       c.optin,
       c.date_add,
       gl.name               as    social_title,
       grl.name              as    default_group,
       s.name                as    shop_name,
       c.company,
       (SELECT SUM(total_paid_real / conversion_rate)
        FROM ps_orders o
        WHERE (o.id_customer = c.id_customer)
          AND (o.id_shop IN ('1'))
          AND (o.valid = 1)) as    total_spent,
       (SELECT con.date_add
        FROM ps_guest g
                 LEFT JOIN ps_connections con ON con.id_guest = g.id_guest
        WHERE g.id_customer = c.id_customer
        ORDER BY con.date_add DESC LIMIT 1) as
connect
FROM ps_customer c LEFT JOIN ps_gender_lang gl
ON c.id_gender = gl.id_gender AND gl.id_lang = 1 LEFT JOIN ps_group_lang grl ON c.id_default_group = grl.id_group AND grl.id_lang = 1 LEFT JOIN ps_shop s ON c.id_shop = s.id_shop
WHERE (c.deleted = 0) AND (c.id_shop IN ('1'))
ORDER BY c.date_add DESC LIMIT 50
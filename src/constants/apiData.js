import { PRODUCTS_CSV_HEADERS, ORDERS_CSV_HEADERS, COMBINATIONS_CSV_HEADERS } from "../csv/csvHeaders.js";

export const API_NAMES = [
    "addresses",
    "attachments",
    "carriers",
    "cart_rules",
    "carts",
    "categories",
    "combinations",
    "configurations",
    "contacts",
    "content_management_system",
    "countries",
    "currencies",
    "customer_messages",
    "customer_threads",
    "customers",
    "customizations",
    "deliveries",
    "employees",
    "groups",
    "guests",
    "image_types",
    "images",
    "klaviyo",
    "languages",
    "manufacturers",
    "messages",
    "order_carriers",
    "order_cart_rules",
    "order_details",
    "order_histories",
    "order_invoices",
    "order_payments",
    "order_slip",
    "order_states",
    "orders",
    "price_ranges",
    "product_customization_fields",
    "product_feature_values",
    "product_features",
    "product_option_values",
    "product_options",
    "product_suppliers",
    "products",
    "search",
    "shop_groups",
    "shop_urls",
    "shops",
    "specific_price_rules",
    "specific_prices",
    "states",
    "stock_availables",
    "stock_movement_reasons",
    "stock_movements",
    "stocks",
    "stores",
    "suppliers",
    "supply_order_details",
    "supply_order_histories",
    "supply_order_receipt_histories",
    "supply_order_states",
    "supply_orders",
    "tags",
    "tax_rule_groups",
    "tax_rules",
    "taxes",
    "translated_configurations",
    "warehouse_product_locations",
    "warehouses",
    "weight_ranges",
    "zones",
];

export const API_URLS = [
    // {
    //   name: "Addresses",
    //   baseUrl: "/addresses",
    //   ref: "addresses",
    //       description: "The Customer, Brand and Customer addresses",
    // },
    {
        name: "Attachments",
        baseUrl: "/attachments",
        ref: "attachments",
        description: "The product Attachments",
        csvHeaders: []
    },
    // {
    //   name: "Carriers",
    //   baseUrl: "/carriers",
    //   ref: "carriers",
    //   description: "The Carriers",
    // },
    // {
    //   name: "Cart Rules",
    //   baseUrl: "/cart_rules",
    //   ref: "cart_rules",
    //   description: "Cart rules management",
    // },
    {
        name: "Carts",
        baseUrl: "/carts",
        ref: "carts",
        description: "Customer's carts",
        csvHeaders: []

    },
    // {
    //   name: "Categories",
    //   baseUrl: "/categories",
    //   ref: "categories",
    //   description: "The product categories",
    // },
    {
        name: "Combinations",
        baseUrl: "/combinations",
        ref: "combinations",
        description: "The product combinations",
        csvHeaders: COMBINATIONS_CSV_HEADERS

    },
    // {
    //   name: "Configurations",
    //   baseUrl: "/configurations",
    //   ref: "configurations",
    //   description: "Shop configuration",
    // },
    // {
    //   name: "Contacts",
    //   baseUrl: "/contacts",
    //   ref: "contacts",
    //   description: "Shop contacts",
    // },
    // {
    //   name: "Content Management System",
    //   baseUrl: "/content_management_system",
    //   ref: "content_management_system",
    //   description: "Content management system",
    // },
    // {
    //   name: "Countries",
    //   baseUrl: "/countries",
    //   ref: "countries",
    //   description: "The countries",
    // },
    // {
    //   name: "Currencies",
    //   baseUrl: "/currencies",
    //   ref: "currencies",
    //   description: "The currencies",
    // },
    // {
    //   name: "Customer Messages",
    //   baseUrl: "/customer_messages",
    //   ref: "customer_messages",
    //   description: "Customer services messages",
    // },
    // {
    //   name: "Customer Threads",
    //   baseUrl: "/customer_threads",
    //   ref: "customer_threads",
    //   description: "Customer services threads",
    // },
    {
      name: "Customers",
      baseUrl: "/customers",
      ref: "customers",
      description: "The e-shop's customers",
    },
    // {
    //   name: "Customizations",
    //   baseUrl: "/customizations",
    //   ref: "customizations",
    //   description: "Customization values",
    // },
    {
        name: "Deliveries",
        baseUrl: "/deliveries",
        ref: "deliveries",
        description: "Product delivery",
        csvHeaders: []

    },
    // {
    //   name: "Employees",
    //   baseUrl: "/employees",
    //   ref: "employees",
    //   description: "The Employees",
    // },
    // {
    //   name: "Groups",
    //   baseUrl: "/groups",
    //   ref: "groups",
    //   description: "The customer's groups",
    // },
    // {
    //   name: "Guests",
    //   baseUrl: "/guests",
    //   ref: "guests",
    //   description: "The guests",
    // },
    // {
    //   name: "Image Types",
    //   baseUrl: "/image_types",
    //   ref: "image_types",
    //   description: "The image types",
    // },
    // {
    //   name: "Images",
    //   baseUrl: "/images",
    //   ref: "images",
    //   description: "The images",
    // },
    // {
    //   name: "Klaviyo",
    //   baseUrl: "/klaviyo",
    //   ref: "klaviyo",
    //   description: "Klaviyo custom endpoints",
    // },
    // {
    //   name: "Languages",
    //   baseUrl: "/languages",
    //   ref: "languages",
    //   description: "Shop languages",
    // },
    // {
    //   name: "Manufacturers",
    //   baseUrl: "/manufacturers",
    //   ref: "manufacturers",
    //   description: "The product brands",
    // },
    // {
    //   name: "Messages",
    //   baseUrl: "/messages",
    //   ref: "messages",
    //   description: "The Messages",
    // },
    {
        name: "Order Carriers",
        baseUrl: "/order_carriers",
        ref: "order_carriers",
        description: "The Order carriers",
        csvHeaders: []

    },
    {
        name: "Order Cart Rules",
        baseUrl: "/order_cart_rules",
        ref: "order_cart_rules",
        description: "The Order cart rules",
        csvHeaders: []

    },
    {
        name: "Order Details",
        baseUrl: "/order_details",
        ref: "order_details",
        description: "Details of an order",
        csvHeaders: []

    },
    {
        name: "Order Histories",
        baseUrl: "/order_histories",
        ref: "order_histories",
        description: "The Order histories",
        csvHeaders: []

    },
    {
        name: "Order Invoices",
        baseUrl: "/order_invoices",
        ref: "order_invoices",
        description: "The Order invoices",
        csvHeaders: []

    },
    {
        name: "Order Payments",
        baseUrl: "/order_payments",
        ref: "order_payments",
        description: "The Order payments",
        csvHeaders: []

    },
    {
        name: "Order Slip",
        baseUrl: "/order_slip",
        ref: "order_slip",
        description: "The Order slips",
        csvHeaders: []

    },
    {
        name: "Order States",
        baseUrl: "/order_states",
        ref: "order_states",
        description: "The Order statuses",
        csvHeaders: []

    },
    {
        name: "Orders",
        baseUrl: "/orders",
        ref: "orders",
        description: "The Customers orders",
        csvHeaders: ORDERS_CSV_HEADERS

    },
    {
        name: "Price Ranges",
        baseUrl: "/price_ranges",
        ref: "price_ranges",
        description: "Price ranges",
        csvHeaders: []

    },
    {
        name: "Product Customization Fields",
        baseUrl: "/product_customization_fields",
        ref: "product_customization_fields",
        description: "Customization Field",
        csvHeaders: []

    },
    {
        name: "Product Feature Values",
        baseUrl: "/product_feature_values",
        ref: "product_feature_values",
        description: "The product feature values",
        csvHeaders: []

    },
    {
        name: "Product Features",
        baseUrl: "/product_features",
        ref: "product_features",
        description: "The product features",
        csvHeaders: []

    },
    {
        name: "Product Option Values",
        baseUrl: "/product_option_values",
        ref: "product_option_values",
        description: "The product options value",
        csvHeaders: []

    },
    {
        name: "Product Options",
        baseUrl: "/product_options",
        ref: "product_options",
        description: "The product options",
        csvHeaders: []

    },
    {
        name: "Product Suppliers",
        baseUrl: "/product_suppliers",
        ref: "product_suppliers",
        description: "Product Suppliers",
        csvHeaders: []

    },
    {
        name: "Products",
        baseUrl: "/products",
        ref: "products",
        description: "The products",
        csvHeaders: PRODUCTS_CSV_HEADERS
    },
    // { name: "Search", baseUrl: "/search", ref: "search", description: "Search" },
    {
        name: "Shop Groups",
        baseUrl: "/shop_groups",
        ref: "shop_groups",
        description: "Shop groups from multi-shop feature",
        deletable: false,
        csvHeaders: []

    },
    {
        name: "Shop URLs",
        baseUrl: "/shop_urls",
        ref: "shop_urls",
        description: "Shop URLs from multi-shop feature",
        deletable: false,
        csvHeaders: []

    },
    {
        name: "Shops",
        baseUrl: "/shops",
        ref: "shops",
        description: "Shops from multi-shop feature",
        deletable: false,
        csvHeaders: []

    },
    {
        name: "Specific Price Rules",
        baseUrl: "/specific_price_rules",
        ref: "specific_price_rules",
        description: "Specific price management",
        csvHeaders: []

    },
    {
        name: "Specific Prices",
        baseUrl: "/specific_prices",
        ref: "specific_prices",
        description: "Specific price management",
        csvHeaders: []

    },
    // {
    //   name: "States",
    //   baseUrl: "/states",
    //   ref: "states",
    //   description: "The available states of countries",
    // },
    {
        name: "Stock Availables",
        baseUrl: "/stock_availables",
        ref: "stock_availables",
        description: "Available quantities",
        csvHeaders: []

    },
    {
        name: "Stock Movement Reasons",
        baseUrl: "/stock_movement_reasons",
        ref: "stock_movement_reasons",
        description: "Stock movement reason",
        csvHeaders: []

    },
    {
        name: "Stock Movements",
        baseUrl: "/stock_movements",
        ref: "stock_movements",
        description: "Stock movements",
        csvHeaders: []

    },
    {name: "Stocks", baseUrl: "/stocks", ref: "stocks", description: "Stocks", csvHeaders: []},
    {
        name: "Stores",
        baseUrl: "/stores",
        ref: "stores",
        description: "The stores",
        csvHeaders: []
    },
    {
        name: "Suppliers",
        baseUrl: "/suppliers",
        ref: "suppliers",
        description: "The product suppliers",
        csvHeaders: []
    },
    {
        name: "Supply Order Details",
        baseUrl: "/supply_order_details",
        ref: "supply_order_details",
        description: "Supply Order Details",
        csvHeaders: []
    },
    {
        name: "Supply Order Histories",
        baseUrl: "/supply_order_histories",
        ref: "supply_order_histories",
        description: "Supply Order Histories",
        csvHeaders: []
    },
    {
        name: "Supply Order Receipt Histories",
        baseUrl: "/supply_order_receipt_histories",
        ref: "supply_order_receipt_histories",
        description: "Supply Order Receipt Histories",
        csvHeaders: []
    },
    {
        name: "Supply Order States",
        baseUrl: "/supply_order_states",
        ref: "supply_order_states",
        description: "Supply Order Statuses",
        csvHeaders: []
    },
    {
        name: "Supply Orders",
        baseUrl: "/supply_orders",
        ref: "supply_orders",
        description: "Supply Orders",
        csvHeaders: []
    },
    // {
    //   name: "Tags",
    //   baseUrl: "/tags",
    //   ref: "tags",
    //   description: "The Products tags",
    // },
    // {
    //   name: "Tax Rule Groups",
    //   baseUrl: "/tax_rule_groups",
    //   ref: "tax_rule_groups",
    //   description: "Tax rule groups",
    // },
    // {
    //   name: "Tax Rules",
    //   baseUrl: "/tax_rules",
    //   ref: "tax_rules",
    //   description: "Tax rules entity",
    // },
    // {
    //   name: "Taxes",
    //   baseUrl: "/taxes",
    //   ref: "taxes",
    //   description: "The tax rate",
    // },
    // {
    //   name: "Translated Configurations",
    //   baseUrl: "/translated_configurations",
    //   ref: "translated_configurations",
    //   description: "Shop configuration",
    // },
    // {
    //   name: "Warehouse Product Locations",
    //   baseUrl: "/warehouse_product_locations",
    //   ref: "warehouse_product_locations",
    //   description: "Location of products in warehouses",
    // },
    // {
    //   name: "Warehouses",
    //   baseUrl: "/warehouses",
    //   ref: "warehouses",
    //   description: "Warehouses",
    // },
    // {
    //   name: "Weight Ranges",
    //   baseUrl: "/weight_ranges",
    //   ref: "weight_ranges",
    //   description: "Weight ranges",
    // },
    // {
    //   name: "Zones",
    //   baseUrl: "/zones",
    //   ref: "zones",
    //   description: "The Countries zones",
    // },
];

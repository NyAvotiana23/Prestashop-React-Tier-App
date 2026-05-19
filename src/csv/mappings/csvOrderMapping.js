/**
 * csvOrderMapping.js
 *
 * Concerns: row validation + processing for the "orders" CSV import.
 * All lookup / ensure / create logic lives in csvMappingUtils.js.
 * Pure helpers (normalizeText, parseAchat, splitCustomerName, isValidEmail)
 * live in util-functions.js.
 */

import {createResource, patchResource} from "../../api/prestashopCrud.js";
import {parseDateToIso} from "../csvImportUtils.js";
import {
    getLanguageText,
    getScalarValue,
    normalizeText,
    isValidEmail,
    splitCustomerName,
    parseAchat,
} from "../../utils/util-functions.js";
import {
    findProductByReference,
    getCustomerByEmail,
    getCustomerAddressId,
    cacheCustomer,
    cacheAddress,
    getFirstCurrencyId,
    getFirstCarrierId,
    getTaxRateForGroup,
    resolveCombinationId,
    DEFAULT_LANG_ID,
    DEFAULT_COUNTRY_ID,
    DEFAULT_CITY_NAME,
    DEFAULT_POST_CODE,
    DEFAULT_ANONYM_GROUP,
} from "./csvMappingUtils.js";
import {updateOrderState} from "../../service/custom-stock-service.js";

// ─── Anonymous customer constants ─────────────────────────────────────────────

export const ANONYM_CUSTOMER_EMAIL = "anonym@anonym.com";
export const ANONYM_CUSTOMER_NAME = "anonymous";
export const ANONYM_CUSTOMER_PASSWORD = "anonymous";

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateOrderRow(row) {
    const errors = [];

    const dateRaw = String(row?.date ?? "").trim();
    if (!dateRaw) {
        errors.push("Date commande manquante.");
    } else if (!parseDateToIso(dateRaw)) {
        errors.push("Date commande invalide (format attendu JJ/MM/AAAA).");
    }

    if (!isValidEmail(row?.email)) {
        errors.push("Email client invalide.");
    }

    const achatRaw = String(row?.achat ?? "").trim();
    if (!achatRaw) {
        errors.push("Achat manquant.");
    } else {
        const achats = parseAchat(achatRaw);
        if (!achats.length) {
            errors.push("Achat invalide ou illisible.");
        } else if (achats.find((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) {
            errors.push("Quantite d'achat invalide (doit etre > 0).");
        }
    }

    return errors;
}

function ensureOrderRow(row) {
    const errors = validateOrderRow(row);
    if (errors.length > 0) throw new Error(errors.join(" | "));
}

// ─── Customer helpers (order-domain) ─────────────────────────────────────────

/**
 * Finds or creates the anonymous customer.
 * Cached under ANONYM_CUSTOMER_EMAIL in CUSTOMERS_CACHE.
 */
export async function ensureCustomerAnonym() {
    let existing = await getCustomerByEmail(ANONYM_CUSTOMER_EMAIL);
    if (!existing) {
        const payload = {
            customer: {
                email: ANONYM_CUSTOMER_EMAIL,
                firstname: ANONYM_CUSTOMER_NAME,
                lastname: ANONYM_CUSTOMER_NAME,
                passwd: ANONYM_CUSTOMER_PASSWORD,
                active: "1",
                id_default_group: DEFAULT_ANONYM_GROUP,
                id_gender: "1",
            },
        };
        const response = await createResource("customers", payload);
        const created = response?.data?.customer;
        if (created) {
            cacheCustomer(ANONYM_CUSTOMER_EMAIL, created);
            existing = created;
        } else {
            existing = await getCustomerByEmail(ANONYM_CUSTOMER_EMAIL);
        }
    }

    const id = getScalarValue(existing?.id) || getScalarValue(existing?.data?.customer?.id);
    if (!id) throw new Error("Anonymous customer not created!");

    return {
        id,
        email: ANONYM_CUSTOMER_EMAIL,
        firstname: ANONYM_CUSTOMER_NAME,
        lastname: ANONYM_CUSTOMER_NAME,
    };
}

async function ensureCustomer(row) {
    const email = String(row?.email ?? "").trim().toLowerCase();
    if (!email) return ensureCustomerAnonym();

    const existing = await getCustomerByEmail(email);
    if (existing) return existing;

    const {firstname, lastname} = splitCustomerName(row?.nom);
    const payload = {
        customer: {
            email,
            firstname,
            lastname,
            passwd: String(row?.pwd ?? "Temp1234"),
            active: "1",
            id_default_group: "3",
            id_gender: "1",
        },
    };

    const response = await createResource("customers", payload);
    const created = response?.data?.customer;
    const id = getScalarValue(created?.id);

    if (id && created) {
        cacheCustomer(email, created);
        return created;
    }
    // Fallback: re-fetch (race condition guard)
    return getCustomerByEmail(email);
}

async function ensureCustomerAddress(customer, row) {
    const customerId = getScalarValue(customer?.id);
    if (!customerId) return "";

    const existingAddressId = await getCustomerAddressId(customerId);
    if (existingAddressId) return existingAddressId;

    const rawAddress = String(row?.adresse ?? "").trim();
    if (!rawAddress) return "";

    const {firstname, lastname} = splitCustomerName(row?.nom);
    const resolvedFirstname = getScalarValue(customer?.firstname) || firstname;
    const resolvedLastname = getScalarValue(customer?.lastname) || lastname;

    const payload = {
        address: {
            id_customer: customerId,
            id_country: DEFAULT_COUNTRY_ID,
            alias: `Addresse import ${customerId}`,
            firstname: resolvedFirstname,
            lastname: resolvedLastname,
            address1: rawAddress,
            address2: "",
            city: DEFAULT_CITY_NAME,
            postcode: DEFAULT_POST_CODE,
        },
    };

    const response = await createResource("addresses", payload);
    const createdId = getScalarValue(response?.data?.address?.id) || "";

    if (createdId) {
        cacheAddress(customerId, createdId);
        return createdId;
    }

    // Fallback re-fetch
    const fallbackId = await getCustomerAddressId(customerId);
    if (fallbackId) return fallbackId;

    throw new Error(`Adresse non creee pour le client ${customerId} (adresse: ${rawAddress})`);
}

// ─── Row processing ───────────────────────────────────────────────────────────

export async function processOrderRow(row) {
    ensureOrderRow(row);

    const customer = await ensureCustomer(row);
    const customerId = getScalarValue(customer?.id);
    if (!customerId) {
        return {status: "skipped", reason: "Client introuvable", details: {email: row?.email}};
    }

    const addressId = (await ensureCustomerAddress(customer, row)) || "";
    if (!addressId) {
        return {
            status: "skipped",
            reason: "Adresse manquante",
            details: {email: row?.email, adresse: row?.adresse},
        };
    }

    const achats = parseAchat(row?.achat);
    if (!achats.length) {
        return {status: "skipped", reason: "Achat vide ou illisible", details: {achat: row?.achat}};
    }

    // Build order items — reuse tax rate cache locally across achats in one row
    const taxRateLocalCache = {};
    const items = [];

    for (const achat of achats) {
        const product = await findProductByReference(achat.reference);
        if (!product) throw new Error(`Produit introuvable: ${achat.reference}`);

        const productId = getScalarValue(product?.id);
        const combinationId = await resolveCombinationId(productId, achat.variant);
        if (combinationId === null) {
            throw new Error(`Combinaison introuvable: ${achat.reference} / ${achat.variant}`);
        }

        const taxRulesGroupId = getScalarValue(product?.id_tax_rules_group);
        if (taxRulesGroupId && taxRateLocalCache[taxRulesGroupId] === undefined) {
            taxRateLocalCache[taxRulesGroupId] = (await getTaxRateForGroup(taxRulesGroupId)) || 0;
        }
        const taxRate = taxRulesGroupId ? (taxRateLocalCache[taxRulesGroupId] || 0) : 0;

        const baseHt = parseFloat(getScalarValue(product?.price) ?? "0") || 0;
        let effectiveHt = baseHt;

        if (combinationId && combinationId !== "0") {
            // Combination delta — already cached in COMBINATIONS_CACHE via resolveCombinationId
            const {getProductCombinations} = await import("./csvMappingUtils.js");
            const combos = await getProductCombinations(productId);
            const combo = combos.find((c) => getScalarValue(c?.id) === combinationId);
            const deltaHt = parseFloat(getScalarValue(combo?.price) ?? "0") || 0;
            effectiveHt = baseHt + deltaHt;
        }

        const priceTtc = parseFloat((effectiveHt * (1 + taxRate / 100)).toFixed(2));
        items.push({product, quantity: achat.quantity, combinationId, priceHt: effectiveHt, priceTtc});
    }

    const currencyId = (await getFirstCurrencyId()) || "1";
    const carrierId = (await getFirstCarrierId()) || "1";
    const createdDate = parseDateToIso(row?.date) + " 00:00:00";
    const normalizedEtat = normalizeText(getScalarValue(row?.etat));
    const isCartOnly = !normalizedEtat || normalizedEtat === normalizeText("dans le panier");
    const isPaymentAccepted =
        normalizedEtat === normalizeText("paiement accepte") ||
        normalizedEtat === normalizeText("paiement a distance accepte");
    const isDelivered = normalizedEtat === normalizeText("livre");
    const isCanceled = normalizedEtat === normalizeText("annule");

    // Create cart
    const cartPayload = {
        cart: {
            id_currency: currencyId,
            id_customer: customerId,
            id_lang: DEFAULT_LANG_ID,
            id_address_delivery: addressId,
            id_address_invoice: addressId,
            id_carrier: carrierId,
            associations: {
                cart_rows: {
                    cart_row: items.map((item) => ({
                        id_product: getScalarValue(item.product?.id),
                        id_product_attribute: item.combinationId || "0",
                        id_address_delivery: addressId,
                        quantity: item.quantity,
                    })),
                },
            },
        },
    };

    const cartResponse = await createResource("carts", cartPayload);
    const cartId = getScalarValue(cartResponse?.data?.cart?.id);
    if (!cartId) throw new Error(`Creation du panier echouee (client: ${customerId})`);

    // Skip order creation if status means "in cart"
    if (isCartOnly) {
        return {
            status: "skipped",
            reason: "Dans le panier, carte crées seulement. Etat vide: commande non creee",
            details: {cartId, email: row?.email},
        };
    }

    if (!isPaymentAccepted && !isDelivered && !isCanceled) {
        throw new Error(`Etat de commande non gere: ${row?.etat}`);
    }


    const totalPaid = items
        .reduce((sum, item) => sum + item.priceTtc * item.quantity, 0)
        .toFixed(6);

    const orderPayload = {
        order: {
            id_address_delivery: addressId,
            id_address_invoice: addressId,
            id_cart: cartId,
            id_currency: currencyId,
            id_lang: DEFAULT_LANG_ID,
            id_customer: customerId,
            id_carrier: carrierId,
            module: "ps_cashondelivery",
            payment: "Paiement a la livraison",
            total_paid: String(totalPaid),
            total_paid_real: String(totalPaid),
            total_products: String(totalPaid),
            total_products_wt: String(totalPaid),
            conversion_rate: "1",
            associations: {
                order_rows: {
                    order_row: items.map((item) => ({
                        product_id: getScalarValue(item.product?.id),
                        product_attribute_id: item.combinationId || "0",
                        product_quantity: item.quantity,
                        product_name: getLanguageText(item.product?.name) || "Produit",
                        product_reference: getScalarValue(item.product?.reference) || "",
                        product_price: item.priceTtc.toFixed(6),
                        unit_price_tax_incl: item.priceTtc.toFixed(6),
                        unit_price_tax_excl: item.priceHt.toFixed(6),
                    })),
                },
            },
        },
    };

    const orderResponse = await createResource("orders", orderPayload);
    const orderId = getScalarValue(orderResponse?.data?.order?.id);
    if (!orderId) throw new Error(`Creation de la commande echouee (cart: ${cartId})`);

    // Back-date cart and order to match the CSV date
    await patchResource("carts", cartId, {cart: {id: cartId, date_add: createdDate}});
    await patchResource("orders", orderId, {order: {id: orderId, date_add: createdDate}});

    if (isDelivered || isCanceled) {
        await updateOrderState({
            orderId,
            stateId: isDelivered ? 5 : 6,
            effectiveDate: createdDate,
        });
    }

    return {
        status: "created",
        id: orderId,
        details: {cartId, orderId, customerId},
    };
}
import {createResource, getList, patchResource} from "../../api/prestashopCrud.js";
import {parseDateToIso, toLanguageNodes} from "../csvImportUtils.js";
import {ensureArray, getLanguageText, getScalarValue} from "../../utils/util-functions.js";
import {
    findProductByReference,
    getCustomerAddressId,
    getCustomerByEmail,
    getFirstId,
    getTaxRateForGroup,
    listAll,
} from "./csvMappingUtils.js";

const DEFAULT_LANG_ID = "1";
const DEFAULT_COUNTRY_ID = "8";
const DEFAULT_CITY_NAME = "France";
const DEFAULT_POST_CODE = "00111";
const DEFAULT_STATE_COLOR = "#eeff00";


export const ANONYM_CUSTOMER_GMAIL = "anonym@anonym.com";
export const ANONYM_CUSTOMER_NAME = "anonymous";
export const ANONYM_CUSTOMER_PASSWORD = "anonymous";


function normalizeText(value) {
    // NFD stands for Canonical Decomposition. It splits precomposed characters into two code points:
    //"é"  →  "e" + "◌́"   (U+0065 + U+0301)
    // "ñ"  →  "n" + "◌̃"   (U+006E + U+0303)
    // "ü"  →  "u" + "◌̈"   (U+0075 + U+0308)

    //String(value ?? "")
    //   .normalize("NFD")
    //   .replace(/[\u0300-\u036f]/g, "")
    //  "café"  →  "cafe"
    //  "naïve" →  "naive"
    //  "São"   →  "Sao"


    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

async function ensureState(state) {
    const normalized = normalizeText(state);
    const statesResponse = await getList("order_states", {
        display: "full",
    });

    const statesResult = statesResponse?.data?.order_states?.order_state ?? [];
    const match = statesResult.find((state) => {
        const optionName = normalizeText(getLanguageText(state.name));
        return normalized === optionName;
    });

    if (!match) {
        const statePayload = {
            order_state: {
                name: toLanguageNodes(state),
                color: DEFAULT_STATE_COLOR
            }
        }
        const createdState = await createResource("order_states", statePayload)
        return getScalarValue(createdState?.data?.order_state?.id);
    }

    return getScalarValue(match?.id) ?? null;

}

function parseAchat(value) {
    if (!value) return [];

    // Unescape CSV double-quotes ("" -> ")
    const unescaped = String(value).replaceAll('""', '"').trim();
    if (!unescaped.startsWith("[") || !unescaped.endsWith("]")) return [];

    // Strip outer [ and ]
    const content = unescaped.slice(1, -1).trim();
    if (!content) return [];

    // Split by , to get each tuple: ("T_01";3;"ngoza")
    const tuples = content.split(",");

    return tuples.map(tuple => {
        // Remove ( and ) at the edges
        const clean = tuple.replaceAll("(", "").replaceAll(")", "");

        // Split by ; to get the 3 parts: ref, qty, variant
        const [ref, qty, variant] = clean.split(";");

        const quantity = Number(qty);
        return {
            reference: ref?.replaceAll('"', "").trim(),
            quantity: Number.isFinite(quantity) ? quantity : 1,
            variant: (variant ?? "").replaceAll('"', "").trim(),
        };
    }).filter((item) => item?.reference);
}

function isValidEmail(value) {
    const email = String(value ?? "").trim();
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateOrderRow(row) {
    const errors = [];
    const dateRaw = String(row?.date ?? "").trim();
    if (!dateRaw) {
        errors.push("Date commande manquante.");
    } else {
        const iso = parseDateToIso(dateRaw);
        if (!iso) errors.push("Date commande invalide (format attendu JJ/MM/AAAA).");
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
        }

        const invalidQty = achats.find((item) => !Number.isFinite(item.quantity) || item.quantity <= 0);
        if (invalidQty) {
            errors.push("Quantite d'achat invalide (doit etre > 0).");
        }
    }

    return errors;
}

function ensureOrderRow(row) {
    const errors = validateOrderRow(row);
    if (errors.length > 0) {
        throw new Error(errors.join(" | "));
    }
}

export async function ensureCustomerAnonym() {
    let existingAnonym = await getCustomerByEmail(ANONYM_CUSTOMER_GMAIL);
    if (!existingAnonym) {
        const payload = {
            customer: {
                email: ANONYM_CUSTOMER_GMAIL,
                firstname: ANONYM_CUSTOMER_NAME,
                lastname: ANONYM_CUSTOMER_NAME,
                passwd: ANONYM_CUSTOMER_PASSWORD,
                active: "1",
                id_default_group: "3",
                id_gender: "1",
            },
        };
        existingAnonym = await createResource("customers", payload);

    }
    const id =
        getScalarValue(existingAnonym?.id) ||
        getScalarValue(existingAnonym?.data?.customer?.id);

    if (!id) throw new Error("Anonymous not created !")
    return {id: id, email: ANONYM_CUSTOMER_GMAIL, firstname: ANONYM_CUSTOMER_NAME, lastname: ANONYM_CUSTOMER_NAME}

}

async function ensureCustomer(row) {
    const email = String(row?.email ?? "").trim().toLowerCase();
    if (!email) {
        // Make it to the anonym person
        return ensureCustomerAnonym();
    }


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
    const id = getScalarValue(response?.data?.customer?.id);
    if (id) return {id, email, firstname, lastname};
    return await getCustomerByEmail(email);
}

async function ensureCustomerAddress(customer, row) {
    const customerId = getScalarValue(customer?.id);
    if (!customerId) return "";

    const existingAddressId = await getCustomerAddressId(customerId);
    if (existingAddressId) return existingAddressId;

    const rawAddress = String(row?.adresse ?? "").trim();
    if (!rawAddress) return "";

    const firstname = getScalarValue(customer?.firstname) || splitCustomerName(row?.nom).firstname;
    const lastname = getScalarValue(customer?.lastname) || splitCustomerName(row?.nom).lastname;
    const city = DEFAULT_CITY_NAME;
    const postcode = DEFAULT_POST_CODE;
    const alias = `Addresse import ${customerId}`;

    const payload = {
        address: {
            id_customer: customerId,
            id_country: DEFAULT_COUNTRY_ID,
            alias,
            firstname,
            lastname,
            address1: rawAddress,
            address2: "",
            city,
            postcode
        },
    };

    const response = await createResource("addresses", payload);
    const createdId = getScalarValue(response?.data?.address?.id) || "";
    if (createdId) return createdId;

    const fallbackId = await getCustomerAddressId(customerId);
    if (fallbackId) return fallbackId;

    throw new Error(`Adresse non creee pour le client ${customerId} (adresse: ${rawAddress})`);
}

async function getProductCombinations(productId) {
    const response = await getList("combinations", {
        display: "full",
        filters: {id_product: productId},
        limit: "0,100",
    });
    return ensureArray(response?.data?.combinations?.combination ?? []);
}

let optionValueNameCache = null;

async function getOptionValueNameMap() {
    if (optionValueNameCache) return optionValueNameCache;
    const values = await listAll("product_option_values");
    optionValueNameCache = values.reduce((acc, value) => {
        const id = getScalarValue(value?.id);
        const name = getLanguageText(value?.name);
        if (id) acc[id] = name || "";
        return acc;
    }, {});
    return optionValueNameCache;
}


// Return "0" if variant "" empty
async function resolveCombinationId(productId, variantLabel) {
    const normalizedVariant = normalizeText(variantLabel);
    if (!normalizedVariant) return "0";

    const combinations = await getProductCombinations(productId);
    if (!combinations.length) return null;

    const optionValueMap = await getOptionValueNameMap();

    for (const combo of combinations) {
        const optionValues = ensureArray(
            combo?.associations?.product_option_values?.product_option_value ?? []
        );
        const names = optionValues
            .map((opt) => optionValueMap[getScalarValue(opt?.id || opt?.["@_id"])])
            .filter(Boolean)
            .map((name) => normalizeText(name));

        if (names.includes(normalizedVariant)) {
            return getScalarValue(combo?.id);
        }
    }

    return null;
}

export async function processOrderRow(row) {
    ensureOrderRow(row);
    const customer = await ensureCustomer(row);
    const customerId = getScalarValue(customer?.id);
    if (!customerId) return {status: "skipped", reason: "Client introuvable", details: {email: row?.email}};

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
        return {
            status: "skipped",
            reason: "Achat vide ou illisible",
            details: {achat: row?.achat},
        };
    }

    const taxRateCache = {};
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
        let taxRate = 0;
        if (taxRulesGroupId) {
            if (taxRateCache[taxRulesGroupId] === undefined) {
                taxRateCache[taxRulesGroupId] = (await getTaxRateForGroup(taxRulesGroupId)) || 0;
            }
            taxRate = taxRateCache[taxRulesGroupId] || 0;
        }

        const baseHt = parseFloat(getScalarValue(product?.price) ?? "0") || 0;

        let effectiveHt = baseHt;
        if (combinationId && combinationId !== "0") {
            const comboResponse = await getList("combinations", {
                display: "full",
                filters: {id: combinationId},
                limit: "0,1",
            });
            const combo = ensureArray(comboResponse?.data?.combinations?.combination ?? [])[0];
            const deltaHt = parseFloat(getScalarValue(combo?.price) ?? "0") || 0;
            effectiveHt = baseHt + deltaHt;
        }

        const priceTtc = parseFloat((effectiveHt * (1 + taxRate / 100)).toFixed(2));

        items.push({product, quantity: achat.quantity, combinationId, priceHt: effectiveHt, priceTtc});
    }

    const currencyId = (await getFirstId("currencies")) || "1";
    const carrierId = (await getFirstId("carriers")) || "1";
    const langId = DEFAULT_LANG_ID;

    const createdDate = parseDateToIso(row?.date) + " 00:00:00";

    const cartPayload = {
        cart: {
            id_currency: currencyId,
            id_customer: customerId,
            id_lang: langId,
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
    if (!cartId) {
        throw new Error(`Creation du panier echouee (client: ${customerId})`);
    }

    // Don't create order if etat is null
    if (!row?.etat || normalizeText(getScalarValue(row?.etat)) === normalizeText("dans le panier")) {
        return {
            status: "skipped",
            reason: "Dans le panier, carte crées seulement. Etat vide: commande non creee",
            details: {cartId, email: row?.email},
        };
    }

    const stateId = await ensureState(row?.etat);
    if (!stateId) {
        throw new Error(`Etat de commande inconnu: ${row?.etat}`);
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
            id_lang: langId,
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


    if (!orderId) {
        throw new Error(`Creation de la commande echouee (cart: ${cartId})`);
    }
    // update dates :
    await patchResource("carts", cartId, {
        cart: {
            id: cartId,
            date_add: createdDate
        }

    })
    await patchResource("orders", orderId, {
        order: {
            id: orderId,
            date_add: createdDate
        }
    });

    // await createResource("order_histories", {
    //     order_history: {
    //         id_order: orderId,
    //         id_order_state: stateId,
    //     },
    // });

    return {
        status: "created",
        id: orderId,
        details: {cartId, orderId, customerId},
    };
}

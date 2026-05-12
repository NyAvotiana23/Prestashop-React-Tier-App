import {createResource, getList} from "../../api/prestashopCrud.js";
import {parseCsvNumber} from "../csvImportUtils.js";
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
const ORDER_STATE_FULL_OPTIONS = [
  {id: "1", color: "#34209E", name: "En attente du paiement par cheque", template: "cheque"},
  {id: "2", color: "#3498D8", name: "Paiement accepte", template: "payment"},
  {id: "3", color: "#3498D8", name: "En cours de preparation", template: "preparation"},
  {id: "4", color: "#01B887", name: "Expedie", template: "shipped"},
  {id: "5", color: "#01B887", name: "Livre", template: ""},
  {id: "6", color: "#2C3E50", name: "Annule", template: "order_canceled"},
  {id: "7", color: "#01B887", name: "Rembourse", template: "refund"},
  {id: "8", color: "#E74C3C", name: "Erreur de paiement", template: "payment_error"},
  {id: "9", color: "#3498D8", name: "En attente de reapprovisionnement (paye)", template: "outofstock"},
  {id: "10", color: "#34209E", name: "En attente de virement bancaire", template: "bankwire"},
  {id: "11", color: "#3498D8", name: "Paiement a distance accepte", template: "payment"},
  {id: "12", color: "#34209E", name: "En attente de reapprovisionnement (non paye)", template: "outofstock"},
  {id: "13", color: "#34209E", name: "En attente de paiement a la livraison", template: "cashondelivery"},
  {id: "14", color: "#34209E", name: "En attente de paiement", template: ""},
  {id: "15", color: "#01B887", name: "Remboursement partiel", template: ""},
  {id: "16", color: "#3498D8", name: "Paiement partiel", template: ""},
  {id: "17", color: "#3498D8", name: "Autorisation. A capturer par le marchand", template: ""},
];

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mapEtatToStateId(etat) {
  const normalized = normalizeText(etat);
  if (!normalized) return ORDER_STATE_FULL_OPTIONS[0].id;

  const match = ORDER_STATE_FULL_OPTIONS.find((option) => {
    const optionName = normalizeText(option.name);
    return normalized === optionName || normalized.includes(optionName) || optionName.includes(normalized);
  });

  return match?.id ?? ORDER_STATE_FULL_OPTIONS[0].id;
}

function parseAchat(value) {
  if (!value) return [];
  const raw = String(value).replace(/""/g, '"').trim();
  const cleaned = raw.replace(/^\[|\]$/g, "");
  const results = [];
  const regex = /\(\s*"?([^";]+)"?\s*;\s*([0-9]+)\s*;\s*"?([^";]*)"?\s*\)/g;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    results.push({
      reference: match[1],
      quantity: Number(match[2]) || 1,
      variant: match[3] ?? "",
    });
  }
  return results;
}

function splitCustomerName(fullName) {
  const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {firstname: "Client", lastname: "Import"};
  if (parts.length === 1) return {firstname: parts[0], lastname: parts[0]};
  return {firstname: parts[0], lastname: parts.slice(1).join(" ")};
}

async function ensureCustomer(row) {
  const email = String(row?.email ?? "").trim().toLowerCase();
  if (!email) return null;

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

  const payload = {
    address: {
      id_customer: customerId,
      id_country: DEFAULT_COUNTRY_ID,
      alias: "Adresse import",
      firstname,
      lastname,
      address1: rawAddress,
      address2: "",
      city: rawAddress,
      postcode: "00000",
      phone: "",
      phone_mobile: "",
    },
  };

  const response = await createResource("addresses", payload);
  return getScalarValue(response?.data?.address?.id) || "";
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
  const customer = await ensureCustomer(row);
  const customerId = getScalarValue(customer?.id);
  if (!customerId) return {skipped: true};

  const addressId = (await ensureCustomerAddress(customer, row)) || "";
  if (!addressId) return {skipped: true};

  const achats = parseAchat(row?.achat);
  if (!achats.length) return {skipped: true};

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

    const priceHt = Number(parseCsvNumber(product?.price, {decimalSeparator: ","}) || 0);
    const priceTtc = Number((priceHt * (1 + Number(taxRate) / 100)).toFixed(2));

    items.push({product, quantity: achat.quantity, combinationId, priceHt, priceTtc});
  }

  const currencyId = (await getFirstId("currencies")) || "1";
  const carrierId = (await getFirstId("carriers")) || "1";
  const langId = DEFAULT_LANG_ID;

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
            id_product_attribute: item.combinationId || 0,
            id_address_delivery: addressId,
            quantity: item.quantity,
          })),
        },
      },
    },
  };

  const cartResponse = await createResource("carts", cartPayload);
  const cartId = getScalarValue(cartResponse?.data?.cart?.id);

  const totalPaid = items
    .reduce((sum, item) => sum + item.priceTtc * item.quantity, 0)
    .toFixed(2);

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
      current_state: mapEtatToStateId(row?.etat),
      total_paid: totalPaid,
      total_paid_real: totalPaid,
      total_products: totalPaid,
      total_products_wt: totalPaid,
      conversion_rate: "1",
      associations: {
        order_rows: {
          order_row: items.map((item) => ({
            product_id: getScalarValue(item.product?.id),
            product_attribute_id: item.combinationId || "0",
            product_quantity: item.quantity,
            product_name: getLanguageText(item.product?.name) || "Produit",
            product_reference: getScalarValue(item.product?.reference) || "",
            product_price: item.priceTtc.toFixed(2),
            unit_price_tax_incl: item.priceTtc.toFixed(2),
            unit_price_tax_excl: item.priceHt.toFixed(2),
          })),
        },
      },
    },
  };

  const orderResponse = await createResource("orders", orderPayload);
  return {id: getScalarValue(orderResponse?.data?.order?.id)};
}

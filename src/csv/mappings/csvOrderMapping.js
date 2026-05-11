import {createResource} from "../../api/prestashopCrud.js";
import {parseCsvNumber} from "../csvImportUtils.js";
import {getLanguageText, getScalarValue} from "../../utils/util-functions.js";
import {
  findProductByReference,
  getCustomerAddressId,
  getCustomerByEmail,
  getFirstId,
} from "./csvMappingUtils.js";

const DEFAULT_LANG_ID = "1";
const ORDER_STATES = {
  echec: "1",
  accepte: "2",
  annule: "3",
};

function mapEtatToStateId(etat) {
  const normalized = String(etat ?? "").toLowerCase();
  if (normalized.includes("annul")) return ORDER_STATES.annule;
  if (normalized.includes("paiement accepte") || normalized.includes("paiement accepté")) {
    return ORDER_STATES.accepte;
  }
  if (normalized.includes("echec") || normalized.includes("erreur")) {
    return ORDER_STATES.echec;
  }
  return ORDER_STATES.echec;
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

export async function processOrderRow(row) {
  const customer = await getCustomerByEmail(row?.email);
  if (!customer) throw new Error(`Client introuvable: ${row?.email}`);

  const customerId = getScalarValue(customer?.id);
  const addressId = await getCustomerAddressId(customerId);
  if (!addressId) throw new Error("Adresse client introuvable.");

  const achats = parseAchat(row?.achat);
  if (!achats.length) throw new Error("Aucun achat valide.");

  const items = [];
  for (const achat of achats) {
    const product = await findProductByReference(achat.reference);
    if (!product) throw new Error(`Produit introuvable: ${achat.reference}`);

    items.push({product, quantity: achat.quantity});
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
            id_product_attribute: 0,
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
    .reduce(
      (sum, item) =>
        sum +
        Number(parseCsvNumber(item.product?.price, {decimalSeparator: ","}) || 0) *
          item.quantity,
      0
    )
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
            product_attribute_id: 0,
            product_quantity: item.quantity,
            product_name: getLanguageText(item.product?.name) || "Produit",
            product_reference: getScalarValue(item.product?.reference) || "",
            product_price: parseCsvNumber(item.product?.price, {decimalSeparator: ","}) || "0",
            unit_price_tax_incl: parseCsvNumber(item.product?.price, {decimalSeparator: ","}) || "0",
            unit_price_tax_excl: parseCsvNumber(item.product?.price, {decimalSeparator: ","}) || "0",
          })),
        },
      },
    },
  };

  const orderResponse = await createResource("orders", orderPayload);
  return {id: getScalarValue(orderResponse?.data?.order?.id)};
}

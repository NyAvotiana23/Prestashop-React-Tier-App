import {createResource, getList, updateResource} from "../../api/prestashopCrud.js";
import {parseCsvNumber, slugify, toLanguageNodes} from "../csvImportUtils.js";
import {ensureArray, getLanguageText, getScalarValue} from "../../utils/util-functions.js";

const DEFAULT_LANG_ID = "1";
const DEFAULT_PARENT_CATEGORY = "2";

export async function listAll(ref) {
  const response = await getList(ref, {
    display: "full",
    limit: "0,1000",
  });
  const node = response?.data?.[ref]?.[ref.slice(0, -1)] ?? response?.data?.[ref] ?? [];
  return ensureArray(node);
}

export async function findProductByReference(reference) {
  const response = await getList("products", {
    display: "full",
    filters: {reference},
    limit: "0,5",
  });
  const items = ensureArray(response?.data?.products?.product ?? []);
  return items.find((product) => getScalarValue(product?.reference) === String(reference));
}

export async function ensureCategory(name) {
  const normalizedName = String(name ?? "").trim();
  if (!normalizedName) return "";

  const categories = await listAll("categories");
  const match = categories.find(
    (category) =>
      getLanguageText(category?.name).toLowerCase() === normalizedName.toLowerCase()
  );

  if (match) return getScalarValue(match?.id);

  const payload = {
    category: {
      id_parent: DEFAULT_PARENT_CATEGORY,
      active: "1",
      name: toLanguageNodes(normalizedName, [DEFAULT_LANG_ID]),
      link_rewrite: toLanguageNodes(slugify(normalizedName), [DEFAULT_LANG_ID]),
    },
  };

  const response = await createResource("categories", payload);
  return getScalarValue(response?.data?.category?.id);
}

export async function ensureTax(rate) {
  const normalizedRate = parseCsvNumber(rate, {
    decimalSeparator: ",",
    stripPercent: true,
  });
  if (!normalizedRate) return "";

  const taxes = await listAll("taxes");
  const match = taxes.find(
    (tax) =>
      parseCsvNumber(tax?.rate, {decimalSeparator: ",", stripPercent: true}) === normalizedRate
  );

  if (match) return getScalarValue(match?.id);

  const payload = {
    tax: {
      rate: normalizedRate,
      active: "1",
      deleted: "0",
      name: toLanguageNodes(`Taxe ${normalizedRate}%`, [DEFAULT_LANG_ID]),
    },
  };

  const response = await createResource("taxes", payload);
  return getScalarValue(response?.data?.tax?.id);
}

export async function ensureProductOption(name) {
  if (!name) return "";
  const options = await listAll("product_options");
  const match = options.find(
    (option) => getLanguageText(option?.name).toLowerCase() === name.toLowerCase()
  );
  if (match) return getScalarValue(match?.id);

  const payload = {
    product_option: {
      name: toLanguageNodes(name, [DEFAULT_LANG_ID]),
      public_name: toLanguageNodes(name, [DEFAULT_LANG_ID]),
      group_type: "select",
      is_color_group: "0",
    },
  };

  const response = await createResource("product_options", payload);
  return getScalarValue(response?.data?.product_option?.id);
}

export async function ensureProductOptionValue(name, groupId) {
  if (!name || !groupId) return "";
  const values = await listAll("product_option_values");
  const match = values.find((value) => {
    const valueName = getLanguageText(value?.name).toLowerCase();
    const valueGroup = getScalarValue(value?.id_attribute_group);
    return valueName === name.toLowerCase() && valueGroup === String(groupId);
  });
  if (match) return getScalarValue(match?.id);

  const payload = {
    product_option_value: {
      id_attribute_group: String(groupId),
      name: toLanguageNodes(name, [DEFAULT_LANG_ID]),
      position: "0",
    },
  };

  const response = await createResource("product_option_values", payload);
  return getScalarValue(response?.data?.product_option_value?.id);
}

export async function updateStockAvailable(productId, combinationId, quantity) {
  const response = await getList("stock_availables", {
    display: "full",
    filters: {id_product: productId, id_product_attribute: combinationId},
    limit: "0,1",
  });

  const stockItem = ensureArray(response?.data?.stock_availables?.stock_available ?? [])[0];
  const stockId = getScalarValue(stockItem?.id);
  if (!stockId) return;

  await updateResource("stock_availables", stockId, {
    stock_available: {
      id: stockId,
      quantity: String(quantity),
    },
  });
}

export async function getCustomerByEmail(email) {
  const normalized = String(email ?? "").trim().toLowerCase();
  const response = await getList("customers", {
    display: "full",
    filters: {email: normalized},
    limit: "0,5",
  });
  const customers = ensureArray(response?.data?.customers?.customer ?? []);
  return customers.find(
    (customer) => getScalarValue(customer?.email).toLowerCase() === normalized
  );
}

export async function getCustomerAddressId(customerId) {
  const response = await getList("addresses", {
    display: "[id]",
    filters: {id_customer: customerId},
    limit: "0,1",
  });
  const items = ensureArray(response?.data?.addresses?.address ?? []);
  return getScalarValue(items[0]?.id || items[0]?.["@_id"]);
}

export async function getFirstId(ref) {
  const response = await getList(ref, {
    display: "[id]",
    limit: "0,1",
  });
  const node = response?.data?.[ref]?.[ref.slice(0, -1)] ?? response?.data?.[ref] ?? [];
  const items = ensureArray(node);
  return getScalarValue(items[0]?.id || items[0]?.["@_id"]);
}


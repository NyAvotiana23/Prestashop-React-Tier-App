import {createResource} from "../../api/prestashopCrud.js";
import {parseCsvNumber} from "../csvImportUtils.js";
import {getScalarValue} from "../../utils/util-functions.js";
import {
  ensureProductOption,
  ensureProductOptionValue,
  findProductByReference,
  updateStockAvailable,
} from "./csvMappingUtils.js";

export async function processCombinationRow(row) {
  const reference = row?.reference?.trim();
  if (!reference) throw new Error("Reference produit manquante.");

  const product = await findProductByReference(reference);
  if (!product) throw new Error(`Produit introuvable: ${reference}`);

  const specificity = row?.specificite || row?.["specificité"] || row?.specificite;
  const variantName = row?.karazany;

  if (!specificity || !variantName) {
    return {skipped: true};
  }

  const productId = getScalarValue(product?.id);
  const optionId = await ensureProductOption(String(specificity).trim());
  const optionValueId = await ensureProductOptionValue(String(variantName).trim(), optionId);

  const payload = {
    combination: {
      id_product: productId,
      price: parseCsvNumber(row?.prix_vente_ttc, {decimalSeparator: ","}),
      minimal_quantity: "1",
      associations: {
        product_option_values: {
          product_option_value: [{id: String(optionValueId)}],
        },
      },
    },
  };

  const response = await createResource("combinations", payload);
  const combinationId = getScalarValue(response?.data?.combination?.id);

  const stockInitial = Number(parseCsvNumber(row?.stock_initial, {decimalSeparator: ","}) || 0);
  if (combinationId && Number.isFinite(stockInitial)) {
    await updateStockAvailable(productId, combinationId, stockInitial);
  }

  return {id: combinationId};
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createResource, getList } from "../../api/prestashopCrud.js";
import { ensureArray, getScalarValue } from "../../utils/util-functions.js";
import StatusBanner from "../../components/shared/StatusBanner.jsx";
import {useCart} from "../../hooks/useCart.jsx";
import {useCustomerUser} from "../../hooks/useCustomerUser.jsx";

async function getFirstId(ref, filters) {
  const response = await getList(ref, {
    display: "[id]",
    limit: "0,1",
    filters,
  });
  const node = response?.data?.[ref]?.[ref.slice(0, -1)] ?? response?.data?.[ref] ?? [];
  const items = ensureArray(node);
  const first = items[0];
  return getScalarValue(first?.id || first?.["@_id"]);
}

async function getCustomerAddressId(customerId) {
  const response = await getList("addresses", {
    display: "[id]",
    filters: { id_customer: customerId },
    limit: "0,1",
  });
  const items = ensureArray(response?.data?.addresses?.address ?? []);
  return getScalarValue(items[0]?.id || items[0]?.["@_id"]);
}

export default function FrontCart() {
  const { items, updateQuantity, removeItem, clear, total } = useCart();
  const { customerUser } = useCustomerUser();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  async function handleCheckout() {
    if (!customerUser) return;
    if (!items.length) return;

    setStatus("loading");
    setError(null);
    setSuccess(null);

    try {
      const customerId = customerUser.id;
      const addressId = await getCustomerAddressId(customerId);
      if (!addressId) {
        throw new Error("Aucune adresse trouvee pour ce client.");
      }

      const currencyId = (await getFirstId("currencies")) || "1";
      const carrierId = (await getFirstId("carriers")) || "1";
      const langId = "1";

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
                id_product: item.id,
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

      const totalPaid = total.toFixed(2);

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
          total_paid: totalPaid,
          total_paid_real: totalPaid,
          total_products: totalPaid,
          total_products_wt: totalPaid,
          conversion_rate: "1",
          associations: {
            order_rows: {
              order_row: items.map((item) => ({
                product_id: item.id,
                product_attribute_id: 0,
                product_quantity: item.quantity,
                product_name: item.name,
                product_reference: item.reference ?? "",
                product_price: Number(item.price || 0).toFixed(2),
                unit_price_tax_incl: Number(item.price || 0).toFixed(2),
                unit_price_tax_excl: Number(item.price || 0).toFixed(2),
              })),
            },
          },
        },
      };

      await createResource("orders", orderPayload);

      clear();
      setSuccess("Commande creee avec paiement a la livraison.");
      setStatus("success");
      navigate("/orders", { replace: true });
    } catch (err) {
      setError(err?.message ?? "Impossible de valider la commande.");
      setStatus("error");
    }
  }

  if (!items.length) {
    return <p className="text-sm text-zinc-500">Votre panier est vide.</p>;
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Panier</h2>
        <p className="text-sm text-zinc-500">Validez avec paiement a la livraison.</p>
      </header>

      {error && <StatusBanner variant="error" message={error} />}
      {success && <StatusBanner variant="success" message={success} />}

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="rounded border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-zinc-900">{item.name}</p>
                <p className="text-sm text-zinc-500">Ref: {item.reference ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item.id, event.target.value)}
                  className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Retirer
                </button>
              </div>
              <p className="text-lg font-semibold text-emerald-600">
                {(Number(item.price) * item.quantity).toFixed(2)} Ar
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-zinc-200 bg-white p-4">
        <div>
          <p className="text-sm text-zinc-500">Total</p>
          <p className="text-2xl font-semibold text-zinc-900">{total.toFixed(2)} Ar</p>
        </div>
        <button
          type="button"
          disabled={status === "loading"}
          onClick={handleCheckout}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {status === "loading" ? "Validation..." : "Valider la commande"}
        </button>
      </div>
    </section>
  );
}


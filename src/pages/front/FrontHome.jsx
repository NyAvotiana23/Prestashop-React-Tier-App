import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getList } from "../../api/prestashopCrud.js";
import { ensureArray, getLanguageText, getScalarValue, isAbortError } from "../../utils/util-functions.js";
import { getTaxRateForGroup } from "../../csv/mappings/csvMappingUtils.js";
import Loading from "../../components/shared/Loading.jsx";
import StatusBanner from "../../components/shared/StatusBanner.jsx";

function normalizeProducts(data) {
  if (!data || typeof data !== "object") return [];
  const productsNode = data?.products?.product ?? data?.products ?? data?.product ?? [];
  return ensureArray(productsNode);
}

export default function FrontHome() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [taxRatesByGroup, setTaxRatesByGroup] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        setStatus("loading");
        setError(null);

        const response = await getList("products", {
          display: "full",
          limit: 24,
          sort: "[id_DESC]",
          signal: controller.signal,
        });

        if (!response?.data) {
          throw new Error("Invalid response format");
        }

        const normalized = normalizeProducts(response.data);
        const groupIds = [
          ...new Set(
            normalized
              .map((product) => getScalarValue(product?.id_tax_rules_group))
              .filter(Boolean)
              .map((id) => String(id))
          ),
        ];

        const nextTaxRates = {};
        await Promise.all(
          groupIds.map(async (groupId) => {
            try {
              const rate = await getTaxRateForGroup(groupId);
              nextTaxRates[groupId] = rate || 0;
            } catch {
              nextTaxRates[groupId] = 0;
            }
          })
        );

        setTaxRatesByGroup(nextTaxRates);
        setProducts(normalized);
        setStatus("success");
      } catch (err) {
        if (isAbortError(err, controller.signal)) return;
        setError(err);
        setStatus("error");
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  if (status === "loading") return <Loading>produits</Loading>;
  if (status === "error") {
    return (
      <StatusBanner
        variant="error"
        title="Erreur chargement produits"
        message={error?.message}
      />
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">Nouveaux produits</h2>
        <p className="text-sm text-zinc-500">Cliquez sur un produit pour voir la fiche.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const id = getScalarValue(product?.id);
          const name = getLanguageText(product?.name) || "Produit";
          const priceHtValue = parseFloat(getScalarValue(product?.price) || 0);
          const groupId = getScalarValue(product?.id_tax_rules_group);
          const taxRate = taxRatesByGroup[String(groupId)] ?? 0;
          const priceTtc = (priceHtValue * (1 + (Number(taxRate) || 0) / 100)).toFixed(2);

          return (
            <Link
              key={id}
              to={`/products/${id}`}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-900">{name}</h3>
                <p className="text-sm text-zinc-500">Ref: {getScalarValue(product?.reference) || "—"}</p>
                <p className="text-lg font-semibold text-emerald-600">{priceTtc} Ar TTC</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

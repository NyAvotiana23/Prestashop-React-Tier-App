import React, {useCallback, useEffect, useMemo, useState} from "react";
import Loading from "../components/shared/Loading.jsx";
import StatusBanner from "../components/shared/StatusBanner.jsx";
import {formatMoney, isAbortError} from "../utils/util-functions.js";
import {DEFAULT_SALES_STATE_IDS, fetchStatistics} from "../service/statistics-service.js";

const EMPTY_STATS = {
    sales: {
        count: 0,
        total_paid: 0,
        total_paid_tax_excl: 0,
        total_products_tax_incl: 0,
        total_products_tax_excl: 0,
    },
    purchases: {
        count: 0,
        total_quantity: 0,
        total_achat: 0,
    },
    purchasesLocal: {
        count: 0,
        total_quantity: 0,
        total_achat: 0,
    },
    profitGlobal: 0,
    profitLocal: 0,
    productRows: [],
    categoryRows: [],
    total: {
        totalQuantity: 0,
        totalSalesHt: 0,
        totalPurchaseHt: 0,
        totalBeneficeHt: 0
    }
};

function StatCard({label, value, helper, css}) {
    return (
        <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${css}`}>
            <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
            {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
        </div>
    );
}

function Statistics() {
    const [stats, setStats] = useState(EMPTY_STATS);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);

    const loadStats = useCallback(async (signal) => {
        try {
            setStatus("loading");
            setError(null);
            const result = await fetchStatistics({signal});
            console.log(result.categoryRows);
            setStats(result);
            setStatus("success");
        } catch (err) {
            if (isAbortError(err, signal)) return;
            setError(err);
            setStatus("error");
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        loadStats(controller.signal);
        return () => controller.abort();
    }, [loadStats]);

    const salesIds = useMemo(() => Array.from(DEFAULT_SALES_STATE_IDS).join(", "), []);

    if (status === "loading" || status === "idle") {
        return <Loading />;
    }

    return (
        <div className="space-y-6">
            <header className="space-y-2">
                <h1 className="text-2xl font-semibold text-gray-900">Statistiques</h1>
                <p className="text-sm text-gray-500">
                    Ventes validées (statuts {salesIds}) et achats issus des mouvements entrants (id_order=0, sign=+1).
                </p>
            </header>

            {status === "error" ? (
                <StatusBanner
                    variant="error"
                    title="Erreur lors du chargement des statistiques"
                    message={error?.message}
                />
            ) : null}

            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Ventes validées</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Commandes" value={stats.sales.count} />
                    <StatCard label="Total payé" value={formatMoney(stats.sales.total_paid)} helper="total_paid" />
                    <StatCard
                        label="Total HT payé"
                        value={formatMoney(stats.sales.total_paid_tax_excl)}
                        helper="total_paid_tax_excl"
                    />
                    <StatCard
                        label="Produits TTC"
                        value={formatMoney(stats.sales.total_products_tax_incl)}
                        helper="Somme des lignes (unit_price_tax_incl)"
                    />
                    <StatCard
                        label="Produits HT"
                        value={formatMoney(stats.sales.total_products_tax_excl)}
                        helper="Somme des lignes (unit_price_tax_excl)"
                        css={`bg-green-200`}
                    />
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Achats (mouvements entrants)</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Mouvements" value={stats.purchases.count} />
                    <StatCard label="Quantité totale" value={stats.purchases.total_quantity} />
                    <StatCard label="Achat global HT" value={formatMoney(stats.purchases.total_achat)} helper="price_te"
                              css={`bg-red-200`}

                    />
                    <StatCard label="Achat local HT" value={formatMoney(stats.purchasesLocal.total_achat)} helper="prix d'achat (wholesale)" css={`bg-green-200`}/>
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Bénéfice</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Bénéfice HT (par rapport au vente de commande valide)"
                        value={formatMoney(stats.profitLocal)}
                        helper="Produits HT - achats locaux HT"
                        css={`bg-green-200`}
                    />
                    <StatCard
                        label="Bénéfice HT (par rapport au mouvements de stock entrée)"
                        value={formatMoney(stats.profitGlobal)}
                        helper="Produits HT - achats globaux HT"
                        css={`bg-red-200`}
                    />
                </div>
            </section>
            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Total Quantité vendue</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Quantité totale"
                        value={stats.total.totalQuantity}
                        css={`bg-green-200`}
                    />
                    <StatCard
                        label="Total vente HT"
                        value={formatMoney(stats.total.totalSalesHt)}
                        css={`bg-red-200`}
                    />
                    <StatCard
                        label="Total Achat Locale HT"
                        value={formatMoney(stats.total.totalPurchaseHt)}
                        css={`bg-red-200`}
                    />
                    <StatCard
                        label="Total Benefice HT"
                        value={formatMoney(stats.total.totalBeneficeHt)}
                        css={`bg-red-200`}
                    />
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
                    Statistiques par Categorie
                </h2>
                {stats.categoryRows.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucune donnée produit disponible.</p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Catégorie</th>
                                <th className="px-4 py-3 text-left">Quantité</th>
                                <th className="px-4 py-3 text-left">Vente Ht</th>
                                <th className="px-4 py-3 text-right">Achat Local Ht </th>
                                <th className="px-4 py-3 text-right">Bénéfice Local Ht</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                            {stats.categoryRows.map((row) => (
                                <tr key={row.productId}>
                                    <td className="px-4 py-3 text-gray-700">{row.categoryName}</td>
                                    <td className="px-4 py-3 text-gray-700">{row.quantity}</td>
                                    <td className="px-4 py-3 text-right">{formatMoney(row.salesHt)}</td>
                                    <td className="px-4 py-3 text-right">{formatMoney(row.achatLocalHt)}</td>
                                    <td className="px-4 py-3 text-right">{formatMoney(row.beneficeLocalHt)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
                    Statistiques par produit (groupé par catégorie)
                </h2>
                {stats.productRows.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucune donnée produit disponible.</p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">Catégorie</th>
                                    <th className="px-4 py-3 text-left">Produit</th>
                                    <th className="px-4 py-3 text-left">Qauntité</th>
                                    <th className="px-4 py-3 text-right">Vente HT</th>
                                    <th className="px-4 py-3 text-right">Achat HT local</th>
                                    <th className="px-4 py-3 text-right">Bénéfice HT local</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {stats.productRows.map((row) => (
                                    <tr key={row.productId}>
                                        <td className="px-4 py-3 text-gray-700">{row.categoryName}</td>
                                        <td className="px-4 py-3 text-gray-900">{row.productName}</td>
                                        <td className="px-4 py-3 text-gray-900">{row.quantity}</td>
                                        <td className="px-4 py-3 text-right">{formatMoney(row.salesHt)}</td>
                                        <td className="px-4 py-3 text-right">{formatMoney(row.achatLocalHt)}</td>
                                        <td className="px-4 py-3 text-right">{formatMoney(row.beneficeLocalHt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default Statistics;
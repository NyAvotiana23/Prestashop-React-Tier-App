import {useState} from 'react';
import {API_URLS} from "../constants/apiData.js";
import {resetDatabase} from "../api/prestashopCrud.js";
import {clearAllCaches} from "../csv/mappings/cache.js";

const RESET_PRIORITY = [
    {ref: "customers", priority: 0},
    {ref: "products", priority: 0},
    {ref: "stock_movements", priority: 0},
    {ref: "categories", priority: 0},
    {ref: "orders", priority: 1},
    {ref: "order_details", priority: 1},
    {ref: "order_carriers", priority: 1},
    {ref: "order_cart_rules", priority: 1},
    {ref: "order_histories", priority: 1},
    {ref: "order_invoices", priority: 1},
    {ref: "order_payments", priority: 1},
    {ref: "order_slip", priority: 1},
    {ref: "tax_rules", priority: 1},
    {ref: "tax_rule_groups", priority: 1},
    {ref: "taxes", priority: 1},
    {ref: "carts", priority: 2},
];

function ResetDatabase() {
    const apiByRef = Object.fromEntries(API_URLS.map((api) => [api.ref, api]));
    const resetRefs = RESET_PRIORITY
        .map((item, index) => ({...item, index}))
        .sort((a, b) => a.priority - b.priority || a.index - b.index)
        .map((item) => item.ref)
        .filter((ref) => apiByRef[ref]);
    const resetApis = resetRefs.map((ref) => apiByRef[ref]);

    const [checkedItems, setCheckedItems] = useState(
        Object.fromEntries(resetApis.map(api => [api.ref, true]))
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastReport, setLastReport] = useState(null);

    const allChecked = Object.values(checkedItems).every(Boolean);

    function handleCheckAll() {
        setCheckedItems(Object.fromEntries(resetApis.map(api => [api.ref, !allChecked])));
    }

    function handleCheckItem(ref) {
        setCheckedItems(prev => ({...prev, [ref]: !prev[ref]}));
    }

    function summarizeReport(report) {
        if (!Array.isArray(report)) return null;

        return report.reduce(
            (acc, item) => {
                acc.totalResources += 1;
                acc.totalIds += item.ids?.length ?? 0;
                acc.totalDeleted += item.deleted?.length ?? 0;
                if (item.listError || (item.errors && item.errors.length > 0)) {
                    acc.totalErrors += 1;
                }
                return acc;
            },
            {totalResources: 0, totalIds: 0, totalDeleted: 0, totalErrors: 0}
        );
    }

    async function handleDeleteSubmit(e) {
        e.preventDefault();
        const refs = resetRefs.filter(ref => checkedItems[ref]);
        if (refs.length === 0) {
            alert("Aucune ressource selectionnee.");
            return;
        }
        if (!window.confirm("Etes-vous sur de vouloir reinitialiser la base de donnees ?")) {
            return;
        }
        try {
            setIsSubmitting(true);
            setLastReport(null);
            const report = await resetDatabase(refs);
            setLastReport(report);

            const summary = summarizeReport(report);
            if (summary && summary.totalErrors > 0) {
                alert("Reinitialisation terminee avec erreurs. Consultez le resume ci-dessous.");
            } else {
                alert("Base de donnees reinitialisee avec succes.");
            }
        } catch (error) {
            console.error(error);
            alert("Echec de la reinitialisation. Verifiez la console.");
        } finally {
            setIsSubmitting(false);
            clearAllCaches();
        }
    }

    const summary = summarizeReport(lastReport);

    return (

        <div className="p-4">

            <h2 className="text-2xl font-bold mb-4">Reset Database Page</h2>
            {summary && (
                <div className="rounded border border-gray-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-gray-900">Resume</h3>
                    <p className="mt-2 text-sm text-gray-700">
                        {summary.totalDeleted} elements supprimes sur {summary.totalIds} a
                        travers {summary.totalResources} ressources.
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                        {lastReport.map((item) => (
                            <div key={item.ref} className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-gray-900">{item.ref}</span>
                                {item.listError ? (
                                    <span className="text-red-600">Liste impossible: {item.listError.message}</span>
                                ) : (
                                    <span>
                                        {item.deleted.length} supprimes / {item.ids.length} total
                                        {item.errors.length > 0 ? ` — ${item.errors.length} erreurs` : ""}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <form onSubmit={handleDeleteSubmit} className="mb-4">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`p-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                    {isSubmitting ? "En cours..." : "Valider"}
                </button>
                <table className="min-w-full bg-white border border-gray-200">
                    <thead>
                    <tr className="bg-gray-100 text-gray-700 uppercase text-sm leading-normal">
                        <th className="py-3 px-6 text-left">Name</th>
                        <th className="py-3 px-6 text-left">Base Url</th>
                        <th className="py-3 px-6 text-left">Ref</th>
                        <th className="py-3 px-6 text-left">Description</th>
                        <th className="py-3 px-6 text-center">
                            Delete
                            <button type="button" onClick={handleCheckAll} className="ml-2 text-xs text-gray-500">
                                {allChecked ? 'Uncheck all' : 'Check all'}
                            </button>
                        </th>
                    </tr>
                    </thead>
                    <tbody className="text-gray-600 text-sm font-medium">
                    {resetApis.map((api, i) =>
                        <tr key={i} className="hover:bg-gray-50 transition-all duration-300">
                            <td className="py-3 px-6">{api.name}</td>
                            <td className="py-3 px-6">{api.baseUrl}</td>
                            <td className="py-3 px-6">{api.ref}</td>
                            <td className="py-3 px-6">{api.description}</td>
                            <td className="py-3 px-6 text-center">
                                <input
                                    type={"checkbox"}
                                    checked={checkedItems[api.ref] ?? false}
                                    onChange={() => handleCheckItem(api.ref)}
                                    className="form-checkbox h-5 w-5 text-blue-600"
                                />
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </form>

        </div>
    );
}

export default ResetDatabase;


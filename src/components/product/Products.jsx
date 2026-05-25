import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import Loading from "../shared/Loading.jsx";
import StatusBanner from "../shared/StatusBanner.jsx";
import {getLanguageText, getScalarValue, isAbortError} from "../../utils/util-functions.js";
import {deleteProductById, listProducts} from "../../service/product-service.js";

export default function Products() {
    const [products, setProducts] = useState([]);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");

    const [deletedId, setDeletedId] = useState(null);

    async function handleDeleteProduct(e, productId) {
        if (!window.confirm(`Delete product : ${productId}`)) return;
        try {
            await deleteProductById(productId);
            setDeletedId(productId);
        } catch (err) {
            setError(err);
            setStatus("error");
        }

    }

    useEffect(() => {
        const controller = new AbortController();

        async function loadProducts() {
            try {
                setStatus("loading");
                setError(null);
                setSuccessMessage("");


                const items = await listProducts({
                    display: "full",
                    limit: 50,
                    sort: "[id_ASC]",
                    signal: controller.signal,
                });


                setProducts(items);
                setStatus("success");
                setSuccessMessage(`Loaded ${items.length} products.`);
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setError(err);
                setStatus("error");
            }
        }

        loadProducts();
        return () => controller.abort();
    }, [deletedId]);

    if (status === "loading") return <Loading>products</Loading>;

    if (status === "error") {
        return (
            <StatusBanner
                variant="error"
                title="Failed to load products"
                message={error?.message}
            />
        );
    }

    if (!products.length) {
        return <p className="text-gray-500">No products found.</p>;
    }

    return (
        <section className="space-y-4">
            <header className="space-y-3">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
                    <p className="text-gray-500">Browse products from the PrestaShop API.</p>
                </div>
                <StatusBanner variant="success" message={successMessage}/>
            </header>
            <div className="overflow-x-auto rounded border border-gray-200">
                <table className="w-full min-w-[800px] border-collapse text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Manufacturer
                            name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                        <th className="px-4 py-3"/>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                    {products.map((product) => {

                        const id = getScalarValue(product?.id);
                        const name = getLanguageText(product?.name) || "Untitled product";
                        const price = parseFloat(getScalarValue(product?.price) || 0).toFixed(2);
                        const active = String(getScalarValue(product?.active)) === "1";
                        const description = getLanguageText(product?.description) || "Untitled description";
                        const reference = getScalarValue(product?.reference) || "—";
                        const manufacturerName = getScalarValue(product?.manufacturer_name) || "—";

                        return (
                            <tr key={id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs text-gray-400">{id}</td>
                                <td className="max-w-[260px] truncate px-4 py-3 font-medium text-gray-900">{name}</td>
                                <td className="max-w-[260px] truncate px-4 py-3 font-medium text-gray-900">{reference}</td>
                                <td className="max-w-[260px] truncate px-4 py-3 font-medium text-gray-900">{manufacturerName}</td>
                                <td className="max-w-[260px] truncate px-4 py-3 font-medium text-gray-900">
                                    <span dangerouslySetInnerHTML={{__html: description}}/>
                                </td>
                                <td className="px-4 py-3 font-mono text-gray-800">{price}</td>
                                <td className="px-4 py-3">
                                    {active ? (
                                        <span
                                            className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                                    ) : (
                                        <span
                                            className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                        Inactive
                      </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 space-x-4">
                                    <Link
                                        to={`${id}`}
                                        className="inline-flex items-center rounded bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
                                    >
                                        View
                                    </Link>
                                    <button onClick={(e) => handleDeleteProduct(e, id)}
                                            className="inline-flex items-center rounded bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
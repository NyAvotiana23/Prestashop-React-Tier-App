import React, {useEffect, useMemo, useState} from "react";
import {Link, useParams} from "react-router-dom";
import Loading from "../shared/Loading.jsx";
import StatusBanner from "../shared/StatusBanner.jsx";
import Modal from "../shared/Modal.jsx";
import UrlDescriptionCard from "../shared/UrlDescriptionCard.jsx";
import {getById} from "../../api/prestashopCrud.js";
import {getLanguageText, getScalarValue, isAbortError} from "../../utils/util-functions.js";

export default function ProductDetail() {
    const {productId} = useParams();
    const [product, setProduct] = useState(null);
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [selectedResource, setSelectedResource] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        async function loadProduct() {
            if (!productId) return;

            try {
                setStatus("loading");
                setError(null);
                setSuccessMessage("");

                const response = await getById("products", productId, {
                    signal: controller.signal,
                });

                // Fix #6: getJson (via parseXml) already strips the <prestashop> wrapper,
                // so response.data is already the inner object — e.g. { product: {…} }.
                // The old double-unwrap (data?.prestashop ?? data) was harmless by accident
                // but fragile. Access the product node directly.
                const nextProduct = response?.data?.product ?? null;
                setProduct(nextProduct);
                setStatus("success");
                setSuccessMessage(nextProduct ? "Product loaded successfully." : "Product not found.");
            } catch (err) {
                if (isAbortError(err, controller.signal)) return;
                setError(err);
                setStatus("error");
            }
        }

        loadProduct();

        return () => controller.abort();
    }, [productId]);

    const content = useMemo(() => {
        if (status === "loading") {
            return <Loading>product</Loading>;
        }

        if (status === "error") {
            return (
                <StatusBanner
                    variant="error"
                    title="Failed to load product"
                    message={error?.message}
                />
            );
        }

        if (!product) {
            return <p className="text-gray-600">Product not found.</p>;
        }

        const name = getLanguageText(product?.name) || "Untitled product";
        const description = getLanguageText(product?.description);

        // Fix #7: product.id and product.reference may be objects { "#text": "4" }
        // from fast-xml-parser — always unwrap with getScalarValue.
        const id = getScalarValue(product?.id);
        const reference = getScalarValue(product?.reference);

        // Fix #8: price in the detail view was rendered raw. Apply the same
        // scalar unwrap + float formatting used in the list view.
        const price = parseFloat(getScalarValue(product?.price) || 0).toFixed(2);

        const fields = [
            {label: "Default category", value: product?.id_category_default, link: true},
            {label: "Manufacturer", value: product?.id_manufacturer, link: true},
            {label: "Supplier", value: product?.id_supplier, link: true},
            {label: "Tax rules group", value: product?.id_tax_rules_group, link: true},
            {label: "Default image", value: product?.id_default_image, link: true},
            {label: "Default combination", value: product?.id_default_combination, link: true},
        ];

        function formatValue(value) {
            if (value === null || value === undefined) return "";
            if (typeof value !== "object") return String(value);
            if (Array.isArray(value)) return JSON.stringify(value);
            if (value.value !== undefined) return String(value.value ?? "");
            return JSON.stringify(value);
        }

        return (
            <div className="space-y-6">
                <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                    <header className="space-y-2">
                        <h1 className="text-2xl font-semibold text-gray-900">{name}</h1>
                        <p className="text-sm text-gray-500">ID: {id}</p>
                    </header>

                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                        {reference && <p>Ref: {reference}</p>}
                        {price !== "0.00" && <p>Price: ${price}</p>}
                        {product?.active !== undefined && (
                            <p>
                                Status:{" "}
                                {getScalarValue(product.active) === "1" ? "Active" : "Disabled"}
                            </p>
                        )}
                    </div>

                    {description && (
                        <div className="mt-6">
                            <h2 className="text-lg font-semibold text-gray-900">Description</h2>
                            <span
                                className="mt-2 text-sm text-gray-700"
                                dangerouslySetInnerHTML={{__html: description}}
                            />
                        </div>
                    )}
                </div>

                <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Linked resources</h2>
                    <div className="mt-4 divide-y divide-gray-100">
                        <div>
                            <button
                                type="button"
                                onClick={() => setSelectedResource(product?.id_default_image)}
                                className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"

                            >
                                Open default image : {getScalarValue(product?.id_default_image)}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedResource(product?.id_default_combination)}
                                className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"

                            >
                                Open default combination : {getScalarValue(product?.id_default_combination)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }, [product, status, error]);

    return (
        <section className="space-y-6">
            <Link
                to="/catalog/products"
                className="inline-flex items-center text-sm font-semibold text-red-600 hover:text-red-700"
            >
                Back to products
            </Link>
            <StatusBanner variant="success" message={successMessage}/>
            {content}
            <Modal
                isOpen={Boolean(selectedResource)}
                title="Linked resource"
                onClose={() => setSelectedResource(null)}
            >
                <UrlDescriptionCard node={selectedResource}/>
            </Modal>
        </section>
    );
}
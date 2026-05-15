import {useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";

import {createResource, getList} from "../../api/prestashopCrud.js";
import {ensureArray, getLanguageText, getScalarValue} from "../../utils/util-functions.js";
import StatusBanner from "../../components/shared/StatusBanner.jsx";
import {useCart} from "../../hooks/useCart.jsx";
import {useCustomerUser} from "../../hooks/useCustomerUser.jsx";
import {useDefaultValues} from "../../hooks/useDefaultValues.jsx";

const DEFAULT_COUNTRY_ID = "8";


function buildAddressLabel(address) {
    const alias = getScalarValue(address?.alias) || "Adresse";
    const address1 = getScalarValue(address?.address1) || "";
    const city = getScalarValue(address?.city) || "";
    return `${alias} - ${address1}${city ? `, ${city}` : ""}`.trim();
}

function buildInitialAddressForm(customerUser) {
    return {
        alias: "",
        firstname: customerUser?.firstname ?? "",
        lastname: customerUser?.lastname ?? "",
        address1: "",
        address2: "",
        city: "",
        postcode: "",
        phone: "",
    };
}

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
        filters: {id_customer: customerId},
        limit: "0,1",
    });
    const items = ensureArray(response?.data?.addresses?.address ?? []);
    return getScalarValue(items[0]?.id || items[0]?.["@_id"]);
}

async function getCustomerAddresses(customerId) {
    const response = await getList("addresses", {
        display: "full",
        filters: {id_customer: customerId},
        limit: "0,10",
    });
    return ensureArray(response?.data?.addresses?.address ?? []);
}

async function getTaxRateForGroup(taxRulesGroupId) {
    if (!taxRulesGroupId) return 0;

    const rulesResponse = await getList("tax_rules", {
        display: "full",
        filters: {id_tax_rules_group: String(taxRulesGroupId)},
        limit: "0,1",
    });
    const rule = ensureArray(rulesResponse?.data?.tax_rules?.tax_rule ?? [])[0];
    const taxId = getScalarValue(rule?.id_tax);
    if (!taxId) return 0;

    const taxResponse = await getList("taxes", {
        display: "full",
        filters: {id: taxId},
        limit: "0,1",
    });
    const tax = ensureArray(taxResponse?.data?.taxes?.tax ?? [])[0];
    return parseFloat(getScalarValue(tax?.rate) ?? "0");
}

async function getProductPricing(productId, combinationId) {
    const productResponse = await getList("products", {
        display: "full",
        filters: {id: productId},
        limit: "0,1",
    });
    const product = ensureArray(productResponse?.data?.products?.product ?? [])[0];
    if (!product) {
        throw new Error(`Produit introuvable: ${productId}`);
    }

    const taxRulesGroupId = getScalarValue(product?.id_tax_rules_group);
    const taxRate = taxRulesGroupId ? await getTaxRateForGroup(taxRulesGroupId) : 0;
    const baseHt = parseFloat(getScalarValue(product?.price) ?? "0") || 0;

    let effectiveHt = baseHt;
    if (combinationId && String(combinationId) !== "0") {
        const comboResponse = await getList("combinations", {
            display: "full",
            filters: {id: combinationId},
            limit: "0,1",
        });
        const combo = ensureArray(comboResponse?.data?.combinations?.combination ?? [])[0];
        const deltaHt = parseFloat(getScalarValue(combo?.price) ?? "0") || 0;
        effectiveHt = baseHt + deltaHt;
    }

    const priceTtc = effectiveHt * (1 + taxRate / 100);
    return {priceHt: effectiveHt, priceTtc};
}

export default function FrontCart() {
    const {defaultCurrency} = useDefaultValues();
    const {items, updateQuantity, removeItem, clear, total} = useCart();
    const {customerUser} = useCustomerUser();
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const navigate = useNavigate();
    const [selectedAddressId, setSelectedAddressId] = useState("");
    const [addresses, setAddresses] = useState([]);
    const [addressForm, setAddressForm] = useState(() => buildInitialAddressForm(customerUser));
    const [isSavingAddress, setIsSavingAddress] = useState(false);

    const loadAddresses = useCallback(async () => {
        if (!customerUser?.id) return;
        const fetched = await getCustomerAddresses(customerUser.id);
        setAddresses(fetched);
        if (!selectedAddressId && fetched.length) {
            const firstId = getScalarValue(fetched[0]?.id || fetched[0]?.["@_id"]);
            setSelectedAddressId(firstId || "");
        }
    }, [customerUser?.id, selectedAddressId]);

    useEffect(() => {
        loadAddresses();
    }, [loadAddresses]);

    useEffect(() => {
        setAddressForm((prev) => ({
            ...prev,
            firstname: customerUser?.firstname ?? "",
            lastname: customerUser?.lastname ?? "",
        }));
    }, [customerUser?.firstname, customerUser?.lastname]);

    async function handleCreateAddress(event) {
        event.preventDefault();
        if (!customerUser?.id) return;

        const required = ["alias", "firstname", "lastname", "address1", "city", "postcode"];
        const missing = required.filter((key) => !String(addressForm[key] ?? "").trim());
        if (missing.length) {
            setError("Veuillez remplir tous les champs obligatoires.");
            return;
        }

        setIsSavingAddress(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                address: {
                    id_customer: customerUser.id,
                    id_country: DEFAULT_COUNTRY_ID,
                    alias: addressForm.alias.trim(),
                    firstname: addressForm.firstname.trim(),
                    lastname: addressForm.lastname.trim(),
                    address1: addressForm.address1.trim(),
                    address2: addressForm.address2.trim(),
                    city: addressForm.city.trim(),
                    postcode: addressForm.postcode.trim(),
                    phone: addressForm.phone.trim(),
                    phone_mobile: addressForm.phone.trim(),
                },
            };

            const response = await createResource("addresses", payload);
            const newId = getScalarValue(response?.data?.address?.id);
            await loadAddresses();
            if (newId) setSelectedAddressId(newId);
            setAddressForm(buildInitialAddressForm(customerUser));
            setSuccess("Adresse creee avec succes.");
        } catch (err) {
            setError(err?.message ?? "Impossible de creer l'adresse.");
        } finally {
            setIsSavingAddress(false);
        }
    }

    async function buildOrderRowsFromItems(cartItems) {
        const orderRows = await Promise.all(
            cartItems.map(async (item) => {
                const productId = item.productId ?? item.id;
                const combinationId = item.productAttributeId ?? 0;
                const pricing = await getProductPricing(productId, combinationId);
                return {
                    product_id: productId,
                    product_attribute_id: combinationId,
                    product_quantity: item.quantity,
                    product_name: item.name,
                    product_reference: item.reference ?? "",
                    product_price: pricing.priceTtc.toFixed(6),
                    unit_price_tax_incl: pricing.priceTtc.toFixed(6),
                    unit_price_tax_excl: pricing.priceHt.toFixed(6),
                };
            })
        );

        const totalPaid = orderRows
            .reduce(
                (sum, row) => sum + Number(row.unit_price_tax_incl) * Number(row.product_quantity || 0),
                0
            )
            .toFixed(6);

        return {orderRows, totalPaid};
    }

    async function buildCartPayload(addressId) {
        const currencyId = (await getFirstId("currencies")) || "1";
        const carrierId = (await getFirstId("carriers")) || "1";
        const langId = "1";

        return {
            cart: {
                id_currency: currencyId,
                id_customer: customerUser.id,
                id_lang: langId,
                id_address_delivery: addressId,
                id_address_invoice: addressId,
                id_carrier: carrierId,
                associations: {
                    cart_rows: {
                        cart_row: items.map((item) => ({
                            id_product: item.productId ?? item.id,
                            id_product_attribute: item.productAttributeId ?? 0,
                            id_address_delivery: addressId,
                            quantity: item.quantity,
                        })),
                    },
                },
            },
        };
    }

    function handleCartClear () {
        if (!window.confirm("Reinitialiser la cart ?")) return;
        clear();
    }
    async function handleCreateCartOnly() {
        if (!customerUser || !items.length) return;

        setStatus("loading");
        setError(null);
        setSuccess(null);

        try {
            const customerId = customerUser.id;
            const addressId = selectedAddressId || (await getCustomerAddressId(customerId));
            if (!addressId) {
                throw new Error("Aucune adresse trouvee pour ce client.");
            }

            const cartPayload = await buildCartPayload(addressId);
            const cartResponse = await createResource("carts", cartPayload);
            const cartId = getScalarValue(cartResponse?.data?.cart?.id);

            clear();
            setSuccess(`Panier cree (ID: ${cartId || "?"}).`);
            setStatus("success");
        } catch (err) {
            setError(err?.message ?? "Impossible de creer le panier.");
            setStatus("error");
        }
    }

    async function handleCheckout() {
        if (!customerUser || !items.length) return;

        setStatus("loading");
        setError(null);
        setSuccess(null);

        try {
            const customerId = customerUser.id;
            const addressId = selectedAddressId || (await getCustomerAddressId(customerId));
            if (!addressId) {
                throw new Error("Aucune adresse trouvee pour ce client.");
            }

            const cartPayload = await buildCartPayload(addressId);
            const cartResponse = await createResource("carts", cartPayload);
            const cartId = getScalarValue(cartResponse?.data?.cart?.id);

            const currencyId = cartPayload.cart.id_currency;
            const carrierId = cartPayload.cart.id_carrier;
            const langId = cartPayload.cart.id_lang;

            const {orderRows, totalPaid} = await buildOrderRowsFromItems(items);

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
                            order_row: orderRows,
                        },
                    },
                },
            };

            await createResource("orders", orderPayload);

            clear();
            setSuccess("Commande creee avec paiement a la livraison.");
            setStatus("success");
            navigate("/orders", {replace: true});
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

            {error && <StatusBanner variant="error" message={error}/>}
            {success && <StatusBanner variant="success" message={success}/>}

            <div className="space-y-6">
                <section className="space-y-3 rounded border border-zinc-200 bg-white p-4">
                    <h3 className="text-lg font-semibold">Selectionner une adresse</h3>
                    {addresses.length ? (
                        <select
                            value={selectedAddressId}
                            onChange={(event) => setSelectedAddressId(event.target.value)}
                            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                        >
                            {addresses.map((address) => {
                                const id = getScalarValue(address?.id || address?.["@_id"]);
                                return (
                                    <option key={id} value={id}>
                                        {buildAddressLabel(address)}
                                    </option>
                                );
                            })}
                        </select>
                    ) : (
                        <p className="text-sm text-zinc-500">Aucune adresse existante pour ce compte.</p>
                    )}
                </section>

                <section className="space-y-3 rounded border border-zinc-200 bg-white p-4">
                    <h3 className="text-lg font-semibold">Creer une nouvelle adresse</h3>
                    <form onSubmit={handleCreateAddress} className="grid gap-3 md:grid-cols-2">
                        <label className="flex flex-col gap-1 text-sm">
                            Alias *
                            <input
                                value={addressForm.alias}
                                onChange={(event) => setAddressForm((prev) => ({...prev, alias: event.target.value}))}
                                className="rounded border border-zinc-300 px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                            Prenom *
                            <input
                                value={addressForm.firstname}
                                onChange={(event) => setAddressForm((prev) => ({
                                    ...prev,
                                    firstname: event.target.value
                                }))}
                                className="rounded border border-zinc-300 px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                            Nom *
                            <input
                                value={addressForm.lastname}
                                onChange={(event) => setAddressForm((prev) => ({
                                    ...prev,
                                    lastname: event.target.value
                                }))}
                                className="rounded border border-zinc-300 px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                            Adresse *
                            <input
                                value={addressForm.address1}
                                onChange={(event) => setAddressForm((prev) => ({
                                    ...prev,
                                    address1: event.target.value
                                }))}
                                className="rounded border border-zinc-300 px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                            Ville *
                            <input
                                value={addressForm.city}
                                onChange={(event) => setAddressForm((prev) => ({...prev, city: event.target.value}))}
                                className="rounded border border-zinc-300 px-3 py-2"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                            Code postal *
                            <input
                                value={addressForm.postcode}
                                onChange={(event) => setAddressForm((prev) => ({
                                    ...prev,
                                    postcode: event.target.value
                                }))}
                                className="rounded border border-zinc-300 px-3 py-2"
                            />
                        </label>
                        <div className="md:col-span-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSavingAddress}
                                className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {isSavingAddress ? "Creation..." : "Creer l'adresse"}
                            </button>
                        </div>
                    </form>
                </section>
            </div>

            <div className="space-y-4">
                {items.map((item) => (
                    <div key={item.lineId} className="rounded border border-zinc-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-lg font-semibold text-zinc-900">{item.name}</p>
                                <p className="text-sm text-zinc-500">Ref: {item.reference ?? "—"}</p>
                                {item.variantLabel && (
                                    <p className="text-xs text-zinc-500">{item.variantLabel}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(event) => updateQuantity(item.lineId, event.target.value)}
                                    className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.lineId)}
                                    className="text-sm text-red-600 hover:text-red-700"
                                >
                                    Retirer
                                </button>
                            </div>
                            <p className="text-lg font-semibold text-emerald-600">
                                {(Number(item.price) * item.quantity).toFixed(2)}  {getLanguageText(defaultCurrency?.symbol)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div
                className="flex flex-wrap items-center justify-between gap-4 rounded border border-zinc-200 bg-white p-4">
                <div>
                    <p className="text-sm text-zinc-500">Total</p>
                    <p className="text-2xl font-semibold text-zinc-900">{total.toFixed(2)}  {getLanguageText(defaultCurrency?.symbol)} </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        disabled={status === "loading"}
                        onClick={handleCartClear}
                        className="rounded border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        disabled={status === "loading"}
                        onClick={handleCreateCartOnly}
                        className="rounded border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                    >
                        {status === "loading" ? "Creation..." : "Creer le panier"}
                    </button>
                    <button
                        type="button"
                        disabled={status === "loading"}
                        onClick={handleCheckout}
                        className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {status === "loading" ? "Validation..." : "Valider la commande"}
                    </button>
                </div>
            </div>
        </section>
    );
}

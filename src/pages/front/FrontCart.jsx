import {useCallback, useEffect, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";

import {getLanguageText, getScalarValue} from "../../utils/util-functions.js";
import {getDateTimeString} from "../../utils/date-utils.jsx";
import StatusBanner from "../../components/shared/StatusBanner.jsx";
import {useCart} from "../../hooks/useCart.jsx";
import {useCustomerUser} from "../../hooks/useCustomerUser.jsx";
import {useDefaultValues} from "../../hooks/useDefaultValues.jsx";
import {
    createCustomerAddress,
    getCustomerAddressId,
    getCustomerAddresses,
} from "../../service/customer-service.js";
import {buildCartPayload, createNewCart} from "../../service/cart-service.js";
import {buildOrderPayloadFromCart, buildOrderRowsFromItems, createOrder} from "../../service/order-service.js";
import {DEFAULT_CARRIER_ID, DEFAULT_CURRENCY_ID, DEFAULT_LANG_ID} from "../../service/default-values-service.js";

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

export default function FrontCart() {
    const currencyId = DEFAULT_CURRENCY_ID;
    const carrierId = DEFAULT_CARRIER_ID;
    const langId = DEFAULT_LANG_ID;

    const {defaultCurrency} = useDefaultValues();
    const {items, updateQuantity, removeItem, clear, total} = useCart();
    const {customerUser} = useCustomerUser();
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedAddressId, setSelectedAddressId] = useState("");
    const [addresses, setAddresses] = useState([]);
    const [addressForm, setAddressForm] = useState(() => buildInitialAddressForm(customerUser));
    const [isSavingAddress, setIsSavingAddress] = useState(false);
    const isAnonymUser = customerUser?.isAnonymUser;

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

            const newAddress = await createCustomerAddress(payload.address);
            const newId = getScalarValue(newAddress?.id);
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
    function handleCartClear () {
        if (!window.confirm("Reinitialiser la cart ?")) return;
        clear();
    }
    async function handleCreateCartOnly() {
        if (!customerUser || !items.length) return;
        if (isAnonymUser) {
            setError("Veuillez vous connecter avec un autre compte pour creer un panier.");
            setStatus("error");
            return;
        }

        setStatus("loading");
        setError(null);
        setSuccess(null);

        try {
            const customerId = customerUser.id;
            const addressId = selectedAddressId || (await getCustomerAddressId(customerId));




            if (!addressId) {
                throw new Error("Aucune adresse trouvee pour ce client.");
            }

            const cartPayload = buildCartPayload(
                {
                    items,
                    customerId: customerUser.id,
                    addressId,
                    currencyId,
                    carrierId,
                    langId,
                }
            );
            const cartId = await createNewCart(cartPayload);

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
        if (isAnonymUser) {
            setError("Veuillez vous connecter avec un autre compte pour valider la commande.");
            setStatus("error");
            return;
        }

        setStatus("loading");
        setError(null);
        setSuccess(null);

        try {
            const customerId = customerUser.id;
            const addressId = selectedAddressId || (await getCustomerAddressId(customerId));
            if (!addressId) {
                throw new Error("Aucune adresse trouvee pour ce client.");
            }

            const cartPayload = buildCartPayload(
                {
                    items,
                    customerId: customerUser.id,
                    addressId,
                    currencyId,
                    carrierId,
                    langId,
                }
            );
            const cartId = await createNewCart(cartPayload);

            const currencyId = cartPayload.cart.id_currency;
            const carrierId = cartPayload.cart.id_carrier;
            const langId = cartPayload.cart.id_lang;

            const {orderRows, totalPaid, enrichedRows} = await buildOrderRowsFromItems(items);
            const orderPayload = buildOrderPayloadFromCart({
                cartId,
                addressId,
                currencyId,
                langId,
                customerId,
                carrierId,
                totalPaid,
            });

            const orderId = await createOrder(orderPayload);

            // // Record a stock decrement movement for each ordered line
            // const dateAdd = getDateTimeString();
            // for (const row of enrichedRows) {
            //     try {
            //         await recordStockMovementForOrderRow({
            //             productId: row._productId,
            //             combinationId: row._combinationId,
            //             orderId: orderId || "0",
            //             quantity: row._quantity,
            //             priceHt: row._priceHt,
            //             dateAdd,
            //         });
            //     } catch (err) {
            //         console.error(
            //             `Stock movement failed for product ${row._productId} / combo ${row._combinationId}:`,
            //             err
            //         );
            //     }
            // }

            clear();
            setSuccess("Commande creee avec paiement a la livraison.");
            setStatus("success");
            navigate("/orders", {replace: true});
        } catch (err) {
            setError(err?.message ?? "Impossible de valider la commande.");
            setStatus("error");
        }
    }

    function handleSwitchUser() {
        navigate("/select_user", {state: {from: location}});
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
            {isAnonymUser && (
                <StatusBanner
                    variant="warning"
                    message="Connectez-vous avec un autre compte pour creer un panier ou valider la commande."
                />
            )}

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
                    {isAnonymUser && (
                        <button
                            type="button"
                            onClick={handleSwitchUser}
                            className="rounded border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                            Choisir un autre utilisateur
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={status === "loading"}
                        onClick={handleCartClear}
                        className="rounded border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                        Clear
                    </button>
                    {isAnonymUser ? (
                        <>
                            <button
                                type="button"
                                onClick={handleSwitchUser}
                                className="rounded border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                                Se connecter pour creer le panier
                            </button>
                            <button
                                type="button"
                                onClick={handleSwitchUser}
                                className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                                Se connecter pour valider la commande
                            </button>
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}


import {Link, Outlet} from "react-router-dom";
import {useCustomerUser} from "../hooks/useCustomerUser.jsx";
import {useCart} from "../hooks/useCart.jsx";
import {useEffect, useState} from "react";
import {getLastApiResponse, subscribeToApiResponses} from "../api/api-response-handler.js";
import StatusBanner from "../components/shared/StatusBanner.jsx";
import {useDefaultValues} from "../hooks/useDefaultValues.jsx";
import {getLanguageText, getScalarValue} from "../utils/util-functions.js";


export default function FrontOfficeLayout() {
    const {customerUser, logout} = useCustomerUser();
    const {items} = useCart();
    const {defaultCountry, defaultCurrency, loadingDefaultValues} = useDefaultValues();



    const [apiResponse, setApiResponse] = useState(getLastApiResponse());

    useEffect(() => {
        const unsubscribe = subscribeToApiResponses(setApiResponse);
        return () => unsubscribe();
    }, []);

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900">
            <header className="border-b border-zinc-200 bg-white">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Front office</p>
                        <h1 className="text-xl font-semibold text-zinc-900">Boutique</h1>
                        <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Country : {getLanguageText(defaultCountry?.name)} </span>
                        <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Currency : {getScalarValue(defaultCurrency?.name)} </span>

                    </div>
                    <nav className="flex items-center gap-4 text-sm font-semibold">
                        <Link className="text-zinc-700 hover:text-zinc-900" to="/products">
                            Accueil
                        </Link>
                        <Link className="text-zinc-700 hover:text-zinc-900" to="/cart">
                            Panier ({items.length})
                        </Link>
                        {customerUser ? (
                            <>
                                <Link className="text-zinc-700 hover:text-zinc-900" to="/orders">
                                    Mes commandes
                                </Link>
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="rounded-full border border-zinc-300 px-3 py-1 text-zinc-700 hover:bg-zinc-100"
                                >
                                    Se deconnecter
                                </button>
                            </>
                        ) : (
                            <Link
                                className="rounded-full border border-zinc-300 px-3 py-1 text-zinc-700 hover:bg-zinc-100"
                                to="/login"
                            >
                                Se connecter
                            </Link>
                        )}
                    </nav>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-4 py-8">
                {apiResponse && (
                    <div className="mb-6">
                        <StatusBanner
                            variant={apiResponse.ok ? "success" : "error"}
                            title={apiResponse.title}
                            message={apiResponse.message}
                            details={apiResponse.details}
                            requestInfo={{
                                method: apiResponse.method,
                                url: apiResponse.fullUrl,
                            }}
                        />
                    </div>
                )}
                <Outlet/>
            </main>

            <footer className="border-t border-zinc-200 bg-white">
                <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-zinc-500">
                    Prestashop React App — Front office
                </div>
            </footer>
        </div>
    );
}


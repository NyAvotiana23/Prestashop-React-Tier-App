import {Outlet} from "react-router-dom";
import {useEffect, useState} from "react";
import Header from "../components/shared/Header";
import Footer from "../components/shared/Footer";
import Sidebar from "../components/shared/Sidebar";
import StatusBanner from "../components/shared/StatusBanner";
import {getLastApiResponse, subscribeToApiResponses} from "../api/api-response-handler";

export default function RootLayout() {
    const [apiResponse, setApiResponse] = useState(getLastApiResponse());

    useEffect(() => {
        const unsubscribe = subscribeToApiResponses(setApiResponse);
        return () => unsubscribe();
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <Header/>

            <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-4 pb-10 pt-6 lg:flex-row lg:px-6">
                <Sidebar/>

                <main
                    className="min-w-0 flex-1 rounded-2xl border border-zinc-200/10 bg-white p-6 text-zinc-900 shadow-sm">
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
            </div>

            <Footer/>
        </div>
    );
}

import { Outlet } from "react-router-dom";
import Header from "../components/shared/Header";
import Footer from "../components/shared/Footer";
import Sidebar from "../components/shared/Sidebar";

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />

      <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-4 pb-10 pt-6 lg:flex-row lg:px-6">
        <Sidebar />

        <main className="min-w-0 flex-1 rounded-2xl border border-zinc-200/10 bg-white p-6 text-zinc-900 shadow-sm">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
}

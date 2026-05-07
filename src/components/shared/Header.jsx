import {Link} from "react-router-dom";

function Header() {

    return (
        <header className="border-b border-zinc-800 bg-zinc-950/95">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 lg:px-6">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                        IT-U Evaluation Project
                    </p>
                    <h1 className="text-xl font-semibold text-zinc-100">
                        Prestashop React Tier App
                    </h1>
                </div>
                <div className="flex flex-row gap-6">

                    <Link
                        to="/reset-database"
                        className="inline-flex items-center gap-2 rounded-full border border-yellow-400/70 bg-yellow-400/10 px-4 py-2 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-400/20"
                    >
                        Reset Database
                    </Link>
                    <Link
                        to="/import-database"
                        className="inline-flex items-center gap-2 rounded-full border border-yellow-400/70 bg-yellow-400/10 px-4 py-2 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-400/20"
                    >
                        Import data
                    </Link>
                </div>

            </div>
        </header>
    );
}

export default Header;

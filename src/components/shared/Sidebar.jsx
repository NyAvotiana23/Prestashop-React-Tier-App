import { Link } from "react-router-dom";

const sections = [
	{ title: "Dashboard", href: "/admin", items: [] },
    { title: "Statistique", href: "/admin/statistics", items: [] },

	{
		title: "Commandes",
		items: [
			{ name: "Orders", href: "/admin/orders" },
			// { name: "Factures", href: "/admin/orders/invoices" },
			// { name: "Avoirs", href: "/admin/orders/credit-slips" },
			// { name: "Livraison", href: "/admin/orders/delivery-slips" },
			// { name: "Paniers", href: "/admin/orders/carts" },
		],
	},
	{
		title: "Catalogue",
		items: [
			{ name: "Produits", href: "/admin/catalog/products" },
			// { name: "Categories", href: "/admin/catalog/categories" },
			// { name: "Suivi", href: "/admin/catalog/monitoring" },
			{ name: "Stock", href: "/admin/catalog/stock_availables" },
			{ name: "Mouvements", href: "/admin/catalog/stock_movements" },
            { name: "Manage Stock", href: "/admin/catalog/manage_stock" },
			// { name: "Reduction", href: "/admin/catalog/discounts" },
		],
	},
	{
		title: "Client",
		items: [
			{ name: "Clients", href: "/admin/customers" },
			// { name: "Adresse", href: "/admin/customers/addresses" },
		],
	},
	{ title: "Sav", href: "/admin/sav", items: [] },
	{ title: "Statistiques", href: "/admin/statistics", items: [] },
];
function Sidebar() {
	return (
		<aside className="w-full shrink-0 lg:w-64">
			<div className="sticky top-6 space-y-6">
				<div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4 shadow-sm">
					<div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-yellow-400">
						Navigation
						<span className="h-1.5 w-10 rounded-full bg-yellow-400/70" />
					</div>

					<nav className="mt-5 space-y-5 text-sm">
						{sections.map((section) => (
							<div key={section.title} className="space-y-2">
								{section.items.length === 0 ? (
									<Link
										to={section.href}
										className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left font-semibold text-zinc-100 transition hover:border-yellow-400/60 hover:text-yellow-200"
									>
										{section.title}
										<span className="text-xs text-zinc-500">›</span>
									</Link>
								) : (
									<div className="space-y-2">
										<p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
											{section.title}
										</p>
										<div className="space-y-1">
											{section.items.map((item) => (
												<Link
													key={item.name}
													to={item.href}
													className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-zinc-300 transition hover:bg-zinc-900/70 hover:text-yellow-200"
												>
													{item.name}
													<span className="text-xs text-zinc-600">•</span>
												</Link>
											))}
										</div>
									</div>
								)}
							</div>
						))}
					</nav>
				</div>

				<div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs text-zinc-400">
					<p className="font-semibold text-zinc-200">Prestashop Tier App</p>
					<p className="mt-1 text-zinc-500">
						Manage catalogue, orders, and client data.
					</p>
				</div>
			</div>
		</aside>
	);
}
export default Sidebar;

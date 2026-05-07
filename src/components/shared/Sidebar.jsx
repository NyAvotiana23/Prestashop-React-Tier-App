const sections = [
  { title: "Dashboard", href: "/", items: [] },
  {
    title: "Commandes",
    items: [
      { name: "Orders", href: "/orders" },
      { name: "Factures", href: "/orders/invoices" },
      { name: "Avoirs", href: "/orders/credit-slips" },
      { name: "Livraison", href: "/orders/delivery-slips" },
      { name: "Paniers", href: "/orders/carts" },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { name: "Produits", href: "/catalog/products" },
      { name: "Categories", href: "/catalog/categories" },
      { name: "Suivi", href: "/catalog/monitoring" },
      { name: "Stock", href: "/catalog/stock" },
      { name: "Reduction", href: "/catalog/discounts" },
    ],
  },
  {
    title: "Client",
    items: [
      { name: "Clients", href: "/customers" },
      { name: "Adresse", href: "/customers/addresses" },
    ],
  },
  { title: "Sav", href: "/sav", items: [] },
  { title: "Statistiques", href: "/statistics", items: [] },
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
                  <a
                    href={section.href}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left font-semibold text-zinc-100 transition hover:border-yellow-400/60 hover:text-yellow-200"
                  >
                    {section.title}
                    <span className="text-xs text-zinc-500">›</span>
                  </a>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                      {section.title}
                    </p>
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <a
                          key={item.name}
                          href={item.href}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-zinc-300 transition hover:bg-zinc-900/70 hover:text-yellow-200"
                        >
                          {item.name}
                          <span className="text-xs text-zinc-600">•</span>
                        </a>
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

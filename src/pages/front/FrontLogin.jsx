import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {useCustomerUser} from "../../hooks/useCustomerUser.jsx";

export default function FrontLogin() {
  const { login } = useCustomerUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname ?? "/";

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message ?? "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">Connexion client</h2>
        <p className="text-sm text-zinc-500">Connectez-vous pour valider votre commande.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm text-zinc-600">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-zinc-600">
          Mot de passe
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </section>
  );
}


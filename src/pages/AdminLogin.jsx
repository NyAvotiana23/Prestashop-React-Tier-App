import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAdminUser from "../hooks/useAdminUser.jsx";

export default function AdminLogin() {
  const { login, defaultCredentials } = useAdminUser();
  const [username, setUsername] = useState(defaultCredentials.username);
  const [password, setPassword] = useState(defaultCredentials.password);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname ?? "/admin";

  function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    const result = login(username, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(redirectTo, { replace: true });
  }

  return (
    <section className="mx-auto max-w-md space-y-6 rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">Connexion backoffice</h2>
        <p className="text-sm text-zinc-500">Identifiants admin par defaut.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm text-zinc-600">
          Username
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-zinc-600">
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Se connecter
        </button>
      </form>
    </section>
  );
}


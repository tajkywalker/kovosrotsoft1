import { useState } from 'react';
import { api } from '../api/api.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.auth.login({ username, password });
      localStorage.setItem('kss_token', token);
      localStorage.setItem('kss_user', username);
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
      <div className="w-full max-w-sm">
        {/* Logo card */}
        <div className="text-center mb-8">
          <span className="text-5xl">⚙</span>
          <h1 className="text-2xl font-extrabold text-white mt-3">KovošrotSoft</h1>
          <p className="text-slate-400 text-sm mt-1">Evidence materiálu</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-2xl p-8 space-y-5"
        >
          <h2 className="text-lg font-bold text-gray-800 text-center">Přihlášení</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Uživatelské jméno
            </label>
            <input
              className="form-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Heslo
            </label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full py-3 text-base"
            disabled={loading}
          >
            {loading ? 'Přihlašuji…' : 'Přihlásit se'}
          </button>
        </form>
      </div>
    </div>
  );
}

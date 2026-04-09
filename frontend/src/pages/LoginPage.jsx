import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Mail, Lock, ArrowRight } from 'lucide-react';
import { authAPI, formatApiErrorDetail } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.login({ email, password });
      window.location.href = '/';
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="login-page" className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--parchment)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif mb-2" style={{ fontSize: '2rem', fontWeight: 500, color: 'var(--near-black)' }}>
            Bienvenido de vuelta
          </h1>
          <p className="font-sans text-sm" style={{ color: 'var(--olive-gray)' }}>
            Accede a tu cuenta de nexTalent
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)', boxShadow: 'rgba(0,0,0,0.05) 0px 4px 24px' }}
        >
          {error && (
            <div data-testid="login-error" className="mb-4 p-3 rounded-lg text-sm font-sans" style={{ backgroundColor: 'rgba(181,51,51,0.08)', color: 'var(--error-crimson)' }}>
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-sans mb-1.5" style={{ color: 'var(--olive-gray)', fontWeight: 500 }}>Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--stone-gray)' }} />
              <input
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-sans focus:outline-none focus:ring-2"
                style={{ backgroundColor: 'var(--parchment)', border: '1px solid var(--border-cream)', color: 'var(--near-black)' }}
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-sans mb-1.5" style={{ color: 'var(--olive-gray)', fontWeight: 500 }}>Contrasena</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--stone-gray)' }} />
              <input
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-sans focus:outline-none focus:ring-2"
                style={{ backgroundColor: 'var(--parchment)', border: '1px solid var(--border-cream)', color: 'var(--near-black)' }}
                placeholder="Tu contrasena"
                required
              />
            </div>
          </div>

          <button
            data-testid="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-sans disabled:opacity-50"
            style={{ backgroundColor: 'var(--terracotta)', color: 'var(--ivory)', fontWeight: 500 }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                Iniciar Sesion
              </>
            )}
          </button>

          <p className="text-center mt-4 font-sans text-sm" style={{ color: 'var(--olive-gray)' }}>
            No tienes cuenta?{' '}
            <Link to="/signup" data-testid="goto-signup-link" className="no-underline" style={{ color: 'var(--terracotta)', fontWeight: 500 }}>
              Registrate <ArrowRight size={12} className="inline" />
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

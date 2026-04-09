import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

export default function Footer() {
  return (
    <footer data-testid="footer" className="border-t mt-auto" style={{ backgroundColor: 'var(--near-black)', borderColor: 'var(--border-dark)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--terracotta)' }}>
                <TrendingUp size={18} color="var(--ivory)" />
              </div>
              <span className="text-xl font-serif" style={{ color: 'var(--ivory)', fontWeight: 500 }}>nexTalent</span>
            </div>
            <p className="text-sm leading-relaxed max-w-md" style={{ color: 'var(--warm-silver)', lineHeight: 1.6 }}>
              Inteligencia de mercado laboral impulsada por IA. Descubre tendencias, compara ofertas y cierra la brecha entre tus habilidades y el empleo ideal.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-sans mb-3" style={{ color: 'var(--warm-silver)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.75rem' }}>Herramientas</h4>
            <div className="flex flex-col gap-2">
              {[
                { to: '/search', label: 'Buscar Empleo' },
                { to: '/skills', label: 'Skills Demandadas' },
                { to: '/trends', label: 'Tendencias' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="text-sm no-underline hover:underline" style={{ color: 'var(--stone-gray)' }}>{l.label}</Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-sans mb-3" style={{ color: 'var(--warm-silver)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.75rem' }}>Analisis</h4>
            <div className="flex flex-col gap-2">
              {[
                { to: '/companies', label: 'Comparar Empresas' },
                { to: '/skills-gap', label: 'Brechas de Skills' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="text-sm no-underline hover:underline" style={{ color: 'var(--stone-gray)' }}>{l.label}</Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t" style={{ borderColor: 'var(--border-dark)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--stone-gray)' }}>
            2026 nexTalent. Inteligencia laboral para profesionales.
          </p>
        </div>
      </div>
    </footer>
  );
}

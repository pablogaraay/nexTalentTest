import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Building2, Users, MapPin, Star, Briefcase, CheckCircle } from 'lucide-react';
import { companiesAPI } from '@/lib/api';

export default function CompanyComparisonPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    companiesAPI.compare().then(({ data }) => {
      setData(data);
      setSelected(data.companies.map(c => c.name));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--parchment)' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ring-warm)', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!data) return null;

  const filtered = data.companies.filter(c => selected.includes(c.name));

  const salaryRadarOption = {
    tooltip: { backgroundColor: '#141413', borderColor: '#30302e', textStyle: { color: '#faf9f5', fontFamily: 'DM Sans' } },
    legend: { data: filtered.map(c => c.name), bottom: 0, textStyle: { color: '#5e5d59', fontFamily: 'DM Sans', fontSize: 11 } },
    radar: {
      indicator: [
        { name: 'Salario', max: 80000 },
        { name: 'Posiciones', max: 20 },
        { name: 'Remoto %', max: 100 },
        { name: 'Rating', max: 5 },
        { name: 'Beneficios', max: 6 },
      ],
      shape: 'polygon',
      splitArea: { areaStyle: { color: ['var(--ivory)', 'var(--parchment)'] } },
      axisLine: { lineStyle: { color: 'var(--border-cream)' } },
      splitLine: { lineStyle: { color: 'var(--border-cream)' } },
      axisName: { color: '#5e5d59', fontFamily: 'DM Sans', fontSize: 11 },
    },
    series: [{
      type: 'radar',
      data: filtered.map((c, i) => ({
        value: [c.avg_salary, c.open_positions, c.remote_percentage, c.rating * 20, c.benefits.length],
        name: c.name,
        lineStyle: { color: ['#c96442', '#d97757', '#5e5d59', '#87867f', '#b0aea5'][i], width: 2 },
        itemStyle: { color: ['#c96442', '#d97757', '#5e5d59', '#87867f', '#b0aea5'][i] },
        areaStyle: { color: ['rgba(201,100,66,0.1)', 'rgba(217,119,87,0.1)', 'rgba(94,93,89,0.1)', 'rgba(135,134,127,0.1)', 'rgba(176,174,165,0.1)'][i] },
      })),
    }],
  };

  const salaryBoxOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#141413', borderColor: '#30302e', textStyle: { color: '#faf9f5', fontFamily: 'DM Sans' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: filtered.map(c => c.name), axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans', fontSize: 11 }, axisLine: { lineStyle: { color: '#e8e6dc' } } },
    yAxis: { type: 'value', name: 'Salario (EUR)', nameTextStyle: { color: '#87867f', fontFamily: 'DM Sans' }, axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans', formatter: (v) => `${v/1000}K` }, splitLine: { lineStyle: { color: '#f0eee6' } } },
    series: [{
      type: 'bar',
      data: filtered.map((c, i) => ({
        value: c.avg_salary,
        itemStyle: { color: ['#c96442', '#d97757', '#5e5d59', '#87867f', '#b0aea5'][i], borderRadius: [6, 6, 0, 0] }
      })),
      barWidth: '45%',
    }],
  };

  return (
    <div data-testid="company-comparison-page" className="min-h-screen" style={{ backgroundColor: 'var(--parchment)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="font-serif mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 500, lineHeight: 1.2, color: 'var(--near-black)' }}>
            Comparacion de Empresas
          </h1>
          <p className="font-sans text-lg" style={{ color: 'var(--olive-gray)', lineHeight: 1.6 }}>
            Compara ofertas, salarios y beneficios entre las principales empresas del sector tech.
          </p>
        </div>

        {/* Company Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {data.companies.map(c => (
            <button
              key={c.name}
              data-testid={`company-filter-${c.name.toLowerCase().replace(/\s/g, '-')}`}
              onClick={() => {
                setSelected(prev =>
                  prev.includes(c.name) ? prev.filter(n => n !== c.name) : [...prev, c.name]
                );
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans transition-all"
              style={{
                backgroundColor: selected.includes(c.name) ? 'var(--near-black)' : 'var(--warm-sand)',
                color: selected.includes(c.name) ? 'var(--ivory)' : 'var(--charcoal-warm)',
                fontWeight: 500,
              }}
            >
              <Building2 size={14} />
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Radar */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)', boxShadow: 'rgba(0,0,0,0.05) 0px 4px 24px' }}>
            <h2 className="font-serif mb-4" style={{ fontSize: '1.3rem', fontWeight: 500, color: 'var(--near-black)' }}>
              Comparativa General
            </h2>
            <ReactECharts option={salaryRadarOption} style={{ height: 380 }} data-testid="company-radar-chart" />
          </div>

          {/* Salary Bar */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)', boxShadow: 'rgba(0,0,0,0.05) 0px 4px 24px' }}>
            <h2 className="font-serif mb-4" style={{ fontSize: '1.3rem', fontWeight: 500, color: 'var(--near-black)' }}>
              Salario Medio
            </h2>
            <ReactECharts option={salaryBoxOption} style={{ height: 380 }} data-testid="company-salary-chart" />
          </div>
        </div>

        {/* Company Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((company, i) => (
            <div
              key={company.name}
              data-testid={`company-card-${company.name.toLowerCase().replace(/\s/g, '-')}`}
              className="rounded-2xl p-5 opacity-0 animate-fade-in-up"
              style={{
                backgroundColor: 'var(--ivory)',
                border: '1px solid var(--border-cream)',
                animationDelay: `${i * 0.1}s`,
                animationFillMode: 'forwards',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--near-black)' }}>{company.name}</h3>
                  <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--stone-gray)' }}>{company.sector}</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(201,100,66,0.08)' }}>
                  <Star size={12} style={{ color: 'var(--terracotta)', fill: 'var(--terracotta)' }} />
                  <span className="text-xs font-sans" style={{ color: 'var(--terracotta)', fontWeight: 600 }}>{company.rating}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { icon: Users, value: company.employees, label: 'Empleados' },
                  { icon: Briefcase, value: company.open_positions, label: 'Vacantes' },
                  { icon: MapPin, value: `${company.remote_percentage}%`, label: 'Remoto' },
                  { icon: Building2, value: `${(company.avg_salary / 1000).toFixed(0)}K EUR`, label: 'Salario medio' },
                ].map(stat => (
                  <div key={stat.label} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--parchment)' }}>
                    <stat.icon size={14} style={{ color: 'var(--stone-gray)', marginBottom: 4 }} />
                    <div className="font-sans text-sm" style={{ color: 'var(--near-black)', fontWeight: 600 }}>{stat.value}</div>
                    <div className="font-sans text-xs" style={{ color: 'var(--stone-gray)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="mb-3">
                <span className="text-xs font-sans" style={{ color: 'var(--stone-gray)', fontWeight: 500 }}>Top Skills</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {company.top_skills.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-md text-xs font-sans" style={{ backgroundColor: 'var(--warm-sand)', color: 'var(--charcoal-warm)' }}>{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-sans" style={{ color: 'var(--stone-gray)', fontWeight: 500 }}>Beneficios</span>
                <div className="flex flex-col gap-1 mt-1">
                  {company.benefits.slice(0, 3).map(b => (
                    <span key={b} className="flex items-center gap-1 text-xs font-sans" style={{ color: 'var(--olive-gray)' }}>
                      <CheckCircle size={10} style={{ color: 'var(--terracotta)' }} /> {b}
                    </span>
                  ))}
                  {company.benefits.length > 3 && (
                    <span className="text-xs font-sans" style={{ color: 'var(--stone-gray)' }}>+{company.benefits.length - 3} mas</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

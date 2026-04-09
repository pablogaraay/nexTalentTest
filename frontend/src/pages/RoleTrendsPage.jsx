import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, ArrowUpRight, Users, DollarSign, Laptop } from 'lucide-react';
import { trendsAPI } from '@/lib/api';

export default function RoleTrendsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    trendsAPI.getRoles().then(({ data }) => {
      setData(data);
      setSelectedRole(data.roles[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--parchment)' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ring-warm)', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!data || !selectedRole) return null;

  const demandLineOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#141413', borderColor: '#30302e', textStyle: { color: '#faf9f5', fontFamily: 'DM Sans' } },
    legend: { data: data.roles.map(r => r.name), textStyle: { color: '#5e5d59', fontFamily: 'DM Sans', fontSize: 11 }, bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
    xAxis: { type: 'category', data: data.roles[0].months, axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans' }, axisLine: { lineStyle: { color: '#e8e6dc' } } },
    yAxis: { type: 'value', name: 'Demanda', nameTextStyle: { color: '#87867f', fontFamily: 'DM Sans' }, axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans' }, splitLine: { lineStyle: { color: '#f0eee6' } } },
    series: data.roles.map((role, i) => ({
      name: role.name,
      type: 'line',
      smooth: true,
      data: role.demand_trend,
      lineStyle: { color: ['#c96442', '#d97757', '#5e5d59', '#87867f', '#b0aea5'][i], width: 2.5 },
      itemStyle: { color: ['#c96442', '#d97757', '#5e5d59', '#87867f', '#b0aea5'][i] },
      areaStyle: i === 0 ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(201,100,66,0.15)' }, { offset: 1, color: 'rgba(201,100,66,0)' }] } } : undefined,
    })),
  };

  const salaryBarOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#141413', borderColor: '#30302e', textStyle: { color: '#faf9f5', fontFamily: 'DM Sans' }, formatter: (params) => `${params[0].name}<br/>Salario medio: ${params[0].value.toLocaleString()} EUR` },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.roles.map(r => r.name), axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans', fontSize: 11 }, axisLine: { lineStyle: { color: '#e8e6dc' } } },
    yAxis: { type: 'value', name: 'Salario (EUR)', nameTextStyle: { color: '#87867f', fontFamily: 'DM Sans' }, axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans', formatter: (v) => `${v/1000}K` }, splitLine: { lineStyle: { color: '#f0eee6' } } },
    series: [{
      type: 'bar',
      data: data.roles.map((r, i) => ({
        value: r.avg_salary,
        itemStyle: { color: ['#c96442', '#d97757', '#5e5d59', '#87867f', '#b0aea5'][i], borderRadius: [6, 6, 0, 0] }
      })),
      barWidth: '50%',
    }],
  };

  return (
    <div data-testid="role-trends-page" className="min-h-screen" style={{ backgroundColor: 'var(--parchment)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="font-serif mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 500, lineHeight: 1.2, color: 'var(--near-black)' }}>
            Tendencias por Rol
          </h1>
          <p className="font-sans text-lg" style={{ color: 'var(--olive-gray)', lineHeight: 1.6 }}>
            Analiza la evolucion de demanda, salarios y requisitos segun el puesto profesional.
          </p>
        </div>

        {/* Demand Line Chart */}
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)', boxShadow: 'rgba(0,0,0,0.05) 0px 4px 24px' }}>
          <h2 className="font-serif mb-4" style={{ fontSize: '1.3rem', fontWeight: 500, color: 'var(--near-black)' }}>
            Evolucion de Demanda (12 meses)
          </h2>
          <ReactECharts option={demandLineOption} style={{ height: 380 }} data-testid="demand-line-chart" />
        </div>

        {/* Salary Bar Chart */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)', boxShadow: 'rgba(0,0,0,0.05) 0px 4px 24px' }}>
          <h2 className="font-serif mb-4" style={{ fontSize: '1.3rem', fontWeight: 500, color: 'var(--near-black)' }}>
            Salario Medio por Rol
          </h2>
          <ReactECharts option={salaryBarOption} style={{ height: 320 }} data-testid="salary-bar-chart" />
        </div>

        {/* Role Detail Cards */}
        <h2 className="font-serif mb-4" style={{ fontSize: '1.6rem', fontWeight: 500, color: 'var(--near-black)' }}>
          Detalle por Rol
        </h2>
        <div className="flex gap-2 mb-6 flex-wrap">
          {data.roles.map(role => (
            <button
              key={role.name}
              data-testid={`role-tab-${role.name.replace(/\s/g, '-').toLowerCase()}`}
              onClick={() => setSelectedRole(role)}
              className="px-4 py-2 rounded-lg text-sm font-sans transition-all"
              style={{
                backgroundColor: selectedRole.name === role.name ? 'var(--near-black)' : 'var(--warm-sand)',
                color: selectedRole.name === role.name ? 'var(--ivory)' : 'var(--charcoal-warm)',
                fontWeight: 500,
              }}
            >
              {role.name}
            </button>
          ))}
        </div>

        {selectedRole && (
          <div data-testid="role-detail" className="rounded-2xl p-6" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)' }}>
            <h3 className="font-serif mb-6" style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--near-black)' }}>
              {selectedRole.name}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { icon: DollarSign, label: 'Salario medio', value: `${selectedRole.avg_salary.toLocaleString()} EUR` },
                { icon: TrendingUp, label: 'Crecimiento', value: `+${selectedRole.growth_rate}%` },
                { icon: Laptop, label: 'Trabajo remoto', value: `${selectedRole.remote_percentage}%` },
                { icon: Users, label: 'Tendencia demanda', value: selectedRole.demand_trend[selectedRole.demand_trend.length - 1] },
              ].map((stat, i) => (
                <div key={stat.label} data-testid={`role-stat-${i}`} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--parchment)', border: '1px solid var(--border-cream)' }}>
                  <stat.icon size={18} style={{ color: 'var(--terracotta)', marginBottom: 8 }} />
                  <div className="font-serif text-lg" style={{ color: 'var(--near-black)', fontWeight: 500 }}>{stat.value}</div>
                  <div className="font-sans text-xs" style={{ color: 'var(--stone-gray)' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="font-sans text-sm mb-3" style={{ color: 'var(--olive-gray)', fontWeight: 500 }}>Top Skills Requeridas</h4>
              <div className="flex flex-wrap gap-2">
                {selectedRole.top_skills.map((skill, i) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-lg text-sm font-sans"
                    style={{
                      backgroundColor: i === 0 ? 'rgba(201,100,66,0.1)' : 'var(--warm-sand)',
                      color: i === 0 ? 'var(--terracotta)' : 'var(--charcoal-warm)',
                      fontWeight: 500,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

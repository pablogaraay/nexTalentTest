import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { skillsAPI } from '@/lib/api';

export default function SkillsDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState('bar'); // 'bar' | 'bubble' | 'category'

  useEffect(() => {
    skillsAPI.getDemand().then(({ data }) => {
      setData(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--parchment)' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ring-warm)', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!data) return null;

  const barChartOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#141413', borderColor: '#30302e', textStyle: { color: '#faf9f5', fontFamily: 'DM Sans' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.top_skills.map(s => s.name), axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans', fontSize: 11, rotate: 45 }, axisLine: { lineStyle: { color: '#e8e6dc' } } },
    yAxis: { type: 'value', name: 'Demanda (%)', nameTextStyle: { color: '#87867f', fontFamily: 'DM Sans' }, axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans' }, splitLine: { lineStyle: { color: '#f0eee6' } } },
    series: [{
      type: 'bar',
      data: data.top_skills.map(s => ({
        value: s.demand,
        itemStyle: { color: s.growth > 20 ? '#c96442' : s.growth > 0 ? '#d97757' : '#87867f', borderRadius: [4, 4, 0, 0] }
      })),
      barWidth: '60%',
    }],
  };

  const growthChartOption = {
    tooltip: { trigger: 'item', backgroundColor: '#141413', borderColor: '#30302e', textStyle: { color: '#faf9f5', fontFamily: 'DM Sans' }, formatter: (p) => `${p.data[3]}<br/>Demanda: ${p.data[0]}%<br/>Crecimiento: ${p.data[1]}%` },
    grid: { left: '5%', right: '5%', bottom: '10%', top: '10%', containLabel: true },
    xAxis: { name: 'Demanda (%)', nameTextStyle: { color: '#87867f', fontFamily: 'DM Sans' }, axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans' }, splitLine: { lineStyle: { color: '#f0eee6' } } },
    yAxis: { name: 'Crecimiento (%)', nameTextStyle: { color: '#87867f', fontFamily: 'DM Sans' }, axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans' }, splitLine: { lineStyle: { color: '#f0eee6' } } },
    series: [{
      type: 'scatter',
      symbolSize: (d) => Math.max(d[2] * 0.6, 12),
      data: data.top_skills.map(s => [s.demand, s.growth, s.demand, s.name]),
      itemStyle: { color: '#c96442', opacity: 0.75 },
      label: { show: true, formatter: (p) => p.data[3], position: 'top', color: '#4d4c48', fontFamily: 'DM Sans', fontSize: 10 },
    }],
  };

  const categoryChartOption = {
    tooltip: { trigger: 'item', backgroundColor: '#141413', borderColor: '#30302e', textStyle: { color: '#faf9f5', fontFamily: 'DM Sans' } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#faf9f5', borderWidth: 3 },
      label: { show: true, color: '#4d4c48', fontFamily: 'DM Sans', fontSize: 12 },
      data: data.by_category.map((c, i) => ({
        value: c.count,
        name: c.category,
        itemStyle: { color: ['#c96442', '#d97757', '#5e5d59', '#87867f', '#b0aea5'][i] }
      })),
    }],
  };

  return (
    <div data-testid="skills-dashboard-page" className="min-h-screen" style={{ backgroundColor: 'var(--parchment)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-serif mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 500, lineHeight: 1.2, color: 'var(--near-black)' }}>
            Skills mas Demandadas
          </h1>
          <p className="font-sans text-lg" style={{ color: 'var(--olive-gray)', lineHeight: 1.6 }}>
            Identifica las competencias mas buscadas y su crecimiento en el mercado.
          </p>
        </div>

        {/* Chart Toggle */}
        <div className="flex gap-2 mb-8">
          {[
            { key: 'bar', label: 'Ranking' },
            { key: 'bubble', label: 'Demanda vs Crecimiento' },
            { key: 'category', label: 'Por Categoria' },
          ].map(v => (
            <button
              key={v.key}
              data-testid={`chart-view-${v.key}`}
              onClick={() => setChartView(v.key)}
              className="px-4 py-2 rounded-lg text-sm font-sans transition-all"
              style={{
                backgroundColor: chartView === v.key ? 'var(--near-black)' : 'var(--warm-sand)',
                color: chartView === v.key ? 'var(--ivory)' : 'var(--charcoal-warm)',
                fontWeight: 500,
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)', boxShadow: 'rgba(0,0,0,0.05) 0px 4px 24px' }}>
          <ReactECharts
            option={chartView === 'bar' ? barChartOption : chartView === 'bubble' ? growthChartOption : categoryChartOption}
            style={{ height: 420 }}
            data-testid="skills-chart"
          />
        </div>

        {/* Skills Table */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)' }}>
          <div className="p-5 border-b" style={{ borderColor: 'var(--border-cream)' }}>
            <h2 className="font-serif" style={{ fontSize: '1.3rem', fontWeight: 500, color: 'var(--near-black)' }}>
              Detalle por Skill
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table data-testid="skills-table" className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-cream)' }}>
                  {['Skill', 'Categoria', 'Demanda', 'Crecimiento'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-sans" style={{ color: 'var(--stone-gray)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.top_skills.map((skill, i) => (
                  <tr key={skill.name} data-testid={`skill-row-${i}`} style={{ borderBottom: '1px solid var(--border-cream)' }}>
                    <td className="px-5 py-3.5">
                      <span className="font-sans text-sm" style={{ color: 'var(--near-black)', fontWeight: 500 }}>{skill.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-md text-xs font-sans" style={{ backgroundColor: 'var(--warm-sand)', color: 'var(--charcoal-warm)' }}>{skill.category}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-cream)' }}>
                          <div className="h-full rounded-full" style={{ width: `${skill.demand}%`, backgroundColor: 'var(--terracotta)' }} />
                        </div>
                        <span className="text-xs font-sans" style={{ color: 'var(--olive-gray)' }}>{skill.demand}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1 text-sm font-sans" style={{ color: skill.growth > 0 ? 'var(--terracotta)' : 'var(--error-crimson)', fontWeight: 500 }}>
                        {skill.growth > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {skill.growth > 0 ? '+' : ''}{skill.growth}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

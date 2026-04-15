import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { BarChart3, TrendingUp, ArrowUpRight, Briefcase, AlertCircle, RefreshCw } from 'lucide-react';
import { insightsAPI } from '@/lib/api';

export default function SkillsDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartView, setChartView] = useState('skills');
  const [topN, setTopN] = useState(15);

  const fetchData = () => {
    setLoading(true);
    setError('');
    insightsAPI.get(topN).then(({ data: resp }) => {
      const result = resp.result || resp;
      setData(result);
      setLoading(false);
    }).catch(err => {
      setError(err.response?.data?.detail || 'Error cargando insights del mercado.');
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [topN]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: 'var(--parchment)' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ring-warm)', borderTopColor: 'transparent' }} />
      <p className="font-sans text-sm" style={{ color: 'var(--stone-gray)' }}>Consultando base de datos de ofertas...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: 'var(--parchment)' }}>
      <AlertCircle size={32} style={{ color: 'var(--error-crimson)' }} />
      <p className="font-sans text-sm text-center" style={{ color: 'var(--error-crimson)' }}>{error}</p>
      <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans" style={{ backgroundColor: 'var(--terracotta)', color: 'var(--ivory)', fontWeight: 500 }}>
        <RefreshCw size={14} /> Reintentar
      </button>
    </div>
  );

  if (!data) return null;

  const topSkills = data.top_skills || [];
  const topJobs = data.top_jobs || [];
  const summary = data.summary || {};

  // Skills bar chart
  const skillsBarOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#141413', borderColor: '#30302e', textStyle: { color: '#faf9f5', fontFamily: 'DM Sans' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: topSkills.map(s => s.skill_name), axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans', fontSize: 11, rotate: 45 }, axisLine: { lineStyle: { color: '#e8e6dc' } } },
    yAxis: { type: 'value', name: 'Demanda (ofertas)', nameTextStyle: { color: '#87867f', fontFamily: 'DM Sans' }, axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans' }, splitLine: { lineStyle: { color: '#f0eee6' } } },
    series: [{
      type: 'bar',
      data: topSkills.map((s, i) => ({
        value: s.demand,
        itemStyle: { color: i < 3 ? '#c96442' : i < 7 ? '#d97757' : '#87867f', borderRadius: [4, 4, 0, 0] }
      })),
      barWidth: '60%',
    }],
  };

  // Jobs bar chart
  const jobsBarOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#141413', borderColor: '#30302e', textStyle: { color: '#faf9f5', fontFamily: 'DM Sans' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: topJobs.map(j => j.job_title.length > 25 ? j.job_title.substring(0, 25) + '...' : j.job_title), axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans', fontSize: 10, rotate: 45 }, axisLine: { lineStyle: { color: '#e8e6dc' } } },
    yAxis: { type: 'value', name: 'Demanda (ofertas)', nameTextStyle: { color: '#87867f', fontFamily: 'DM Sans' }, axisLabel: { color: '#5e5d59', fontFamily: 'DM Sans' }, splitLine: { lineStyle: { color: '#f0eee6' } } },
    series: [{
      type: 'bar',
      data: topJobs.map((j, i) => ({
        value: j.demand,
        itemStyle: { color: i < 3 ? '#c96442' : i < 7 ? '#d97757' : '#87867f', borderRadius: [4, 4, 0, 0] }
      })),
      barWidth: '60%',
    }],
  };

  // Pie chart for skills
  const skillsPieOption = {
    tooltip: { trigger: 'item', backgroundColor: '#141413', borderColor: '#30302e', textStyle: { color: '#faf9f5', fontFamily: 'DM Sans' } },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#faf9f5', borderWidth: 3 },
      label: { show: true, color: '#4d4c48', fontFamily: 'DM Sans', fontSize: 11 },
      data: topSkills.slice(0, 10).map((s, i) => ({
        value: s.demand,
        name: s.skill_name,
        itemStyle: { color: ['#c96442', '#d97757', '#5e5d59', '#87867f', '#b0aea5', '#c96442cc', '#d97757cc', '#5e5d59cc', '#87867fcc', '#b0aea5cc'][i] }
      })),
    }],
  };

  return (
    <div data-testid="skills-dashboard-page" className="min-h-screen" style={{ backgroundColor: 'var(--parchment)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="font-serif mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 500, lineHeight: 1.2, color: 'var(--near-black)' }}>
            Insights del Mercado Laboral
          </h1>
          <p className="font-sans text-lg" style={{ color: 'var(--olive-gray)', lineHeight: 1.6 }}>
            Jobs y skills mas demandados en el ambito de consultoria. Datos reales de {summary.total_offers || 0} ofertas analizadas.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { value: summary.total_offers || 0, label: 'Ofertas totales' },
            { value: summary.offers_with_job_mapping || 0, label: 'Con job mapping' },
            { value: summary.offers_with_skills_sfia || 0, label: 'Con skills SFIA' },
            { value: `${summary.skills_sfia_coverage_pct || 0}%`, label: 'Cobertura skills' },
          ].map((stat, i) => (
            <div key={stat.label} data-testid={`insight-stat-${i}`} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)' }}>
              <div className="font-serif text-2xl" style={{ color: 'var(--terracotta)', fontWeight: 500, lineHeight: 1.1 }}>{stat.value}</div>
              <div className="font-sans text-xs mt-1" style={{ color: 'var(--stone-gray)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'skills', label: 'Top Skills' },
            { key: 'jobs', label: 'Top Jobs' },
            { key: 'pie', label: 'Distribucion Skills' },
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
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-sans" style={{ color: 'var(--stone-gray)' }}>Top N:</span>
            <select
              data-testid="topn-selector"
              value={topN}
              onChange={e => setTopN(Number(e.target.value))}
              className="rounded-lg px-2 py-1 text-sm font-sans"
              style={{ backgroundColor: 'var(--warm-sand)', color: 'var(--charcoal-warm)', border: 'none' }}
            >
              {[5, 10, 15, 20, 30].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)', boxShadow: 'rgba(0,0,0,0.05) 0px 4px 24px' }}>
          <ReactECharts
            option={chartView === 'skills' ? skillsBarOption : chartView === 'jobs' ? jobsBarOption : skillsPieOption}
            style={{ height: 420 }}
            data-testid="insights-chart"
          />
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Skills Table */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)' }}>
            <div className="p-5 border-b" style={{ borderColor: 'var(--border-cream)' }}>
              <h2 className="font-serif" style={{ fontSize: '1.3rem', fontWeight: 500, color: 'var(--near-black)' }}>
                <BarChart3 size={18} className="inline mr-2" style={{ color: 'var(--terracotta)' }} />
                Top Skills (SFIA)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table data-testid="skills-table" className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-cream)' }}>
                    {['#', 'Skill', 'Demanda', '%'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-sans" style={{ color: 'var(--stone-gray)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topSkills.map((skill, i) => (
                    <tr key={skill.skill_id} data-testid={`skill-row-${i}`} style={{ borderBottom: '1px solid var(--border-cream)' }}>
                      <td className="px-4 py-2.5 text-xs font-sans" style={{ color: 'var(--stone-gray)' }}>{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-sans text-sm" style={{ color: 'var(--near-black)', fontWeight: 500 }}>{skill.skill_name}</span>
                        <span className="block text-xs font-sans" style={{ color: 'var(--stone-gray)' }}>{skill.skill_id}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-cream)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(skill.share_total_offers_pct * 2, 100)}%`, backgroundColor: i < 3 ? 'var(--terracotta)' : 'var(--stone-gray)' }} />
                          </div>
                          <span className="text-xs font-sans" style={{ color: 'var(--olive-gray)' }}>{skill.demand}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-sans" style={{ color: 'var(--terracotta)', fontWeight: 500 }}>
                        {skill.share_total_offers_pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)' }}>
            <div className="p-5 border-b" style={{ borderColor: 'var(--border-cream)' }}>
              <h2 className="font-serif" style={{ fontSize: '1.3rem', fontWeight: 500, color: 'var(--near-black)' }}>
                <Briefcase size={18} className="inline mr-2" style={{ color: 'var(--terracotta)' }} />
                Top Jobs (WEF)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table data-testid="jobs-table" className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-cream)' }}>
                    {['#', 'Job', 'Familia', 'Demanda', '%'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-sans" style={{ color: 'var(--stone-gray)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topJobs.map((job, i) => (
                    <tr key={job.job_id} data-testid={`job-row-${i}`} style={{ borderBottom: '1px solid var(--border-cream)' }}>
                      <td className="px-4 py-2.5 text-xs font-sans" style={{ color: 'var(--stone-gray)' }}>{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-sans text-sm" style={{ color: 'var(--near-black)', fontWeight: 500 }}>{job.job_title}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-md text-xs font-sans" style={{ backgroundColor: 'var(--warm-sand)', color: 'var(--charcoal-warm)' }}>{job.job_family}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-cream)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(job.share_total_offers_pct * 2, 100)}%`, backgroundColor: i < 3 ? 'var(--terracotta)' : 'var(--stone-gray)' }} />
                          </div>
                          <span className="text-xs font-sans" style={{ color: 'var(--olive-gray)' }}>{job.demand}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-sans" style={{ color: 'var(--terracotta)', fontWeight: 500 }}>
                        {job.share_total_offers_pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Generation timestamp */}
        {data.generated_at_utc && (
          <p className="mt-6 text-xs font-sans text-center" style={{ color: 'var(--stone-gray)' }}>
            Datos generados: {new Date(data.generated_at_utc).toLocaleString('es-ES')} | Coleccion: {data.collection}
          </p>
        )}
      </div>
    </div>
  );
}

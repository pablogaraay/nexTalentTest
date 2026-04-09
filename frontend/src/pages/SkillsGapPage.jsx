import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Target, AlertTriangle, CheckCircle, ArrowRight, Plus, X } from 'lucide-react';
import { skillsAPI } from '@/lib/api';

export default function SkillsGapPage() {
  const [roles, setRoles] = useState([]);
  const [targetRole, setTargetRole] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [userSkills, setUserSkills] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    skillsAPI.getRoles().then(({ data }) => {
      setRoles(data.roles);
      if (data.roles.length > 0) setTargetRole(data.roles[0]);
    });
  }, []);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !userSkills.includes(s)) {
      setUserSkills(prev => [...prev, s]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setUserSkills(prev => prev.filter(s => s !== skill));
  };

  const handleAnalyze = async () => {
    if (userSkills.length === 0 || !targetRole) return;
    setLoading(true);
    try {
      const { data } = await skillsAPI.analyzeGap({ user_skills: userSkills, target_role: targetRole });
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const radarOption = result ? {
    tooltip: { backgroundColor: '#141413', borderColor: '#30302e', textStyle: { color: '#faf9f5', fontFamily: 'DM Sans' } },
    radar: {
      indicator: result.gap_analysis.map(g => ({ name: g.skill, max: 100 })),
      shape: 'polygon',
      splitArea: { areaStyle: { color: ['var(--ivory)', 'var(--parchment)'] } },
      axisLine: { lineStyle: { color: 'var(--border-cream)' } },
      splitLine: { lineStyle: { color: 'var(--border-cream)' } },
      axisName: { color: '#5e5d59', fontFamily: 'DM Sans', fontSize: 10 },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: result.gap_analysis.map(g => g.importance),
            name: 'Requerido',
            lineStyle: { color: '#c96442', width: 2 },
            itemStyle: { color: '#c96442' },
            areaStyle: { color: 'rgba(201,100,66,0.12)' },
          },
          {
            value: result.gap_analysis.map(g => g.has_skill ? g.importance : 0),
            name: 'Tu perfil',
            lineStyle: { color: '#5e5d59', width: 2, type: 'dashed' },
            itemStyle: { color: '#5e5d59' },
            areaStyle: { color: 'rgba(94,93,89,0.08)' },
          },
        ],
      },
    ],
    legend: { data: ['Requerido', 'Tu perfil'], bottom: 0, textStyle: { color: '#5e5d59', fontFamily: 'DM Sans', fontSize: 11 } },
  } : {};

  const gaugeOption = result ? {
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      pointer: { show: false },
      progress: { show: true, overlap: false, roundCap: true, clip: false, itemStyle: { color: result.coverage_percentage >= 70 ? '#c96442' : result.coverage_percentage >= 40 ? '#d97757' : '#b53333' } },
      axisLine: { lineStyle: { width: 20, color: [[1, 'var(--border-cream)']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: { valueAnimation: true, fontSize: 32, fontFamily: 'Playfair Display', fontWeight: 500, color: '#141413', formatter: '{value}%', offsetCenter: [0, '-15%'] },
      title: { fontSize: 14, fontFamily: 'DM Sans', color: '#87867f', offsetCenter: [0, '15%'] },
      data: [{ value: result.coverage_percentage, name: 'Cobertura' }],
    }],
  } : {};

  const suggestedSkills = ['React', 'Python', 'TypeScript', 'Node.js', 'SQL', 'Docker', 'AWS', 'JavaScript', 'Git', 'CSS', 'Java', 'Machine Learning', 'Kubernetes', 'TensorFlow', 'GraphQL'];

  return (
    <div data-testid="skills-gap-page" className="min-h-screen" style={{ backgroundColor: 'var(--parchment)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="font-serif mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 500, lineHeight: 1.2, color: 'var(--near-black)' }}>
            Brechas de Competencias
          </h1>
          <p className="font-sans text-lg" style={{ color: 'var(--olive-gray)', lineHeight: 1.6 }}>
            Descubre que habilidades te faltan para alcanzar tu puesto objetivo.
          </p>
        </div>

        {/* Input Section */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)', boxShadow: 'rgba(0,0,0,0.05) 0px 4px 24px' }}>
          {/* Target Role */}
          <div className="mb-6">
            <label className="block text-sm font-sans mb-2" style={{ color: 'var(--olive-gray)', fontWeight: 500 }}>
              Rol objetivo
            </label>
            <div className="flex flex-wrap gap-2">
              {roles.map(role => (
                <button
                  key={role}
                  data-testid={`role-select-${role.replace(/\s/g, '-').toLowerCase()}`}
                  onClick={() => setTargetRole(role)}
                  className="px-4 py-2 rounded-lg text-sm font-sans transition-all"
                  style={{
                    backgroundColor: targetRole === role ? 'var(--near-black)' : 'var(--warm-sand)',
                    color: targetRole === role ? 'var(--ivory)' : 'var(--charcoal-warm)',
                    fontWeight: 500,
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Skills Input */}
          <div className="mb-4">
            <label className="block text-sm font-sans mb-2" style={{ color: 'var(--olive-gray)', fontWeight: 500 }}>
              Tus habilidades actuales
            </label>
            <div className="flex gap-2">
              <input
                data-testid="skill-input"
                type="text"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()}
                placeholder="Escribe una skill y pulsa Enter..."
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2"
                style={{ backgroundColor: 'var(--parchment)', border: '1px solid var(--border-cream)', color: 'var(--near-black)' }}
              />
              <button
                data-testid="add-skill-btn"
                onClick={addSkill}
                className="px-4 py-2.5 rounded-xl text-sm font-sans"
                style={{ backgroundColor: 'var(--warm-sand)', color: 'var(--charcoal-warm)', fontWeight: 500 }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Suggested Skills */}
          <div className="mb-4">
            <span className="text-xs font-sans" style={{ color: 'var(--stone-gray)' }}>Sugerencias rapidas:</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {suggestedSkills.filter(s => !userSkills.includes(s)).slice(0, 10).map(s => (
                <button
                  key={s}
                  data-testid={`suggested-skill-${s.toLowerCase().replace(/[\s/]/g, '-')}`}
                  onClick={() => setUserSkills(prev => [...prev, s])}
                  className="px-2.5 py-1 rounded-md text-xs font-sans transition-all"
                  style={{ backgroundColor: 'var(--parchment)', color: 'var(--olive-gray)', border: '1px solid var(--border-cream)' }}
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Skills */}
          {userSkills.length > 0 && (
            <div className="mb-6">
              <span className="text-xs font-sans" style={{ color: 'var(--stone-gray)' }}>Tus skills ({userSkills.length}):</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {userSkills.map(s => (
                  <span
                    key={s}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-sans"
                    style={{ backgroundColor: 'rgba(201,100,66,0.08)', color: 'var(--terracotta)', fontWeight: 500 }}
                  >
                    {s}
                    <button data-testid={`remove-skill-${s.toLowerCase().replace(/[\s/]/g, '-')}`} onClick={() => removeSkill(s)}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            data-testid="analyze-gap-btn"
            onClick={handleAnalyze}
            disabled={loading || userSkills.length === 0 || !targetRole}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-sans transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--terracotta)', color: 'var(--ivory)', fontWeight: 500 }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Target size={18} />
                Analizar Brechas
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div data-testid="gap-results" className="space-y-6 animate-fade-in-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gauge */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)' }}>
                <h2 className="font-serif mb-2" style={{ fontSize: '1.3rem', fontWeight: 500, color: 'var(--near-black)' }}>
                  Cobertura de Competencias
                </h2>
                <p className="font-sans text-sm mb-4" style={{ color: 'var(--olive-gray)' }}>
                  {result.matched_skills} de {result.total_required} skills cubiertas para {result.target_role}
                </p>
                <ReactECharts option={gaugeOption} style={{ height: 250 }} data-testid="coverage-gauge" />
              </div>

              {/* Radar */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)' }}>
                <h2 className="font-serif mb-4" style={{ fontSize: '1.3rem', fontWeight: 500, color: 'var(--near-black)' }}>
                  Perfil vs Requerido
                </h2>
                <ReactECharts option={radarOption} style={{ height: 320 }} data-testid="gap-radar-chart" />
              </div>
            </div>

            {/* Skills Breakdown */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)' }}>
              <div className="p-5 border-b" style={{ borderColor: 'var(--border-cream)' }}>
                <h2 className="font-serif" style={{ fontSize: '1.3rem', fontWeight: 500, color: 'var(--near-black)' }}>
                  Desglose de Competencias
                </h2>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-cream)' }}>
                {result.gap_analysis.map((g, i) => (
                  <div key={g.skill} data-testid={`gap-skill-${i}`} className="flex items-center justify-between px-5 py-3.5" style={{ borderColor: 'var(--border-cream)' }}>
                    <div className="flex items-center gap-3">
                      {g.has_skill ? (
                        <CheckCircle size={16} style={{ color: 'var(--terracotta)' }} />
                      ) : (
                        <AlertTriangle size={16} style={{ color: 'var(--error-crimson)' }} />
                      )}
                      <span className="font-sans text-sm" style={{ color: 'var(--near-black)', fontWeight: 500 }}>{g.skill}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-cream)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${g.importance}%`,
                            backgroundColor: g.has_skill ? 'var(--terracotta)' : 'var(--error-crimson)',
                            opacity: g.has_skill ? 1 : 0.4,
                          }}
                        />
                      </div>
                      <span className="text-xs font-sans w-10 text-right" style={{ color: g.has_skill ? 'var(--terracotta)' : 'var(--error-crimson)', fontWeight: 500 }}>
                        {g.importance}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--near-black)' }}>
                <h2 className="font-serif mb-4" style={{ fontSize: '1.3rem', fontWeight: 500, color: 'var(--ivory)' }}>
                  Recomendaciones
                </h2>
                <div className="space-y-3">
                  {result.recommendations.map((rec, i) => (
                    <div
                      key={rec.skill}
                      data-testid={`recommendation-${i}`}
                      className="flex items-start gap-3 p-4 rounded-xl"
                      style={{ backgroundColor: 'var(--dark-surface)', border: '1px solid var(--border-dark)' }}
                    >
                      <ArrowRight size={16} style={{ color: 'var(--coral)', marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-sans text-sm" style={{ color: 'var(--ivory)', fontWeight: 500 }}>{rec.skill}</span>
                          <span
                            className="px-2 py-0.5 rounded-md text-xs font-sans"
                            style={{
                              backgroundColor: rec.priority === 'Alta' ? 'rgba(201,100,66,0.15)' : 'rgba(135,134,127,0.15)',
                              color: rec.priority === 'Alta' ? 'var(--coral)' : 'var(--warm-silver)',
                              fontWeight: 500,
                            }}
                          >
                            {rec.priority}
                          </span>
                        </div>
                        <p className="font-sans text-xs" style={{ color: 'var(--warm-silver)', lineHeight: 1.5 }}>{rec.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

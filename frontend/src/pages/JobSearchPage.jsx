import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Search, Upload, FileText, MapPin, Building2, Clock, CheckCircle, X, GitCompareArrows, Briefcase } from 'lucide-react';
import { jobsAPI } from '@/lib/api';

export default function JobSearchPage() {
  const [searchMode, setSearchMode] = useState('prompt'); // 'prompt' | 'cv'
  const [prompt, setPrompt] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedOffers, setSelectedOffers] = useState([]);
  const [compareMode, setCompareMode] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) setCvFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleSearch = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      if (searchMode === 'cv' && cvFile) {
        formData.append('cv_file', cvFile);
      } else {
        formData.append('prompt', prompt);
      }
      const { data } = await jobsAPI.search(formData);
      setResults(data);
      setSelectedOffers([]);
      setCompareMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOfferSelection = (offerId) => {
    setSelectedOffers(prev =>
      prev.includes(offerId) ? prev.filter(id => id !== offerId) : [...prev, offerId]
    );
  };

  const getMatchColor = (score) => {
    if (score >= 85) return 'var(--terracotta)';
    if (score >= 70) return '#b8860b';
    return 'var(--stone-gray)';
  };

  return (
    <div data-testid="job-search-page" className="min-h-screen" style={{ backgroundColor: 'var(--parchment)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-serif mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 500, lineHeight: 1.2, color: 'var(--near-black)' }}>
            Busqueda Avanzada de Empleo
          </h1>
          <p className="font-sans text-lg" style={{ color: 'var(--olive-gray)', lineHeight: 1.6 }}>
            Encuentra las ofertas que mejor se ajustan a tu perfil profesional.
          </p>
        </div>

        {/* Search Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            data-testid="mode-prompt-btn"
            onClick={() => setSearchMode('prompt')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-sans transition-all"
            style={{
              backgroundColor: searchMode === 'prompt' ? 'var(--near-black)' : 'var(--warm-sand)',
              color: searchMode === 'prompt' ? 'var(--ivory)' : 'var(--charcoal-warm)',
              fontWeight: 500,
            }}
          >
            <Search size={16} />
            Describir perfil
          </button>
          <button
            data-testid="mode-cv-btn"
            onClick={() => setSearchMode('cv')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-sans transition-all"
            style={{
              backgroundColor: searchMode === 'cv' ? 'var(--near-black)' : 'var(--warm-sand)',
              color: searchMode === 'cv' ? 'var(--ivory)' : 'var(--charcoal-warm)',
              fontWeight: 500,
            }}
          >
            <Upload size={16} />
            Subir CV (PDF)
          </button>
        </div>

        {/* Search Input */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)', boxShadow: 'rgba(0,0,0,0.05) 0px 4px 24px' }}>
          {searchMode === 'prompt' ? (
            <div>
              <label className="block text-sm font-sans mb-2" style={{ color: 'var(--olive-gray)', fontWeight: 500 }}>
                Describe tu perfil, experiencia o lo que buscas
              </label>
              <textarea
                data-testid="search-prompt-input"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Ej: Desarrollador frontend con 3 anios de experiencia en React y TypeScript, busco trabajo remoto en Madrid..."
                className="w-full rounded-xl p-4 text-sm font-sans resize-none focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--parchment)',
                  border: '1px solid var(--border-cream)',
                  color: 'var(--near-black)',
                  minHeight: '120px',
                  lineHeight: 1.6,
                  focusRingColor: 'var(--focus-blue)',
                }}
                rows={4}
              />
            </div>
          ) : (
            <div>
              <div
                {...getRootProps()}
                data-testid="cv-dropzone"
                className="rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{
                  backgroundColor: isDragActive ? 'rgba(201,100,66,0.05)' : 'var(--parchment)',
                  border: `2px dashed ${isDragActive ? 'var(--terracotta)' : 'var(--border-warm)'}`,
                }}
              >
                <input {...getInputProps()} />
                {cvFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText size={24} style={{ color: 'var(--terracotta)' }} />
                    <span className="font-sans text-sm" style={{ color: 'var(--near-black)', fontWeight: 500 }}>{cvFile.name}</span>
                    <button
                      data-testid="remove-cv-btn"
                      onClick={e => { e.stopPropagation(); setCvFile(null); }}
                      className="p-1 rounded-full"
                      style={{ backgroundColor: 'var(--warm-sand)' }}
                    >
                      <X size={14} style={{ color: 'var(--charcoal-warm)' }} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={32} style={{ color: 'var(--stone-gray)', margin: '0 auto 12px' }} />
                    <p className="font-sans text-sm" style={{ color: 'var(--olive-gray)' }}>
                      Arrastra tu CV aqui o haz clic para seleccionarlo
                    </p>
                    <p className="font-sans text-xs mt-1" style={{ color: 'var(--stone-gray)' }}>Solo PDF</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            data-testid="search-submit-btn"
            onClick={handleSearch}
            disabled={loading || (searchMode === 'prompt' && !prompt.trim()) || (searchMode === 'cv' && !cvFile)}
            className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-sans transition-all disabled:opacity-50"
            style={{
              backgroundColor: 'var(--terracotta)',
              color: 'var(--ivory)',
              fontWeight: 500,
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Search size={18} />
                Buscar Ofertas
              </>
            )}
          </button>
        </div>

        {/* Compare Bar */}
        {selectedOffers.length >= 2 && (
          <div
            data-testid="compare-bar"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-6 py-3 rounded-2xl animate-fade-in-up"
            style={{
              backgroundColor: 'var(--near-black)',
              boxShadow: 'rgba(0,0,0,0.2) 0px 8px 32px',
            }}
          >
            <GitCompareArrows size={18} style={{ color: 'var(--coral)' }} />
            <span className="font-sans text-sm" style={{ color: 'var(--ivory)' }}>
              {selectedOffers.length} ofertas seleccionadas
            </span>
            <button
              data-testid="compare-toggle-btn"
              onClick={() => setCompareMode(!compareMode)}
              className="px-4 py-1.5 rounded-lg text-sm font-sans"
              style={{ backgroundColor: 'var(--terracotta)', color: 'var(--ivory)', fontWeight: 500 }}
            >
              {compareMode ? 'Volver a lista' : 'Comparar'}
            </button>
          </div>
        )}

        {/* Results */}
        {results && !compareMode && (
          <div data-testid="search-results">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif" style={{ fontSize: '1.6rem', fontWeight: 500, color: 'var(--near-black)' }}>
                {results.total} ofertas encontradas
              </h2>
              <span className="font-sans text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--warm-sand)', color: 'var(--charcoal-warm)' }}>
                Ordenadas por relevancia
              </span>
            </div>
            <div className="grid gap-4">
              {results.offers.map((offer, i) => (
                <div
                  key={offer.id}
                  data-testid={`offer-card-${offer.id}`}
                  className="rounded-2xl p-5 transition-all opacity-0 animate-fade-in-up"
                  style={{
                    backgroundColor: 'var(--ivory)',
                    border: selectedOffers.includes(offer.id) ? '2px solid var(--terracotta)' : '1px solid var(--border-cream)',
                    boxShadow: 'rgba(0,0,0,0.03) 0px 2px 12px',
                    animationDelay: `${i * 0.05}s`,
                    animationFillMode: 'forwards',
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--near-black)', lineHeight: 1.2 }}>
                            {offer.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-sm font-sans" style={{ color: 'var(--olive-gray)' }}>
                              <Building2 size={14} /> {offer.company}
                            </span>
                            <span className="flex items-center gap-1 text-sm font-sans" style={{ color: 'var(--olive-gray)' }}>
                              <MapPin size={14} /> {offer.location}
                            </span>
                            <span className="flex items-center gap-1 text-sm font-sans" style={{ color: 'var(--olive-gray)' }}>
                              <Clock size={14} /> {offer.experience_years} anos exp.
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="px-3 py-1 rounded-full text-sm font-sans"
                            style={{
                              backgroundColor: `${getMatchColor(offer.match_score)}15`,
                              color: getMatchColor(offer.match_score),
                              fontWeight: 600,
                            }}
                          >
                            {offer.match_score}% match
                          </div>
                        </div>
                      </div>

                      <p className="font-sans text-sm my-3" style={{ color: 'var(--olive-gray)', lineHeight: 1.6 }}>
                        {offer.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {offer.skills.map(skill => (
                          <span
                            key={skill}
                            className="px-2.5 py-0.5 rounded-md text-xs font-sans"
                            style={{ backgroundColor: 'var(--warm-sand)', color: 'var(--charcoal-warm)', fontWeight: 500 }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <span className="font-sans text-sm" style={{ color: 'var(--near-black)', fontWeight: 600 }}>
                          <Briefcase size={14} className="inline mr-1" />{offer.salary_range}
                        </span>
                        {offer.remote && (
                          <span className="flex items-center gap-1 text-xs font-sans px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(201,100,66,0.08)', color: 'var(--terracotta)', fontWeight: 500 }}>
                            <CheckCircle size={12} /> Remoto
                          </span>
                        )}
                        <span className="text-xs font-sans" style={{ color: 'var(--stone-gray)' }}>
                          {offer.type}
                        </span>
                      </div>
                    </div>

                    <button
                      data-testid={`select-offer-${offer.id}`}
                      onClick={() => toggleOfferSelection(offer.id)}
                      className="self-start px-3 py-2 rounded-lg text-xs font-sans whitespace-nowrap transition-all"
                      style={{
                        backgroundColor: selectedOffers.includes(offer.id) ? 'var(--terracotta)' : 'var(--warm-sand)',
                        color: selectedOffers.includes(offer.id) ? 'var(--ivory)' : 'var(--charcoal-warm)',
                        fontWeight: 500,
                      }}
                    >
                      {selectedOffers.includes(offer.id) ? 'Seleccionada' : 'Seleccionar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compare Mode */}
        {compareMode && selectedOffers.length >= 2 && results && (
          <div data-testid="compare-view">
            <h2 className="font-serif mb-6" style={{ fontSize: '1.6rem', fontWeight: 500, color: 'var(--near-black)' }}>
              Comparacion de Ofertas
            </h2>
            <div className="overflow-x-auto">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedOffers.length}, minmax(280px, 1fr))` }}>
                {results.offers.filter(o => selectedOffers.includes(o.id)).map(offer => (
                  <div
                    key={offer.id}
                    data-testid={`compare-card-${offer.id}`}
                    className="rounded-2xl p-5"
                    style={{ backgroundColor: 'var(--ivory)', border: '1px solid var(--border-cream)' }}
                  >
                    <div className="px-3 py-1 rounded-full text-sm font-sans inline-block mb-3" style={{ backgroundColor: `${getMatchColor(offer.match_score)}15`, color: getMatchColor(offer.match_score), fontWeight: 600 }}>
                      {offer.match_score}% match
                    </div>
                    <h3 className="font-serif mb-1" style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--near-black)' }}>{offer.title}</h3>
                    <p className="font-sans text-sm mb-4" style={{ color: 'var(--olive-gray)' }}>{offer.company}</p>

                    {[
                      { label: 'Ubicacion', value: offer.location },
                      { label: 'Salario', value: offer.salary_range },
                      { label: 'Experiencia', value: `${offer.experience_years} anos` },
                      { label: 'Tipo', value: offer.type },
                      { label: 'Remoto', value: offer.remote ? 'Si' : 'No' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between py-2 border-t" style={{ borderColor: 'var(--border-cream)' }}>
                        <span className="text-xs font-sans" style={{ color: 'var(--stone-gray)' }}>{row.label}</span>
                        <span className="text-xs font-sans" style={{ color: 'var(--near-black)', fontWeight: 500 }}>{row.value}</span>
                      </div>
                    ))}

                    <div className="mt-3">
                      <span className="text-xs font-sans" style={{ color: 'var(--stone-gray)' }}>Skills</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {offer.skills.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded-md text-xs font-sans" style={{ backgroundColor: 'var(--warm-sand)', color: 'var(--charcoal-warm)' }}>{s}</span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="text-xs font-sans" style={{ color: 'var(--stone-gray)' }}>Beneficios</span>
                      <div className="flex flex-col gap-1 mt-1">
                        {offer.benefits.map(b => (
                          <span key={b} className="flex items-center gap-1 text-xs font-sans" style={{ color: 'var(--olive-gray)' }}>
                            <CheckCircle size={10} style={{ color: 'var(--terracotta)' }} /> {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

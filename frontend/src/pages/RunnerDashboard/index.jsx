import { useState, useEffect } from 'react';
import { useSnackbar } from '../../context/SnackbarContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell,
  PieChart, Pie 
} from 'recharts';
import { api } from '../../services/api';
import './styles.css'; 

export function RunnerDashboard() {
  // State definitions
  const [data, setData] = useState(null);
  const [runners, setRunners] = useState([]); 
  const [selectedRunner, setSelectedRunner] = useState(""); 
  const [loading, setLoading] = useState(true);
  const { error } = useSnackbar();

  // 1. Fetch runner list for the dropdown
  useEffect(() => {
    async function loadRunners() {
      try {
        const response = await api.get('/usuarios/');
        setRunners(response); 
      } catch (err) {
        console.error("Error loading user list:", err);
      }
    }
    loadRunners();
  }, []);

  // 2. Fetch Dashboard data (reacts to filter change)
  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        // Construct query params only if a runner is selected
        const params = selectedRunner ? { runner_id: selectedRunner } : {};
        const response = await api.get('/dashboard-runners/', { params });
        setData(response);
      } catch (err) {
        error("Erro ao carregar indicadores de performance.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [selectedRunner, error]);

  if (loading && !data) return <div className="loading-container">A carregar métricas...</div>;
  if (!data) return <div className="no-data">Sem dados para exibição.</div>;

  // Helper functions for date formatting
  const formatTime = (isoString) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return "Sem atividade";
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <main className="container dashboard-container">
      
      {/* Header with Filter Dropdown */}
      <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h2 className="section-title">Performance & Produtividade</h2>
        
        <select 
            className="runner-select"
            value={selectedRunner}
            onChange={(e) => setSelectedRunner(e.target.value)}
            style={{ 
              padding: '10px 15px', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1',
              fontSize: '0.95rem',
              backgroundColor: 'white',
              cursor: 'pointer',
              minWidth: '250px'
            }}
        >
            <option value="">Visão Geral da Equipa</option>
            {runners.map(r => (
                <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
        </select>
      </div>

      {/* KPIs Grid */}
      <div className="kpi-grid">
        <KpiCard 
          value={data.kpis.total_execucoes_concluidas} 
          label="Total Entregue" 
          color="#3b82f6" 
          gradient="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
        />
        <KpiCard 
          value={data.kpis.total_defeitos_reportados} 
          label="Bugs Encontrados" 
          color="#ef4444" 
          gradient="linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)"
        />
        <KpiCard 
          value={`${data.kpis.tempo_medio_execucao_minutos}m`} 
          label="Tempo Médio" 
          color="#10b981" 
          gradient="linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)"
        />
        {/* Dynamic KPI: Shows 'Queue' for Team View OR 'Last Seen' for Individual View */}
        <KpiCard 
          value={selectedRunner ? formatTime(data.kpis.ultima_atividade) : data.kpis.testes_em_fila} 
          label={selectedRunner ? "Última Atividade" : "Testes em Fila"} 
          sublabel={selectedRunner ? formatDate(data.kpis.ultima_atividade) : null}
          color="#f59e0b" 
          gradient="linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
        />
      </div>

      {/* Charts Section */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: selectedRunner ? '1fr 1fr' : '1fr', gap: '25px' }}>
        
        {/* Main Chart Card */}
        <div className="chart-card">
          <h3 className="chart-title">
            {selectedRunner ? "Distribuição de Resultados (Qualidade)" : "Ranking de Produtividade"}
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            {selectedRunner ? (
              // Individual View: Pie Chart (Quality)
              <PieChart>
                <Pie 
                    data={data.charts.status_distribuicao} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" cy="50%" 
                    outerRadius={100} 
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                    {data.charts.status_distribuicao.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : (
              // Team View: Bar Chart (Ranking)
              <BarChart data={data.charts.ranking_produtividade} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Bar dataKey="value" name="Testes Finalizados" radius={[4, 4, 0, 0]} barSize={60}>
                  {data.charts.ranking_produtividade.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Timeline Card (Only visible when a specific runner is selected) */}
        {selectedRunner && (
          <div className="chart-card">
            <h3 className="chart-title">Histórico Recente</h3>
            <div className="timeline-container" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
                {data.charts.timeline.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma atividade registada recentemente.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {data.charts.timeline.map(item => (
                            <li key={item.id} style={{ 
                                marginBottom: '15px', 
                                paddingLeft: '15px', 
                                borderLeft: `3px solid ${item.status === 'passou' ? '#10b981' : item.status === 'falhou' ? '#ef4444' : '#cbd5e1'}` 
                            }}>
                                <div style={{ fontWeight: '600', color: '#334155' }}>{item.case_name}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        textTransform: 'uppercase', 
                                        fontWeight: 'bold',
                                        color: item.status === 'passou' ? '#10b981' : item.status === 'falhou' ? '#ef4444' : '#64748b'
                                    }}>
                                        {item.status}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                        {new Date(item.updated_at).toLocaleString()}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Simple Card Component
function KpiCard({ value, label, sublabel, color, gradient }) {
  return (
    <div className="kpi-card" style={{ borderLeft: `6px solid ${color}`, background: gradient || '#ffffff' }}>
      <div className="kpi-content">
        <h3 className="kpi-value">{value}</h3>
        <span className="kpi-label">{label}</span>
        {sublabel && <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{sublabel}</span>}
      </div>
    </div>
  );
}
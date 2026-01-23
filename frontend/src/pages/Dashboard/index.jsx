import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../context/SnackbarContext';
import { 
  PieChart, Pie, Cell, 
  Tooltip, Legend, ResponsiveContainer,
  LineChart, Line 
} from 'recharts';
import { Pencil, ChevronDown, Search, X } from 'lucide-react';
import { api } from '../../services/api';
import './styles.css'; 
import { SmartTable } from '../../components/SmartTable';

const STATUS_COLORS = {
  'passou': '#10b981', 'falhou': '#ef4444', 'bloqueado': '#f59e0b', 
  'pendente': '#94a3b8', 'em_progresso': '#3b82f6', 'reteste': '#f59e0b', 'fechado': '#10b981'
};
const SEVERITY_COLORS = {
  'critico': '#991b1b', 'alto': '#ef4444', 'medio': '#f59e0b', 'baixo': '#3b82f6'
};

const getStatusColor = (s) => { 
    if(!s) return '#cbd5e1'; 
    return STATUS_COLORS[s.toLowerCase().replace(' ','_')] || '#cbd5e1'; 
};
const getSeverityColor = (s) => { 
    if(!s) return '#cbd5e1'; 
    return SEVERITY_COLORS[s.toLowerCase().trim()] || '#8884d8'; 
};

export function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [sistemas, setSistemas] = useState([]);
  const [selectedSystem, setSelectedSystem] = useState(null); 
  const [systemSearch, setSystemSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [activeDetail, setActiveDetail] = useState(null);
  const [detailsData, setDetailsData] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const { error } = useSnackbar();
  const navigate = useNavigate(); 

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    api.get('/sistemas/')
        .then(resp => setSistemas(Array.isArray(resp) ? resp : []))
        .catch(() => error("Erro ao carregar sistemas."));
  }, [error]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const query = selectedSystem ? `?sistema_id=${selectedSystem.id}` : '';
        const response = await api.get(`/dashboard/${query}`);
        setData(response);
      } catch (err) {
        error("Erro ao carregar dashboard.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [selectedSystem, error]);

  const filteredSistemas = sistemas
    .filter(s => s.nome.toLowerCase().includes(systemSearch.toLowerCase()))
    .slice(0, 5);

  const fetchProjectsList = async () => {
      setLoadingDetails(true);
      try {
          const query = selectedSystem ? `?sistema_id=${selectedSystem.id}` : '';
          const response = await api.get(`/projetos/${query}`);
          setDetailsData(Array.isArray(response) ? response : []); 
      } catch (err) { 
          error("Erro ao listar projetos."); 
      } finally { 
          setLoadingDetails(false); 
      }
  };

  useEffect(() => { 
      if (activeDetail === 'projetos') fetchProjectsList(); 
  }, [activeDetail]);

  const colunasProjetos = [
    { header: 'ID', accessor: 'id', width: '50px' },
    { header: 'Nome do Projeto', accessor: 'nome' },
    { 
        header: 'Responsável', 
        accessor: 'responsavel',
        render: (item) => typeof item.responsavel === 'object' ? item.responsavel?.nome : item.responsavel || '-'
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (item) => (
        <span style={{
          padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
          backgroundColor: item.status === 'ativo' ? '#dcfce7' : '#f3f4f6',
          color: item.status === 'ativo' ? '#166534' : '#374151'
        }}>
          {item.status?.toUpperCase()}
        </span>
      ) 
    },
    {
      header: 'Ação',
      accessor: 'id_action',
      width: '80px',
      render: (item) => (
        <button 
          onClick={() => navigate(`/projetos/${item.id}`)}
          style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
        >
          <Pencil size={16} color="#64748b" />
        </button>
      )
    }
  ];

  if (loading && !data) return <div className="loading-container">Carregando indicadores...</div>;
  
  // Garante estrutura segura caso a API falhe parcialmente
  const safeData = data || { kpis: {}, charts: {} };

  return (
    <main className="container dashboard-container">
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Visão Geral</h2>

        <div className="system-dropdown-container" ref={dropdownRef} style={{ position: 'relative', width: '300px' }}>
            <div 
                className="dropdown-trigger"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{ 
                    background: 'white', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', 
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                }}
            >
                <span style={{ color: selectedSystem ? '#1e293b' : '#64748b' }}>
                    {selectedSystem ? selectedSystem.nome : 'Filtrar por Sistema...'}
                </span>
                <ChevronDown size={18} color="#64748b" />
            </div>

            {isDropdownOpen && (
                <div className="dropdown-menu" style={{
                    position: 'absolute', top: '110%', right: 0, width: '100%', 
                    background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50
                }}>
                    <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 8px' }}>
                            <Search size={14} color="#94a3b8" />
                            <input 
                                autoFocus type="text" placeholder="Buscar..." value={systemSearch}
                                onChange={(e) => setSystemSearch(e.target.value)}
                                style={{ border: 'none', background: 'transparent', padding: '8px', width: '100%', outline: 'none' }}
                            />
                        </div>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
                        <li onClick={() => { setSelectedSystem(null); setIsDropdownOpen(false); }} style={{ padding: '10px', cursor: 'pointer' }}>Todos os Sistemas</li>
                        {filteredSistemas.map(sis => (
                            <li key={sis.id} onClick={() => { setSelectedSystem(sis); setIsDropdownOpen(false); }} style={{ padding: '10px', cursor: 'pointer', background: selectedSystem?.id === sis.id ? '#eff6ff' : 'transparent' }}>
                                {sis.nome}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
      </div>

      <div className="kpi-grid-dashboard-full">
        <div onClick={() => setActiveDetail('projetos')} style={{ cursor: 'pointer' }}>
          <KpiCard value={safeData.kpis.total_projetos || 0} label="PROJETOS ATIVOS" color="#3b82f6" gradient="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" />
        </div>
        <KpiCard value={safeData.kpis.total_ciclos_ativos || 0} label="CICLOS RODANDO" color="#10b981" gradient="linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" />
        <KpiCard value={safeData.kpis.total_casos_teste || 0} label="TOTAL DE CASOS" color="#8b5cf6" gradient="linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)" />
        <KpiCard value={`${safeData.kpis.taxa_sucesso_ciclos || 0}%`} label="TAXA DE SUCESSO" color="#059669" gradient="linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" />
        
        <KpiCard value={safeData.kpis.total_defeitos_abertos || 0} label="BUGS ABERTOS" color="#ef4444" gradient="linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)" />
        <KpiCard value={safeData.kpis.total_defeitos_criticos || 0} label="BUGS CRÍTICOS" color="#991b1b" gradient="linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)" />
        <KpiCard value={safeData.kpis.total_pendentes || 0} label="TESTES PENDENTES" color="#282768" gradient="linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)" />
        <KpiCard value={safeData.kpis.total_aguardando_reteste || 0} label="AGUARDANDO RETESTE" color="#6366f1" gradient="linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)" />
      </div>

      <div className="charts-grid-dashboard-full">
        <div className="chart-card">
          <h3 className="chart-title">Status de Execução</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={safeData.charts?.status_execucao || []} 
                cx="50%" cy="50%" 
                innerRadius={60} outerRadius={100} 
                paddingAngle={5} 
                dataKey="value" nameKey="label"
              >
                {(safeData.charts?.status_execucao || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || getStatusColor(entry.label)} stroke="none"/>
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Defeitos por Severidade</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={safeData.charts?.defeitos_por_severidade || []} 
                dataKey="value" nameKey="label" 
                cx="50%" cy="50%" 
                innerRadius={60} outerRadius={100} 
                paddingAngle={2}
              >
                {(safeData.charts?.defeitos_por_severidade || []).map((entry, index) => (
                  <Cell key={`cell-sev-${index}`} fill={getSeverityColor(entry.label)} stroke="none" />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {activeDetail === 'projetos' && (
        <div className="dash-modal-overlay" onClick={() => setActiveDetail(null)}>
           <div className="dash-modal-content" onClick={e => e.stopPropagation()}>
              <div className="dash-modal-header">
                 <h3>Projetos Ativos {selectedSystem ? `(${selectedSystem.nome})` : ''}</h3>
                 <button className="dash-close-btn" onClick={() => setActiveDetail(null)}>&times;</button>
              </div>
              <div className="dash-modal-body">
                 {loadingDetails ? <p>Carregando...</p> : <SmartTable data={detailsData} columns={colunasProjetos} title="Lista de Projetos" pageSize={5} />}
              </div>
           </div>
        </div>
      )}
    </main>
  );
}

function KpiCard({ value, label, color, gradient }) {
  const fakeData = Array.from({length: 8}, () => ({ val: 30 + Math.random() * 50 }));
  return (
    <div 
      className="kpi-card" 
      style={{ 
        borderLeft: `5px solid ${color}`,
        background: gradient || '#ffffff'
      }}
    >
      <div className="kpi-content">
        <h3 className="kpi-value">{value}</h3>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-chart-mini">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={fakeData}>
            <Line 
              type="monotone" 
              dataKey="val" 
              stroke={color} 
              strokeWidth={3} 
              dot={false} 
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
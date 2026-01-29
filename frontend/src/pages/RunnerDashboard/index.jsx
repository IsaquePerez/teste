import { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Users, User, ChevronDown, Monitor } from 'lucide-react'; 
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import './styles.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function RunnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  // Estados para Testadores
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); 
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);

  // Estados para Sistemas 
  const [systems, setSystems] = useState([]);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [isSystemDropdownOpen, setIsSystemDropdownOpen] = useState(false);
  const systemDropdownRef = useRef(null);
  
  const { error } = useSnackbar();

  
  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
      if (systemDropdownRef.current && !systemDropdownRef.current.contains(event.target)) {
        setIsSystemDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Busca Usuários e Sistemas
  useEffect(() => {
    Promise.all([
      api.get('/usuarios/'),
      api.get('/sistemas/') 
    ]).then(([usersResp, systemsResp]) => {
      setUsers(usersResp || []);
      setSystems(systemsResp || []);
    }).catch(() => error("Erro ao carregar filtros."));
  }, [error]);

  // Busca Performance 
  useEffect(() => {
    async function loadPerformance() {
      setLoading(true);
      try {
        const params = {};
        if (selectedUser) params.user_id = selectedUser.id;
        if (selectedSystem) params.sistema_id = selectedSystem.id; 

        const response = await api.get('/dashboard-runners/performance', { params });
        setData(response);
      } catch (err) {
        error("Erro ao carregar métricas de performance.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPerformance();
  }, [selectedUser, selectedSystem, error]);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setIsUserDropdownOpen(false);
  };

  const handleSystemSelect = (system) => {
    setSelectedSystem(system);
    setIsSystemDropdownOpen(false);
  }

  if (loading && !data) return <div className="loading-container">Carregando performance...</div>;

  const safeData = data || {};
  const isTeamView = !selectedUser;

  // Helpers para decidir quais valores mostrar nos cards
  const stats = isTeamView ? (safeData.stats_equipe || {}) : (safeData.stats_testador || {});

  // Título dinâmico
  const getTitle = () => {
    let title = isTeamView ? 'Performance da Equipe' : `Performance: ${selectedUser.nome}`;
    if (selectedSystem) title += ` em ${selectedSystem.nome}`;
    else title += ` (Geral)`;
    return title;
  }

  return (
    <main className="container dashboard-container">
      
      {/* HEADER & DROPDOWNS */}
      <div className="header-flex">
        <div>
          <h2 className="section-title">{getTitle()}</h2>
          <p className="section-subtitle">
            Análise de qualidade e entrega filtrada
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          
          {/* DROPDOWN DE SISTEMAS */}
          <div className="system-dropdown-container" ref={systemDropdownRef}>
            <div 
              className="dropdown-trigger"
              onClick={() => setIsSystemDropdownOpen(!isSystemDropdownOpen)}
            >
              <span>
                  <Monitor size={16} color="#64748b"/>
                  {selectedSystem ? selectedSystem.nome : 'Todos os Sistemas'}
              </span>
              <ChevronDown size={18} color="#64748b" />
            </div>

            {isSystemDropdownOpen && (
              <div className="dropdown-menu">
                <div 
                  className={`dropdown-item ${!selectedSystem ? 'active' : ''}`}
                  onClick={() => handleSystemSelect(null)}
                >
                  <Monitor size={16} />
                  <span>Todos os Sistemas</span>
                </div>
                <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }}></div>
                {systems.map(s => (
                  <div 
                    key={s.id} 
                    className={`dropdown-item ${selectedSystem?.id === s.id ? 'active' : ''}`}
                    onClick={() => handleSystemSelect(s)}
                  >
                    <span>{s.nome}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DROPDOWN DE USUÁRIOS */}
          <div className="system-dropdown-container" ref={userDropdownRef}>
            <div 
              className="dropdown-trigger"
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            >
              <span>
                  {isTeamView ? <Users size={16} color="#64748b"/> : <User size={16} color="#3b82f6"/>}
                  {isTeamView ? 'Visão Geral' : selectedUser.nome}
              </span>
              <ChevronDown size={18} color="#64748b" />
            </div>

            {isUserDropdownOpen && (
              <div className="dropdown-menu">
                <div 
                  className={`dropdown-item ${isTeamView ? 'active' : ''}`}
                  onClick={() => handleUserSelect(null)}
                >
                  <Users size={16} />
                  <span>Visão da Equipe</span>
                </div>
                <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }}></div>
                {users.map(u => (
                  <div 
                    key={u.id} 
                    className={`dropdown-item ${selectedUser?.id === u.id ? 'active' : ''}`}
                    onClick={() => handleUserSelect(u)}
                  >
                    <User size={16} />
                    <span>{u.nome}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* KPI GRID */}
      <div className="kpi-grid-dashboard-full">
        {isTeamView ? (
          <>
            <KpiCard 
              value={`${stats.taxa_aprovacao || 0}%`} 
              label="TAXA DE APROVAÇÃO" 
              color="#10b981" 
              gradient="linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" 
            />
            <KpiCard 
              value={stats.densidade_defeitos || 0} 
              label="DENSIDADE DE DEFEITOS" 
              color="#ef4444" 
              gradient="linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)" 
            />
            <KpiCard 
              value={stats.total_executions || 0} 
              label="EXECUÇÕES TOTAIS" 
              color="#3b82f6" 
              gradient="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" 
            />
            <KpiCard 
              value={stats.total_defects || 0} 
              label="BUGS TOTAIS" 
              color="#f59e0b" 
              gradient="linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" 
            />
          </>
        ) : (
          <>
            <KpiCard 
              value={stats.bugs_reportados || 0} 
              label="BUGS REPORTADOS" 
              color="#ef4444" 
              gradient="linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)" 
            />
            <KpiCard 
              value={stats.total_execucoes || 0} 
              label="PRODUTIVIDADE (CASOS)" 
              color="#3b82f6" 
              gradient="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" 
            />
            <KpiCard 
              value={`${stats.taxa_bloqueio || 0}%`} 
              label="TAXA DE BLOQUEIO" 
              color="#f59e0b" 
              gradient="linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" 
            />
            <KpiCard 
              value={`${(100 - (stats.taxa_bloqueio || 0)).toFixed(1)}%`} 
              label="FLUXO LIMPO (APROV)" 
              color="#10b981" 
              gradient="linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" 
            />
          </>
        )}
      </div>

      {/* CHARTS GRID  */}
      <div className="charts-grid-dashboard-full">
        
        {/* Gráfico 1: Velocidade  */}
        <div className="chart-card">
          <h3 className="chart-title">Velocidade de Entrega (30 dias)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={safeData.grafico_velocidade || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 2: Status/Rigor */}
        <div className="chart-card">
          <h3 className="chart-title">Status e Rigor</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={safeData.grafico_rigor || []}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {(safeData.grafico_rigor || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} stroke="none"/>
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 3: Top Ofensores */}
        <div className="chart-card full-width">
          <h3 className="chart-title">Módulos Mais Críticos</h3>
          <ResponsiveContainer width="100%" height={250}>
              <BarChart layout="vertical" data={safeData.grafico_top_modulos || []} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="label" type="category" width={150} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={25} />
              </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

    </main>
  );
}

// Componente Visual KpiCard 
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
import { useState, useEffect } from 'react';
import { useSnackbar } from '../../context/SnackbarContext';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer,
  LineChart, Line 
} from 'recharts';
import { api } from '../../services/api';
import './styles.css';

export function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { error } = useSnackbar();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await api.get('/dashboard/');
        setData(response);
      } catch (err) {
        error("Erro ao carregar dashboard.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [error]);

  if (loading) return <div className="loading-container">Carregando indicadores...</div>;
  if (!data) return <div className="no-data">Sem dados para exibir.</div>;

  return (
    <main className="container dashboard-container">
      <h2 className="section-title">Visão Geral do QA</h2>

      {/* --- GRID DE 8 KPI CARDS (4 x 2) --- */}
      <div className="kpi-grid">
        {/* LINHA 1 - VOLTANDO AOS TONS PASTÉIS */}
        <KpiCard 
          value={data.kpis.total_projetos} 
          label="PROJETOS ATIVOS" 
          color="#3b82f6" 
          gradient="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
        />
        <KpiCard 
          value={data.kpis.total_ciclos_ativos} 
          label="CICLOS RODANDO" 
          color="#10b981" 
          gradient="linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)"
        />
        <KpiCard 
          value={data.kpis.total_casos_teste} 
          label="TOTAL DE CASOS" 
          color="#8b5cf6" 
          gradient="linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)"
        />
        <KpiCard 
          value={`${data.kpis.taxa_sucesso_ciclos}%`} 
          label="TAXA DE SUCESSO" 
          color="#059669" 
          gradient="linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
        />

        {/* LINHA 2 */}
        <KpiCard 
          value={data.kpis.total_defeitos_abertos} 
          label="BUGS ABERTOS" 
          color="#ef4444" 
          gradient="linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)"
        />
        <KpiCard 
          value={data.kpis.total_defeitos_criticos} 
          label="BUGS CRÍTICOS" 
          color="#991b1b" 
          gradient="linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)"
        />
        <KpiCard 
          value={data.kpis.total_bloqueados} 
          label="TESTES BLOQUEADOS" 
          color="#f59e0b" 
          gradient="linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
        />
        <KpiCard 
          value={data.kpis.total_aguardando_reteste} 
          label="AGUARDANDO RETESTE" 
          color="#6366f1" 
          gradient="linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)"
        />
      </div>

      <div className="charts-grid">
        {/* GRÁFICOS VISUAIS (MANTIDOS IGUAIS) */}
        <div className="chart-card">
          <h3 className="chart-title">Status de Execução</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.charts.status_execucao}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {data.charts.status_execucao.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#cccccc'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Defeitos por Severidade</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.charts.defeitos_por_severidade}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{fontSize: 12}} />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" name="Quantidade" radius={[4, 4, 0, 0]}>
                {data.charts.defeitos_por_severidade.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#000000'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card full-width">
          <h3 className="chart-title">Top 5 Módulos com Mais Defeitos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              layout="vertical" 
              data={data.charts.top_modulos_defeitos}
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={150} tick={{fontSize: 12}} />
              <Tooltip cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="value" name="Defeitos" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}

// Card atualizado: Com Borda Lateral + Texto Escuro + Sparkline Colorido
function KpiCard({ value, label, color, gradient }) {
  const fakeData = [
    { val: 30 + Math.random() * 20 },
    { val: 40 + Math.random() * 20 },
    { val: 35 + Math.random() * 20 },
    { val: 50 + Math.random() * 20 },
    { val: 45 + Math.random() * 20 },
    { val: 60 + Math.random() * 20 },
    { val: 55 + Math.random() * 20 },
    { val: 70 + Math.random() * 20 },
  ];

  return (
    <div 
      className="kpi-card" 
      style={{ 
        borderLeft: `5px solid ${color}`, // A borda voltou!
        background: gradient || '#ffffff'
      }}
    >
      <div className="kpi-content">
        <h3 className="kpi-value" style={{ color: '#1e293b' }}>{value}</h3>
        <span className="kpi-label" style={{ color: '#475569' }}>{label}</span>
      </div>
      
      <div className="kpi-chart-mini">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={fakeData}>
            <Line 
              type="monotone" 
              dataKey="val" 
              stroke={color} // Linha da cor do tema (não mais branca)
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
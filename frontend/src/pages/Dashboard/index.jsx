import { useState, useEffect } from 'react';
import { useSnackbar } from '../../context/SnackbarContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import './styles.css';

export function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 1. Extraímos a função de erro do hook
  const { error } = useSnackbar();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await api.get('/dashboard/');
        setData(response);
      } catch (err) {
        // 2. Substituímos o toast.error
        error("Erro ao carregar dashboard.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []); // O hook é estável, não precisa ser dependência obrigatória aqui, mas se o linter pedir, adicione [error]

  if (loading) return <div className="loading-container">Carregando indicadores...</div>;
  if (!data) return <div className="no-data">Sem dados para exibir.</div>;

  return (
    <main className="container dashboard-container">
      <h2 className="section-title" style={{marginBottom: '15px' }}>Visão Geral do QA</h2>

      <div className="kpi-grid">
        <KpiCard value={data.kpis.total_projetos} label="PROJETOS ATIVOS" color="#3b82f6" />
        <KpiCard value={data.kpis.total_ciclos_ativos} label="CICLOS RODANDO" color="#10b981" />
        <KpiCard value={data.kpis.total_casos_teste} label="TOTAL DE TESTES" color="#8b5cf6" />
        <KpiCard value={data.kpis.total_defeitos_abertos} label="BUGS ABERTOS" color="#ef4444" />
      </div>

      <div className="charts-grid">
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
                  <Cell key={`cell-${index}`} fill={entry.color} />
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" name="Quantidade">
                {data.charts.defeitos_por_severidade.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}

function KpiCard({ value, label, color }) {
  return (
    <div className="kpi-card" style={{ borderTopColor: color }}>
      <h3 className="kpi-value">{value}</h3>
      <span className="kpi-label">{label}</span>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { api } from '../services/api';

export function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await api.get('/dashboard/');
        setData(response);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar dashboard.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="container">Carregando...</div>;
  if (!data) return <div className="container">Sem dados.</div>;

  return (
    <main className="container">
      <h2 className="section-title">Visão Geral do QA</h2>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <KpiCard value={data.kpis.total_projetos} label="PROJETOS ATIVOS" color="#3b82f6" />
        <KpiCard value={data.kpis.total_ciclos_ativos} label="CICLOS RODANDO" color="#10b981" />
        <KpiCard value={data.kpis.total_casos_teste} label="TOTAL DE TESTES" color="#8b5cf6" />
        <KpiCard value={data.kpis.total_defeitos_abertos} label="BUGS ABERTOS" color="#ef4444" />
      </div>

      <div className="grid">
        
        {/* Status Execução */}
        <div className="card" style={{ minHeight: '400px' }}>
          <h3 style={{ marginTop: 0 }}>Status de Execução</h3>
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

        {/* Severidade dos Defeitos */}
        <div className="card" style={{ minHeight: '400px' }}>
          <h3 style={{ marginTop: 0 }}>Defeitos por Severidade</h3>
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
    <div className="card" style={{ textAlign: 'center', borderTop: `4px solid ${color}` }}>
      <h3 style={{ margin: '10px 0 5px 0', fontSize: '2.5rem', color: '#1e293b' }}>
        {value}
      </h3>
      <span className="muted" style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px' }}>
        {label}
      </span>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function AdminCiclos() {
  const [projetos, setProjetos] = useState([]);
  const [selectedProjeto, setSelectedProjeto] = useState('');
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'planejado'
  });

  useEffect(() => {
    api.get("/projetos").then(data => {
      setProjetos(data);
      if (data.length > 0) setSelectedProjeto(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedProjeto) loadCiclos(selectedProjeto);
  }, [selectedProjeto]);

  const loadCiclos = async (projId) => {
    setLoading(true);
    try {
      const data = await api.get(`/testes/projetos/${projId}/ciclos`);
      setCiclos(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  // --- HELPERS ---

  const formatForInput = (dateString) => {
      if (!dateString) return '';
      return dateString.split('T')[0];
  };

  const formatDateTable = (dateString) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const getHojeISO = () => {
      const hoje = new Date();
      return new Date(hoje.getTime() - (hoje.getTimezoneOffset() * 60000))
          .toISOString()
          .split('T')[0];
  };

  // --- AÇÕES ---

  const handleEdit = (ciclo) => {
    setForm({
      nome: ciclo.nome,
      descricao: ciclo.descricao || '',
      data_inicio: formatForInput(ciclo.data_inicio),
      data_fim: formatForInput(ciclo.data_fim),
      status: ciclo.status
    });
    setEditingId(ciclo.id);
    setView('form');
  };

  const handleDelete = async (id) => {
    if(!confirm("Tem a certeza que deseja excluir este ciclo?")) return;
    try {
        await api.delete(`/testes/ciclos/${id}`);
        loadCiclos(selectedProjeto);
    } catch (e) { alert("Erro ao excluir."); }
  };

  const handleCancel = () => {
    setView('list');
    setEditingId(null);
    setForm({ nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'planejado' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjeto) return alert("Selecione um projeto!");

    // VALIDAÇÃO BÁSICA PARA EVITAR ERRO DE DADOS VAZIOS
    if (!form.data_inicio || !form.data_fim) {
        return alert("Por favor, preencha as datas de início e fim.");
    }

    try {
      const payload = { 
          ...form, 
          projeto_id: parseInt(selectedProjeto),
          // CORREÇÃO DO ERRO DE CRIAÇÃO:
          // Garante que só chama toISOString se a data existir
          data_inicio: new Date(form.data_inicio).toISOString(),
          data_fim: new Date(form.data_fim).toISOString()
      };

      if (editingId) {
          await api.put(`/testes/ciclos/${editingId}`, payload);
          alert("Ciclo atualizado!");
      } else {
          await api.post(`/testes/projetos/${selectedProjeto}/ciclos`, payload);
          alert("Ciclo criado!");
      }
      
      handleCancel();
      loadCiclos(selectedProjeto);

    } catch (error) {
      console.error(error);
      alert("Erro ao salvar: " + (error.response?.data?.detail || error.message));
    }
  };

  const getStatusColor = (st) => {
      switch(st) {
          case 'em_execucao': return '#dbeafe';
          case 'concluido': return '#dcfce7';
          case 'atrasado': return '#fee2e2';
          default: return '#f3f4f6';
      }
  };

  return (
    <main className="container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <div>
           <h2 className="section-title" style={{marginBottom: '5px', border: 'none'}}>Gestão de Ciclos</h2>
           <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
             <label style={{fontSize: '0.9rem', fontWeight: 600}}>Projeto:</label>
             <select 
                value={selectedProjeto} 
                onChange={e => setSelectedProjeto(e.target.value)}
                style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc'}}
             >
                {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
             </select>
           </div>
        </div>
        
        {view === 'list' && (
           <button onClick={() => { setView('form'); setEditingId(null); setForm({ nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'planejado' }); }} className="btn primary">
             Novo Ciclo
           </button>
        )}
        {view === 'form' && (
           <button onClick={handleCancel} className="btn">Voltar</button>
        )}
      </div>

      {view === 'form' && (
        <section className="card">
          <h3 style={{marginTop:0}}>{editingId ? 'Editar Ciclo' : 'Novo Ciclo'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
               <div style={{gridColumn: '1/-1'}}>
                 <label>Nome do Ciclo / Sprint</label>
                 <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Sprint 32 - Release Mensal" />
               </div>
               
               <div style={{gridColumn: '1/-1'}}>
                 <label>Descrição / Objetivo</label>
                 <textarea 
                   value={form.descricao} 
                   onChange={e => setForm({...form, descricao: e.target.value})}
                   style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px'}}
                 />
               </div>

               <div>
                 <label>Data Início</label>
                 <input 
                   type="date" 
                   required
                   value={form.data_inicio} 
                   onChange={e => setForm({...form, data_inicio: e.target.value})} 
                   // CORREÇÃO DO BLOQUEIO:
                   // Se for NOVO, bloqueia passado. 
                   // Se for EDIÇÃO, remove o bloqueio para permitir editar ciclos antigos sem erro.
                   min={!editingId ? getHojeISO() : undefined}
                 />
               </div>
               
               <div>
                 <label>Data Fim</label>
                 <input 
                   type="date" 
                   required
                   value={form.data_fim} 
                   onChange={e => setForm({...form, data_fim: e.target.value})}
                   // CORREÇÃO DO BLOQUEIO:
                   // A data fim SEMPRE tem que ser maior ou igual a data inicio (mesmo na edição)
                   min={form.data_inicio}
                 />
               </div>

               <div>
                 <label>Status</label>
                 <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="planejado">Planejado</option>
                    <option value="em_execucao">Em Execução</option>
                    <option value="concluido">Concluído</option>
                    <option value="pausado">Pausado</option>
                 </select>
               </div>
            </div>
            
            <div className="actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
              <button type="submit" className="btn primary">{editingId ? 'Salvar Alterações' : 'Criar Ciclo'}</button>
              <button type="button" onClick={handleCancel} className="btn">Cancelar</button>
            </div>
          </form>
        </section>
      )}

      {view === 'list' && (
        <section className="card">
           {loading ? <p>Carregando...</p> : (
             <div className="table-wrap">
               {ciclos.length === 0 ? <p className="muted">Nenhum ciclo encontrado para este projeto.</p> : (
                 <table>
                   <thead>
                     <tr>
                       <th>ID</th>
                       <th>Nome</th>
                       <th>Período</th>
                       <th>Status</th>
                       <th>Ações</th>
                     </tr>
                   </thead>
                   <tbody>
                     {ciclos.map(c => (
                       <tr key={c.id}>
                         <td style={{color: '#94a3b8'}}>#{c.id}</td>
                         <td>
                           <strong>{c.nome}</strong><br/>
                           <span style={{fontSize:'0.85em', color:'#6b7280'}}>{c.descricao}</span>
                         </td>
                         <td>
                            {formatDateTable(c.data_inicio)} 
                            {' até '} 
                            {formatDateTable(c.data_fim)}
                         </td>
                         <td>
                            <span className="badge" style={{backgroundColor: getStatusColor(c.status)}}>
                                {c.status.replace('_', ' ').toUpperCase()}
                            </span>
                         </td>
                         <td>
                            <button onClick={() => handleEdit(c)} className="btn" style={{fontSize: '0.8rem', marginRight: '5px', padding: '4px 8px'}}>Editar</button>
                            <button onClick={() => handleDelete(c.id)} className="btn danger" style={{fontSize: '0.8rem', padding: '4px 8px'}}>Excluir</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
             </div>
           )}
        </section>
      )}
    </main>
  );
}
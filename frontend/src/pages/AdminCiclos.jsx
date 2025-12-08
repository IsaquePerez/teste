import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';

export function AdminCiclos() {
  const [projetos, setProjetos] = useState([]);
  const [selectedProjeto, setSelectedProjeto] = useState('');
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'planejado'
  });

  // --- CARREGAMENTO ---
  useEffect(() => {
    api.get("/projetos").then(data => {
      setProjetos(data);
      const ativos = data.filter(p => p.status === 'ativo');
      if (ativos.length > 0) setSelectedProjeto(ativos[0].id);
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

  const currentProject = projetos.find(p => p.id == selectedProjeto);
  const isProjectActive = currentProject?.status === 'ativo';

  // --- HELPERS VISUAIS ---
  const formatForInput = (dateString) => dateString ? dateString.split('T')[0] : '';
  const formatDateTable = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';
  const getHojeISO = () => new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  const getStatusColor = (st) => {
      switch(st) {
          case 'em_execucao': return '#dbeafe'; 
          case 'concluido': return '#dcfce7';   
          case 'atrasado': return '#fee2e2';    
          default: return '#f3f4f6';            
      }
  };

  // --- COMPONENTE DE BARRA DE PROGRESSO ---
  const renderProgress = (concluidos, total) => {
      if (!total || total === 0) return <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>Sem testes</span>;
      const pct = Math.round((concluidos / total) * 100);
      
      let color = '#3b82f6'; // Azul
      if (pct === 100) color = '#10b981'; // Verde
      
      return (
          <div style={{width: '100%', maxWidth: '120px'}}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem', marginBottom:'2px', fontWeight:'600', color: '#475569'}}>
                  <span>{pct}%</span>
                  <span>{concluidos}/{total}</span>
              </div>
              <div style={{width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden'}}>
                  <div style={{width: `${pct}%`, height: '100%', backgroundColor: color, transition: 'width 0.5s'}}></div>
              </div>
          </div>
      );
  };

  // --- AÇÕES ---
  const handleNew = () => {
      if (!isProjectActive) return alert(`Projeto ${currentProject?.status}. Criação bloqueada.`);
      setView('form'); setEditingId(null);
      setForm({ nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'planejado' });
  };

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
    if(!confirm("Tem a certeza?")) return;
    try { await api.delete(`/testes/ciclos/${id}`); loadCiclos(selectedProjeto); } catch (e) { alert("Erro ao excluir."); }
  };

  const handleCancel = () => { setView('list'); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjeto) return alert("Selecione um projeto!");
    if (!form.data_inicio || !form.data_fim) return alert("Preencha as datas.");

    try {
      const payload = { 
          ...form, projeto_id: parseInt(selectedProjeto),
          data_inicio: new Date(form.data_inicio).toISOString(),
          data_fim: new Date(form.data_fim).toISOString()
      };
      if (editingId) { await api.put(`/testes/ciclos/${editingId}`, payload); alert("Atualizado!"); } 
      else { await api.post(`/testes/projetos/${selectedProjeto}/ciclos`, payload); alert("Criado!"); }
      handleCancel(); loadCiclos(selectedProjeto);
    } catch (error) { alert("Erro ao salvar."); }
  };

  const navbarTarget = document.getElementById('header-actions');

  return (
    <main className="container">
      <style>{`tr.hover-row:hover { background-color: #f1f5f9 !important; cursor: pointer; }`}</style>

      {/* HEADER via Portal */}
      {navbarTarget && createPortal(
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
           <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
             <span style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase'}}>Projeto:</span>
             <select 
                value={selectedProjeto} onChange={e => setSelectedProjeto(e.target.value)}
                style={{padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff'}}
             >
                {projetos.filter(p => p.status === 'ativo').map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
             </select>
           </div>
           {view === 'list' ? (
             <button onClick={handleNew} className="btn primary" disabled={!isProjectActive} style={{height: '34px', opacity: isProjectActive ? 1 : 0.5, cursor: isProjectActive ? 'pointer' : 'not-allowed', fontSize: '0.9rem'}}>Novo Ciclo</button>
           ) : (
             <button onClick={handleCancel} className="btn" style={{height: '34px', fontSize: '0.9rem'}}>Voltar</button>
           )}
        </div>,
        navbarTarget
      )}

      {/* FORMULÁRIO */}
      {view === 'form' && (
        <section className="card">
          <h3 style={{marginTop:0}}>{editingId ? 'Editar Ciclo' : 'Novo Ciclo'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
               <div style={{gridColumn: '1/-1'}}>
                 <label>Nome do Ciclo / Sprint</label>
                 <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Sprint 32" />
               </div>
               <div style={{gridColumn: '1/-1'}}>
                 <label>Descrição</label>
                 <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px'}}/>
               </div>
               <div>
                 <label>Início</label>
                 <input type="date" required value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} min={!editingId ? getHojeISO() : undefined}/>
               </div>
               <div>
                 <label>Fim</label>
                 <input type="date" required value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} min={form.data_inicio}/>
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
              <button type="submit" className="btn primary">{editingId ? 'Salvar' : 'Criar'}</button>
              <button type="button" onClick={handleCancel} className="btn">Cancelar</button>
            </div>
          </form>
        </section>
      )}

      {/* LISTA COM PROGRESSO */}
      {view === 'list' && (
        <section className="card" style={{marginTop:'20px'}}>
           {loading ? <p>Carregando...</p> : (
             <div className="table-wrap">
               {ciclos.length === 0 ? <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}><p>Nenhum ciclo encontrado.</p>{isProjectActive && <button onClick={handleNew} className="btn primary">Criar primeiro</button>}</div> : (
                 <table>
                   <thead><tr><th>Nome</th><th>Período</th><th>Status</th><th>Progresso</th><th style={{textAlign: 'right'}}>Ações</th></tr></thead>
                   <tbody>
                     {ciclos.map(c => (
                       <tr key={c.id} className="hover-row" onClick={() => handleEdit(c)} title="Clique para editar">
                         <td>
                             <div style={{fontWeight:600, color:'#334155'}}>{c.nome}</div>
                             <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>#{c.id} • {c.descricao}</div>
                         </td>
                         <td>{formatDateTable(c.data_inicio)} até {formatDateTable(c.data_fim)}</td>
                         <td><span className="badge" style={{backgroundColor: getStatusColor(c.status)}}>{c.status.replace('_', ' ').toUpperCase()}</span></td>
                         
                         {/* NOVA COLUNA DE PROGRESSO */}
                         <td style={{minWidth: '140px'}}>
                             {renderProgress(c.testes_concluidos, c.total_testes)}
                         </td>

                         <td style={{textAlign: 'right'}}>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="btn danger" style={{fontSize: '0.8rem', padding: '4px 8px'}}>Excluir</button>
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
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

export function AdminCiclos() {
  const [projetos, setProjetos] = useState([]);
  const [selectedProjeto, setSelectedProjeto] = useState('');
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'planejado'
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [cicloToDelete, setCicloToDelete] = useState(null);

  // Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const opcoesParaMostrar = searchTerm === '' 
    ? [...ciclos].sort((a, b) => b.id - a.id).slice(0, 5) 
    : ciclos.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 8);

  const filteredCiclos = ciclos.filter(c => 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const truncate = (str, n = 40) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;
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

  const renderProgress = (concluidos, total) => {
      if (!total || total === 0) return <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>Sem testes</span>;
      const pct = Math.round((concluidos / total) * 100);
      let color = '#3b82f6';
      if (pct === 100) color = '#10b981';
      
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

  useEffect(() => {
    const fetchProjetos = async () => {
        try {
            const data = await api.get("/projetos");
            setProjetos(data || []);
            const ativos = data.filter(p => p.status === 'ativo');
            if (ativos.length > 0) setSelectedProjeto(ativos[0].id);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar projetos.");
        }
    };
    fetchProjetos();
  }, []);

  useEffect(() => {
    if (selectedProjeto) loadCiclos(selectedProjeto);
  }, [selectedProjeto]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const loadCiclos = async (projId) => {
    setLoading(true);
    try {
      const data = await api.get(`/testes/projetos/${projId}/ciclos`);
      setCiclos(Array.isArray(data) ? data : []);
    } catch (error) { 
        toast.error("Erro ao carregar ciclos.");
    } finally { 
        setLoading(false); 
    }
  };

  const currentProject = projetos.find(p => p.id == selectedProjeto);
  const isProjectActive = currentProject?.status === 'ativo';

  const handleNew = () => {
      if (!isProjectActive) return toast.warning(`Projeto ${currentProject?.status?.toUpperCase()}. Criação bloqueada.`);
      setView('form'); 
      setEditingId(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjeto) return toast.warning("Selecione um projeto!");
    if (!form.nome.trim()) return toast.warning("Nome obrigatório.");
    if (!form.data_inicio || !form.data_fim) return toast.warning("Datas obrigatórias.");
    if (form.data_inicio > form.data_fim) return toast.warning("Início não pode ser maior que fim.");

    try {
      const payload = { 
          ...form, projeto_id: parseInt(selectedProjeto),
          data_inicio: new Date(form.data_inicio).toISOString(),
          data_fim: new Date(form.data_fim).toISOString()
      };
      
      if (editingId) { 
          await api.put(`/testes/ciclos/${editingId}`, payload); 
          toast.success("Ciclo atualizado!"); 
      } else { 
          await api.post(`/testes/projetos/${selectedProjeto}/ciclos`, payload); 
          toast.success("Ciclo criado!"); 
      }
      setView('list'); setEditingId(null);
      loadCiclos(selectedProjeto);
    } catch (error) { 
        toast.error(error.message || "Erro ao salvar."); 
    }
  };

  const handleDelete = async () => {
      if (!cicloToDelete) return;
      try { 
          await api.delete(`/testes/ciclos/${cicloToDelete.id}`); 
          toast.success("Ciclo excluído."); 
          loadCiclos(selectedProjeto); 
      } catch (e) { 
          toast.error("Erro ao excluir."); 
      } finally {
          setIsDeleteModalOpen(false);
          setCicloToDelete(null);
      }
  };

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Ciclo?"
        message={`Deseja excluir "${cicloToDelete?.nome}"? O histórico será perdido.`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />

      {view === 'form' && (
        <section className="card">
          <div style={{borderBottom:'1px solid #f1f5f9', paddingBottom:'15px', marginBottom:'20px'}}>
             <h3 style={{margin:0, color: '#1e293b'}}>{editingId ? 'Editar Ciclo' : 'Novo Ciclo'}</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
               <div style={{gridColumn: '1/-1'}}>
                 <label>Nome do Ciclo / Sprint</label>
                 <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Sprint 32" />
               </div>
               <div style={{gridColumn: '1/-1'}}>
                 <label>Descrição</label>
                 <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px'}}/>
               </div>
               <div>
                 <label>Início</label>
                 <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} min={!editingId ? getHojeISO() : undefined} />
               </div>
               <div>
                 <label>Fim</label>
                 <input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} min={form.data_inicio} />
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
              <button type="button" onClick={() => {setView('list'); setEditingId(null);}} className="btn">Cancelar</button>
            </div>
          </form>
        </section>
      )}

      {/* --- LISTA --- */}
      {view === 'list' && (
        <section className="card" style={{marginTop: 0}}>
           
           <div style={{
               paddingBottom: '15px', 
               borderBottom: '1px solid #f1f5f9', 
               marginBottom: '15px', 
               display: 'flex', 
               justifyContent: 'space-between', 
               alignItems: 'center', 
               flexWrap: 'wrap', 
               gap: '15px'
           }}>
               
               <h3 style={{margin: 0, fontSize: '1.25rem', color: '#1e293b'}}>Gestão de Ciclos</h3>
               
               <div style={{display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap'}}>

                   <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                       <span style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px'}}>PROJETO:</span>
                       <select 
                        value={selectedProjeto} 
                        onChange={e => setSelectedProjeto(e.target.value)}
                        style={{
                            padding: '6px 10px', 
                            borderRadius: '6px', 
                            border: '1px solid #cbd5e1', 
                            fontSize: '0.85rem', 
                            backgroundColor: '#f8fafc',
                            cursor: 'pointer',
                            minWidth: '160px',
                            fontWeight: 500,
                            color: '#334155'
                        }}
                       >
                        {projetos.filter(p => p.status === 'ativo').map(p => (
                            <option key={p.id} value={p.id}>{truncate(p.nome, 25)}</option>
                        ))}
                       </select>
                   </div>

                   <button 
                        onClick={handleNew} 
                        className="btn primary" 
                        disabled={!isProjectActive} 
                        style={{
                            height: '34px', 
                            padding: '0 15px',
                            opacity: isProjectActive ? 1 : 0.5, 
                            cursor: isProjectActive ? 'pointer' : 'not-allowed', 
                            fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                   >
                        Novo Ciclo
                   </button>

                   <div style={{width: '1px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 5px'}}></div>

                   <div ref={wrapperRef} className="search-wrapper" style={{width: '220px'}}>
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setShowSuggestions(true)}
                            style={{
                                width: '100%',
                                padding: '8px 30px 8px 12px', 
                                borderRadius: '6px', 
                                border: '1px solid #cbd5e1', 
                                fontSize: '0.85rem',
                                height: '34px',
                                boxSizing: 'border-box',
                                backgroundColor: '#fff'
                            }}
                        />
                        <span style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: '0.85rem'}}>🔍</span>

                        {showSuggestions && opcoesParaMostrar.length > 0 && (
                            <ul className="custom-dropdown">
                                {opcoesParaMostrar.map(c => (
                                    <li key={c.id} onClick={() => { setSearchTerm(c.nome); setShowSuggestions(false); }}>
                                        <span>
                                            {truncate(c.nome, 20)}
                                            <span style={{fontSize:'0.75rem', color:'#9ca3af', marginLeft:'8px'}}>
                                                ({c.status?.replace('_', ' ')})
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                   </div>
               </div>
           </div>

           {loading ? <div style={{padding:'20px', textAlign:'center', color:'#64748b'}}>Carregando dados...</div> : (
             <div className="table-wrap">
               {ciclos.length === 0 ? (
                   <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #e2e8f0'}}>
                       <p style={{marginBottom: '10px'}}>Nenhum ciclo encontrado para este projeto.</p>
                       {isProjectActive && <button onClick={handleNew} className="btn primary small">Criar o primeiro ciclo</button>}
                   </div>
               ) : (
                 <table>
                   <thead>
                       <tr>
                           <th style={{width: '35%'}}>Nome & Descrição</th>
                           <th style={{width: '20%'}}>Período</th>
                           <th style={{width: '15%'}}>Status</th>
                           <th style={{width: '20%'}}>Progresso</th>
                           <th style={{width: '10%', textAlign: 'right'}}>Ações</th>
                       </tr>
                   </thead>
                   <tbody>
                     {filteredCiclos.length === 0 ? (
                       <tr><td colSpan="5" style={{textAlign:'center', padding:'20px', color: '#64748b'}}>Nenhum resultado para "{searchTerm}"</td></tr>
                     ) : (
                        filteredCiclos.map(c => (
                           <tr key={c.id} className="selectable" onClick={() => handleEdit(c)}>
                               <td>
                                   <div style={{fontWeight:600, color:'#334155', marginBottom:'2px'}}>{truncate(c.nome, 35)}</div>
                                   <div style={{fontSize:'0.75rem', color:'#94a3b8'}}>{truncate(c.descricao, 50) || 'Sem descrição'}</div>
                               </td>
                               <td style={{whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#475569'}}>
                                   {formatDateTable(c.data_inicio)} <span style={{color:'#cbd5e1', margin:'0 4px'}}>→</span> {formatDateTable(c.data_fim)}
                               </td>
                               <td>
                                   <span className="badge" style={{
                                       backgroundColor: getStatusColor(c.status),
                                       fontSize: '0.7rem',
                                       fontWeight: 600,
                                       padding: '3px 8px',
                                       borderRadius: '12px'
                                   }}>
                                       {c.status.replace('_', ' ').toUpperCase()}
                                   </span>
                               </td>
                               <td>
                                   {renderProgress(c.testes_concluidos, c.total_testes)}
                               </td>
                               <td style={{textAlign: 'right'}}>
                                   <button 
                                       onClick={(e) => { e.stopPropagation(); setCicloToDelete(c); setIsDeleteModalOpen(true); }} 
                                       className="btn danger small" 
                                       style={{padding: '6px 10px', lineHeight: 1}}
                                       title="Excluir Ciclo"
                                   >
                                       🗑️
                                   </button>
                               </td>
                           </tr>
                       ))
                     )}
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
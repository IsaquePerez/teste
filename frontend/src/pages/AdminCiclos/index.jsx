import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

export function AdminCiclos() {

  const [ciclos, setCiclos] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [selectedProjeto, setSelectedProjeto] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'planejado',
    projeto_id: ''
  });

  // Helpers de Data
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getNextDayString = (dateString) => {
    if (!dateString) return getTodayString();
    const date = new Date(dateString + 'T00:00:00'); 
    date.setDate(date.getDate() + 1);
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const opcoesParaMostrar = searchTerm === '' 
    ? [...ciclos].sort((a, b) => b.id - a.id).slice(0, 5) 
    : ciclos.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 8);

  const filteredCiclos = ciclos.filter(c => 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    const loadProjetos = async () => {
      try {
        const data = await api.get("/projetos");
        setProjetos(data || []);

        const ativos = (data || []).filter(p => p.status === 'ativo');
        if (ativos.length > 0) {
          setSelectedProjeto(ativos[0].id);
        }
      } catch (error) {
        toast.error("Erro ao carregar projetos.");
      }
    };
    loadProjetos();
  }, []);

  useEffect(() => {
    if (selectedProjeto) {
      loadCiclos(selectedProjeto);
    }
  }, [selectedProjeto]);

  const loadCiclos = async (projId) => {
    setLoading(true);
    try {
      const data = await api.get(`/testes/projetos/${projId}/ciclos`);
      setCiclos(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Erro ao carregar ciclos.");
      setCiclos([]);
    } finally {
      setLoading(false);
    }
  };

  const currentProject = projetos.find(p => p.id == selectedProjeto);
  const isProjectActive = currentProject?.status === 'ativo';

  const handleReset = () => {
    setForm({ 
      nome: '', 
      descricao: '', 
      data_inicio: '', 
      data_fim: '', 
      status: 'planejado', 
      projeto_id: selectedProjeto || ''
    });
    setEditingId(null);
    setView('list');
  };

  const handleNew = () => {
    if (!isProjectActive) return toast.warning(`Projeto ${currentProject?.status?.toUpperCase() || 'Inativo'}. Criação bloqueada.`);
    handleReset();
    setView('form');
  };

  const handleEdit = (item) => {
    setForm({
      nome: item.nome,
      descricao: item.descricao || '',
      data_inicio: item.data_inicio ? item.data_inicio.split('T')[0] : '',
      data_fim: item.data_fim ? item.data_fim.split('T')[0] : '',
      status: item.status,
      projeto_id: item.projeto_id || selectedProjeto
    });
    setEditingId(item.id);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.nome.trim()) return toast.warning("Nome do ciclo é obrigatório.");
    if (!form.projeto_id) return toast.warning("Selecione um projeto.");
    if (!form.data_inicio || !form.data_fim) return toast.warning("Datas de início e fim são obrigatórias.");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [anoIni, mesIni, diaIni] = form.data_inicio.split('-').map(Number);
    const startDate = new Date(anoIni, mesIni - 1, diaIni);

    const [anoFim, mesFim, diaFim] = form.data_fim.split('-').map(Number);
    const endDate = new Date(anoFim, mesFim - 1, diaFim);

    if (!editingId && startDate < today) {
        return toast.warning("A data de início não pode ser anterior a hoje.");
    }

    if (endDate <= startDate) {
        return toast.warning("A data final deve ser pelo menos um dia após a data de início.");
    }

    const payload = { 
        ...form,
        projeto_id: parseInt(form.projeto_id)
    };
    
    try {
      if (editingId) {
        await api.put(`/testes/ciclos/${editingId}`, payload);
        toast.success("Ciclo atualizado!");
      } else {
        await api.post(`/testes/projetos/${form.projeto_id}/ciclos`, payload);
        toast.success("Ciclo criado!");
      }
      handleReset();

      if (selectedProjeto == form.projeto_id) {
          loadCiclos(selectedProjeto);
      } else {
          setSelectedProjeto(form.projeto_id);
      }
    } catch (error) {
      console.error("Erro ao salvar ciclo:", error);
      const msg = error.response?.data?.detail || "Erro ao salvar ciclo.";
      const errorMsg = Array.isArray(msg) ? `${msg[0].loc[1]}: ${msg[0].msg}` : msg;
      toast.error(errorMsg);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/testes/ciclos/${itemToDelete.id}`);
      toast.success("Ciclo excluído.");
      loadCiclos(selectedProjeto);
    } catch (e) {
      toast.error("Erro ao excluir.");
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const getProjetoName = (id) => projetos.find(p => p.id === id)?.nome || '-';
  const truncate = (str, n = 30) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Ciclo?"
        message={`Deseja excluir "${itemToDelete?.nome}"?`}
        isDanger={true}
      />

      {view === 'form' && (
        <div style={{maxWidth: '100%', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            <section className="card form-section">
              <div className="form-header">
                 <h3 className="form-title">{editingId ? 'Editar Ciclo' : 'Novo Ciclo'}</h3>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div className="form-grid">
                      <div>
                        <label className="input-label">Projeto Pai <span className="required-asterisk">*</span></label>
                        <select 
                            value={form.projeto_id} onChange={e => setForm({...form, projeto_id: e.target.value})}
                            className="form-control bg-gray"
                            disabled={!!editingId} 
                        >
                           <option value="">Selecione um projeto...</option>
                           {projetos.filter(p => p.status === 'ativo').map(p => (
                               <option key={p.id} value={p.id}>{p.nome}</option>
                           ))}
                        </select>
                      </div>
                      <div>
                        <label className="input-label">Nome do Ciclo <span className="required-asterisk">*</span></label>
                        <input 
                           value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} 
                           className="form-control" placeholder="Ex: Sprint 24"
                        />
                      </div>
                  </div>

                  <div>
                    <label className="input-label">Descrição</label>
                    <textarea 
                        rows={2}
                        value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} 
                        className="form-control" 
                    />
                  </div>
                  
                  <div className="form-grid" style={{gridTemplateColumns: '1fr 1fr 1fr'}}>
                      
                      <div>
                        <label className="input-label">Data Início <span className="required-asterisk">*</span></label>
                        <input 
                            type="date" 
                            value={form.data_inicio} 
                            min={!editingId ? getTodayString() : undefined}
                            disabled={!!editingId}
                            onChange={e => {
                                const novaData = e.target.value;
                                setForm(prev => ({
                                    ...prev, 
                                    data_inicio: novaData,
                                    data_fim: prev.data_fim && prev.data_fim <= novaData ? '' : prev.data_fim
                                }))
                            }} 
                            className={`form-control ${!!editingId ? 'bg-gray' : ''}`}
                        />
                      </div>

                      <div>
                        <label className="input-label">Data Fim <span className="required-asterisk">*</span></label>
                        <input 
                            type="date" 
                            value={form.data_fim} 
                            min={getNextDayString(form.data_inicio)}
                            disabled={!form.data_inicio} 
                            onChange={e => setForm({...form, data_fim: e.target.value})} 
                            className="form-control" 
                        />
                      </div>

                      <div>
                        <label className="input-label">Status</label>
                        <select 
                            value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                            className="form-control bg-gray"
                        >
                           <option value="planejado">Planejado</option>
                           <option value="em_execucao">Em Execução</option>
                           <option value="concluido">Concluído</option>
                           <option value="pausado">Pausado</option>
                           <option value="cancelado">Cancelado</option>
                        </select>
                      </div>
                  </div>
              </div>

              <div className="form-actions">
                  <button type="button" onClick={handleReset} className="btn">Cancelar</button>
                  <button type="submit" className="btn primary">Salvar Ciclo</button>
              </div>
            </section>
          </form>
        </div>
      )}

      {view === 'list' && (
        <section className="card" style={{marginTop: 0}}>
           
           <div className="toolbar">
               <h3 className="page-title">Ciclos de Teste</h3>
               <div className="toolbar-actions">

                   <div className="filter-group">
                        <span className="filter-label">PROJETO:</span>
                        <select 
                            value={selectedProjeto} 
                            onChange={e => setSelectedProjeto(e.target.value)}
                            className="select-filter"
                        >
                            {projetos.filter(p => p.status === 'ativo').map(p => (
                                <option key={p.id} value={p.id}>{truncate(p.nome, 25)}</option>
                            ))}
                        </select>
                   </div>

                   <button 
                        onClick={handleNew} className="btn primary btn-new" disabled={!isProjectActive} 
                        style={{
                            opacity: isProjectActive ? 1 : 0.5, 
                            cursor: isProjectActive ? 'pointer' : 'not-allowed'
                        }}
                   >
                        Novo Ciclo
                   </button>
                   
                   <div className="separator"></div>

                   <div ref={wrapperRef} className="search-wrapper">
                        <input 
                            type="text" placeholder="Buscar..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowSuggestions(true)}
                            className="search-input"
                        />
                        <span className="search-icon">🔍</span>

                        {showSuggestions && opcoesParaMostrar.length > 0 && (
                            <ul className="custom-dropdown">
                                {opcoesParaMostrar.map(c => (
                                    <li key={c.id} onClick={() => { setSearchTerm(c.nome); setShowSuggestions(false); }}>
                                        <span>
                                            {truncate(c.nome, 20)}
                                            <span style={{fontSize:'0.75rem', color:'#9ca3af', marginLeft:'8px'}}>({c.status})</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                   </div>
               </div>
           </div>

           {loading ? <div className="loading-text">Carregando dados...</div> : (
             <div className="table-wrap">
               {ciclos.length === 0 ? (
                 <div className="empty-container">
                    <p style={{marginBottom: '10px'}}>Nenhum ciclo encontrado.</p>
                    {isProjectActive && <button onClick={handleNew} className="btn primary small">Criar o primeiro</button>}
                 </div>
               ) : (
                 <table>
                   <thead>
                     <tr>
                       <th style={{width: '60px'}}>ID</th>
                       <th>Ciclo</th>
                       <th>Projeto</th>
                       <th style={{textAlign: 'center'}}>Período</th>
                       <th style={{textAlign: 'center'}}>Status</th>
                       <th style={{textAlign: 'right'}}>Ações</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredCiclos.length === 0 ? (
                       <tr><td colSpan="6" style={{textAlign:'center', padding:'20px', color: '#64748b'}}>Sem resultados para "{searchTerm}"</td></tr>
                     ) : (
                        filteredCiclos.map(item => (
                           <tr key={item.id} className="selectable" onClick={() => handleEdit(item)}>
                               <td className="cell-id">#{item.id}</td>
                               <td>
                                   <div className="cell-name">{item.nome}</div>
                                   <div style={{fontSize:'0.75rem', color:'#94a3b8', marginTop:'2px'}}>{item.descricao}</div>
                               </td>
                               <td style={{color:'#64748b'}}>{getProjetoName(item.projeto_id)}</td>
                               <td style={{textAlign: 'center', fontSize: '0.85rem', color:'#64748b'}}>
                                   {formatDate(item.data_inicio)} <span style={{margin:'0 5px'}}>à</span> {formatDate(item.data_fim)}
                               </td>
                               <td className="cell-status">
                                   <span className={`status-badge ${item.status}`}>
                                       {item.status.replace('_', ' ').toUpperCase()}
                                   </span>
                               </td>
                               <td className="cell-actions">
                                   <button 
                                       onClick={(e) => { e.stopPropagation(); setItemToDelete(item); setIsDeleteModalOpen(true); }} 
                                       className="btn danger small btn-action-icon"
                                       title="Excluir"
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
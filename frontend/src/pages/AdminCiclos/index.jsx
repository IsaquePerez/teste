import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

// --- COMPONENTE REUTILIZÁVEL ---
const SearchableSelect = ({ options, value, onChange, placeholder, disabled, labelKey = 'nome' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const truncate = (str, n = 20) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  // Sincroniza o input com o valor selecionado
  useEffect(() => {
    const selectedOption = options.find(opt => String(opt.id) === String(value));
    if (selectedOption) {
      if(!isOpen) setSearchTerm(selectedOption[labelKey]);
    } else if (!value) {
      setSearchTerm('');
    }
  }, [value, options, isOpen, labelKey]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        const selectedOption = options.find(opt => String(opt.id) === String(value));
        setSearchTerm(selectedOption ? selectedOption[labelKey] : '');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value, options, labelKey]);

  const filteredOptions = searchTerm === '' 
    ? options 
    : options.filter(opt => opt[labelKey].toLowerCase().includes(searchTerm.toLowerCase()));

  // Limite de 5 itens
  const displayOptions = filteredOptions.slice(0, 5);

  const handleSelect = (option) => {
    onChange(option.id);
    setSearchTerm(option[labelKey]);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="search-wrapper" style={{ width: '100%', position: 'relative' }}>
      <input
        type="text"
        className={`form-control ${disabled ? 'bg-gray' : ''}`}
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); if (e.target.value === '') onChange(''); }}
        onFocus={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        style={{ cursor: disabled ? 'not-allowed' : 'text', paddingRight: '30px' }}
      />
      <span className="search-icon" style={{ cursor: disabled ? 'not-allowed' : 'pointer', right: '10px', position: 'absolute', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }} onClick={() => !disabled && setIsOpen(!isOpen)}>▼</span>
      {isOpen && !disabled && (
        <ul className="custom-dropdown" style={{ width: '100%', top: '100%', zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
          {displayOptions.length === 0 ? <li style={{ color: '#999', cursor: 'default', padding: '10px' }}>Sem resultados</li> : displayOptions.map(opt => (
            <li key={opt.id} onClick={() => handleSelect(opt)} title={opt[labelKey]}>{truncate(opt[labelKey], 20)}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export function AdminCiclos() {
  const [ciclos, setCiclos] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [selectedProjeto, setSelectedProjeto] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const { success, error, warning } = useSnackbar();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  // --- FILTROS GLOBAIS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  // --- FILTRO HEADER: STATUS ---
  const [statusSearchText, setStatusSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isStatusSearchOpen, setIsStatusSearchOpen] = useState(false);
  const statusHeaderRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [form, setForm] = useState({
    nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'planejado', projeto_id: ''
  });

  // Helpers
  const truncate = (str, n = 30) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const getNextDayString = (d) => { if(!d) return getTodayString(); const x = new Date(d); x.setDate(x.getDate()+1); return x.toISOString().split('T')[0]; };
  const getProjetoName = (id) => projetos.find(p => p.id === id)?.nome || '-';
  const formatDate = (d) => { if(!d) return '-'; const p = d.toString().split('T')[0].split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowSuggestions(false);
      if (statusHeaderRef.current && !statusHeaderRef.current.contains(event.target)) {
        if (!selectedStatus) { setIsStatusSearchOpen(false); setStatusSearchText(''); }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedStatus]);

  useEffect(() => {
    const loadProjetos = async () => {
      try {
        const data = await api.get("/projetos");
        setProjetos(data || []);
        const ativos = (data || []).filter(p => p.status === 'ativo');
        if (ativos.length > 0) setSelectedProjeto(ativos[0].id);
      } catch (err) { error("Erro ao carregar projetos."); }
    };
    loadProjetos();
  }, []);

  useEffect(() => {
    if (selectedProjeto) loadCiclos(selectedProjeto);
    else setCiclos([]); 
  }, [selectedProjeto]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedStatus]);

  const loadCiclos = async (projId) => {
    setLoading(true);
    try {
      const data = await api.get(`/testes/projetos/${projId}/ciclos`);
      setCiclos(Array.isArray(data) ? data : []);
    } catch (err) { error("Erro ao carregar ciclos."); setCiclos([]); } 
    finally { setLoading(false); }
  };

  // --- FILTRAGEM ---
  const filteredCiclos = ciclos.filter(c => {
      if (selectedStatus && c.status !== selectedStatus) return false;
      if (searchTerm && !c.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
  });

  // Sugestões Globais (mostra 5 itens da lista já filtrada)
  const globalSuggestions = searchTerm === '' 
    ? filteredCiclos.slice(0, 5) 
    : filteredCiclos.slice(0, 5);
  
  const statusOptions = [
      {value:'planejado', label:'Planejado'}, {value:'em_execucao', label:'Em Execução'}, 
      {value:'concluido', label:'Concluído'}, {value:'pausado', label:'Pausado'}, {value:'cancelado', label:'Cancelado'}
  ];
  const filteredStatusHeader = statusOptions.filter(opt => opt.label.toLowerCase().includes(statusSearchText.toLowerCase()));

  // --- PAGINAÇÃO ---
  const totalPages = Math.ceil(filteredCiclos.length / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  const currentCiclos = filteredCiclos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginate = (n) => setCurrentPage(n);

  // --- ACTIONS ---
  const currentProject = projetos.find(p => p.id == selectedProjeto);
  const isProjectActive = currentProject?.status === 'ativo';

  const handleReset = () => {
    setForm({ nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'planejado', projeto_id: selectedProjeto || '' });
    setEditingId(null); setView('list');
  };

  const handleNew = () => {
    if (!isProjectActive) return warning(`Projeto Inativo.`);
    handleReset(); setView('form');
  };

  const handleEdit = (item) => {
    setForm({
      nome: item.nome, descricao: item.descricao || '', 
      data_inicio: item.data_inicio ? item.data_inicio.split('T')[0] : '',
      data_fim: item.data_fim ? item.data_fim.split('T')[0] : '',
      status: item.status, projeto_id: item.projeto_id || selectedProjeto
    });
    setEditingId(item.id); setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return warning("Nome obrigatório.");
    if (!form.projeto_id) return warning("Selecione um projeto.");
    if (!form.data_inicio || !form.data_fim) return warning("Datas obrigatórias.");

    const payload = { ...form, projeto_id: parseInt(form.projeto_id) };
    try {
      if (editingId) { await api.put(`/testes/ciclos/${editingId}`, payload); success("Atualizado!"); } 
      else { await api.post(`/testes/projetos/${form.projeto_id}/ciclos`, payload); success("Criado!"); }
      handleReset();
      if (selectedProjeto == form.projeto_id) loadCiclos(selectedProjeto); else setSelectedProjeto(form.projeto_id);
    } catch (err) { error("Erro ao salvar."); }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try { await api.delete(`/testes/ciclos/${itemToDelete.id}`); success("Excluído."); loadCiclos(selectedProjeto); } 
    catch (e) { error("Erro ao excluir."); } 
    finally { setIsDeleteModalOpen(false); setItemToDelete(null); }
  };

  return (
    <main className="container">
      <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDelete} title="Excluir?" message={`Excluir "${itemToDelete?.nome}"?`} isDanger={true} />

      {view === 'form' && (
        <div style={{maxWidth: '100%', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            <section className="card form-section">
              <div className="form-header"><h3 className="form-title">{editingId ? 'Editar Ciclo' : 'Novo Ciclo'}</h3></div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div className="form-grid">
                      <div>
                        <label className="input-label">Projeto Pai *</label>
                        {/* Dropdown no Formulário */}
                        <SearchableSelect 
                            options={projetos.filter(p => p.status === 'ativo')}
                            value={form.projeto_id}
                            onChange={(val) => setForm({ ...form, projeto_id: val })}
                            placeholder="Selecione o projeto..."
                            disabled={!!editingId}
                        />
                      </div>
                      <div><label className="input-label">Nome *</label><input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="form-control" placeholder="Ex: Sprint 24" /></div>
                  </div>
                  <div><label className="input-label">Descrição</label><textarea rows={2} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="form-control" /></div>
                  <div className="form-grid" style={{gridTemplateColumns: '1fr 1fr 1fr'}}>
                      <div><label className="input-label">Início *</label><input type="date" value={form.data_inicio} min={!editingId ? getTodayString() : undefined} disabled={!!editingId} onChange={e => setForm({...form, data_inicio: e.target.value})} className={`form-control ${!!editingId ? 'bg-gray' : ''}`} /></div>
                      <div><label className="input-label">Fim *</label><input type="date" value={form.data_fim} min={getNextDayString(form.data_inicio)} disabled={!form.data_inicio} onChange={e => setForm({...form, data_fim: e.target.value})} className="form-control" /></div>
                      <div>
                        <label className="input-label">Status</label>
                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="form-control bg-gray">
                           {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                  </div>
              </div>
              <div className="form-actions">
                  <button type="button" onClick={handleReset} className="btn">Cancelar</button>
                  <button type="submit" className="btn primary">Salvar</button>
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
                        {/* --- CORREÇÃO AQUI: DROPWOWN TRANSFORMADO EM SEARCHABLE SELECT (Lista) --- */}
                        <div style={{width: '200px'}}>
                            <SearchableSelect 
                                options={projetos.filter(p => p.status === 'ativo')}
                                value={selectedProjeto}
                                onChange={(val) => setSelectedProjeto(val)}
                                placeholder="Filtrar Projeto..."
                            />
                        </div>
                        {/* ------------------------------------------------------------------------ */}
                   </div>
                   <button onClick={handleNew} className="btn primary btn-new" disabled={!isProjectActive} style={{opacity: isProjectActive ? 1 : 0.5, cursor: isProjectActive ? 'pointer' : 'not-allowed'}}>Novo Ciclo</button>
                   <div className="separator"></div>
                   <div ref={wrapperRef} className="search-wrapper">
                       <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowSuggestions(true)} className="search-input" />
                       <span className="search-icon">🔍</span>
                       {showSuggestions && (
                           <ul className="custom-dropdown">
                               {globalSuggestions.length === 0 ? <li style={{color:'#999'}}>Nenhum ciclo encontrado.</li> : globalSuggestions.map(c => (
                                   <li key={c.id} onClick={() => { setSearchTerm(c.nome); setShowSuggestions(false); }}>
                                       <div style={{display:'flex',justifyContent:'space-between'}}><span>{truncate(c.nome, 20)}</span><span style={{fontSize:'0.75rem',color:'#9ca3af',fontStyle:'italic'}}></span></div>
                                   </li>
                               ))}
                           </ul>
                       )}
                   </div>
               </div>
           </div>

           {loading ? <div className="loading-text">Carregando...</div> : (
             <div className="table-wrap">
               <div className="content-area">
                   <table>
                       <thead>
                         <tr>
                           <th style={{width: '60px'}}>ID</th>
                           <th>Ciclo</th>
                           <th>Projeto</th>
                           <th style={{textAlign: 'center'}}>Período</th>
                           
                           {/* HEADER STATUS INTELIGENTE */}
                           <th style={{textAlign: 'center', width: '140px', verticalAlign: 'middle'}}>
                                <div className="th-filter-container" ref={statusHeaderRef} style={{justifyContent: 'center'}}>
                                    {isStatusSearchOpen || selectedStatus ? (
                                        <div style={{position: 'relative', width: '100%'}}>
                                            <input 
                                                autoFocus type="text" className={`th-search-input ${selectedStatus ? 'active' : ''}`} placeholder="Status..."
                                                value={selectedStatus && statusSearchText === '' ? statusOptions.find(o=>o.value===selectedStatus)?.label : statusSearchText}
                                                onChange={(e) => { setStatusSearchText(e.target.value); if(selectedStatus) setSelectedStatus(''); }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button className="btn-clear-filter" onClick={(e) => {
                                                e.stopPropagation(); if(selectedStatus){setSelectedStatus('');setStatusSearchText('')}else{setIsStatusSearchOpen(false);setStatusSearchText('')}
                                            }}>✕</button>
                                            {(!selectedStatus || statusSearchText) && (
                                                <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0, textAlign: 'left'}}>
                                                    <li onClick={() => { setSelectedStatus(''); setStatusSearchText(''); setIsStatusSearchOpen(false); }}><span style={{color:'#3b82f6', fontWeight:'bold'}}>Todos</span></li>
                                                    {filteredStatusHeader.map(opt => (
                                                        <li key={opt.value} onClick={() => { setSelectedStatus(opt.value); setStatusSearchText(''); setIsStatusSearchOpen(true); }}>{opt.label}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="th-label" onClick={() => setIsStatusSearchOpen(true)} title="Filtrar Status">STATUS <span className="filter-icon">▼</span></div>
                                    )}
                                </div>
                           </th>

                           <th style={{textAlign: 'right'}}>Ações</th>
                         </tr>
                       </thead>
                       <tbody>
                         {filteredCiclos.length === 0 ? (
                            <tr><td colSpan="6" className="no-results" style={{textAlign: 'center'}}>Nenhum ciclo encontrado.</td></tr>
                         ) : (
                           currentCiclos.map(item => (
                            <tr key={item.id} className="selectable" onClick={() => handleEdit(item)}>
                                <td className="cell-id">#{item.id}</td>
                                <td><div className="cell-name">{truncate(item.nome, 20)}</div><div style={{fontSize:'0.75rem', color:'#94a3b8'}}>{truncate(item.descricao, 30)}</div></td>
                                <td style={{color:'#64748b'}}>{truncate(getProjetoName(item.projeto_id), 20)}</td>
                                <td style={{textAlign: 'center', fontSize: '0.85rem', color:'#64748b'}}>{formatDate(item.data_inicio)} - {formatDate(item.data_fim)}</td>
                                <td className="cell-status">
                                    <span className={`status-badge ${item.status}`}>{item.status.replace('_', ' ').toUpperCase()}</span>
                                </td>
                                <td className="cell-actions">
                                    <button onClick={(e) => { e.stopPropagation(); setItemToDelete(item); setIsDeleteModalOpen(true); }} className="btn danger small btn-action-icon">🗑️</button>
                                </td>
                            </tr>
                           ))
                         )}
                       </tbody>
                     </table>
               </div>
               {filteredCiclos.length > 0 && (
                   <div className="pagination-container">
                        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn nav-btn">‹</button>
                        {Array.from({length: totalPages}, (_, i) => (
                            <button key={i+1} onClick={() => paginate(i+1)} className={`pagination-btn ${currentPage === i+1 ? 'active' : ''}`}>{i+1}</button>
                        )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                        <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-btn nav-btn">›</button>
                   </div>
               )}
             </div>
           )}
        </section>
      )}
    </main>
  );
}
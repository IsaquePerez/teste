import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Trash } from '../../components/icons/Trash';
import { Search } from '../../components/icons/Search';
import './styles.css';

const SearchableSelect = ({ options, value, onChange, placeholder, disabled, labelKey = 'nome' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const truncate = (str, n = 35) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  useEffect(() => {
    const selectedOption = options.find(opt => String(opt.id) === String(value));
    if (selectedOption) {
      setSearchTerm(selectedOption[labelKey]);
    } else if (!value) {
      setSearchTerm('');
    }
  }, [value, options, labelKey]);

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

  const filteredOptions = options.filter(opt => 
    opt[labelKey].toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
          if (e.target.value === '') onChange('');
        }}
        onFocus={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        style={{ cursor: disabled ? 'not-allowed' : 'text', paddingRight: '30px' }}
      />
      <span 
        className="search-icon" 
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', right: '10px', position: 'absolute', top: '50%', transform: 'translateY(-50%)' }} 
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        ▼
      </span>

      {isOpen && !disabled && (
        <ul className="custom-dropdown" style={{ width: '100%', top: '100%', zIndex: 1000 }}>
          {displayOptions.length === 0 ? (
            <li style={{ color: '#999', cursor: 'default', padding: '10px' }}>Sem resultados</li>
          ) : (
            displayOptions.map(opt => (
              <li key={opt.id} onClick={() => handleSelect(opt)} title={opt[labelKey]}>
                {truncate(opt[labelKey], 35)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export function AdminProjetos() {
  const [projetos, setProjetos] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const { success, error, warning } = useSnackbar();
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [form, setForm] = useState({
    nome: '', descricao: '', status: 'ativo',
    sistema_id: '', modulo_id: '', responsavel_id: '' 
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const [respSearchText, setRespSearchText] = useState(''); 
  const [selectedRespId, setSelectedRespId] = useState(''); 
  const [isRespSearchOpen, setIsRespSearchOpen] = useState(false);
  const respHeaderRef = useRef(null);

  const [statusSearchText, setStatusSearchText] = useState(''); 
  const [selectedStatus, setSelectedStatus] = useState(''); 
  const [isStatusSearchOpen, setIsStatusSearchOpen] = useState(false);
  const statusHeaderRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const truncate = (str, n = 25) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      
      if (respHeaderRef.current && !respHeaderRef.current.contains(event.target)) {
        if (!selectedRespId) { setIsRespSearchOpen(false); setRespSearchText(''); }
      }

      if (statusHeaderRef.current && !statusHeaderRef.current.contains(event.target)) {
        if (!selectedStatus) { setIsStatusSearchOpen(false); setStatusSearchText(''); }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedRespId, selectedStatus]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedRespId, selectedStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projData, sisData, modData, userData] = await Promise.all([
        api.get("/projetos"), api.get("/sistemas/"), api.get("/modulos/"), api.get("/usuarios/") 
      ]);
      setProjetos(Array.isArray(projData) ? projData : []);
      setSistemas(Array.isArray(sisData) ? sisData : []);
      setModulos(Array.isArray(modData) ? modData : []);
      setUsuarios(Array.isArray(userData) ? userData : []);
    } catch (err) { error("Erro ao carregar dados."); } 
    finally { setLoading(false); }
  };

  const usersFormatted = usuarios.map(u => ({ ...u, labelCompleto: `${u.nome} ${u.username ? `(@${u.username})` : ''}` }));
  const getRespName = (id) => { const u = usersFormatted.find(user => user.id === id); return u ? u.nome : '-'; };

  // --- FILTRAGEM PRINCIPAL ---
  const filteredData = projetos.filter(p => {
      if (selectedRespId && p.responsavel_id !== parseInt(selectedRespId)) return false;
      
      if (selectedStatus && p.status !== selectedStatus) return false;
      
      if (searchTerm && !p.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      return true;
  });

  const filteredRespForHeader = usersFormatted.filter(u => u.labelCompleto.toLowerCase().includes(respSearchText.toLowerCase())).slice(0, 5);

  const statusOptions = [
      { label: 'Ativo', value: 'ativo' }, 
      { label: 'Pausado', value: 'pausado' }, 
      { label: 'Finalizado', value: 'finalizado' }
  ];
  const filteredStatusForHeader = statusOptions.filter(s => s.label.toLowerCase().includes(statusSearchText.toLowerCase()));

  const opcoesParaMostrar = searchTerm === '' ? [...projetos].sort((a, b) => b.id - a.id).slice(0, 5) : filteredData.slice(0, 5);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginate = (n) => setCurrentPage(n);

  const handleReset = () => {
    setForm({ nome: '', descricao: '', status: 'ativo', sistema_id: '', modulo_id: '', responsavel_id: '' });
    setEditingId(null);
    setView('list');
  };

  const handleEdit = (item) => {
    setForm({
      nome: item.nome, descricao: item.descricao || '', status: item.status,
      sistema_id: item.sistema_id || '', modulo_id: item.modulo_id || '', responsavel_id: item.responsavel_id || ''
    });
    setEditingId(item.id);
    setView('form');
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return warning("Nome é obrigatório.");
    if (!form.sistema_id) return warning("Selecione um Sistema.");
    if (!form.modulo_id) return warning("Selecione um Módulo.");
    if (!form.responsavel_id) return warning("Selecione um Responsável.");

    const payload = { ...form, sistema_id: parseInt(form.sistema_id), modulo_id: parseInt(form.modulo_id), responsavel_id: parseInt(form.responsavel_id) };

    try {
      if (editingId) { await api.put(`/projetos/${editingId}`, payload); success("Projeto atualizado!"); } 
      else { await api.post("/projetos", payload); success("Projeto criado!"); }
      handleReset(); loadData();
    } catch (err) { error("Erro ao salvar projeto."); }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try { await api.delete(`/projetos/${itemToDelete.id}`); success("Projeto excluído."); loadData(); } 
    catch (e) { error("Erro ao excluir."); } 
    finally { setIsDeleteModalOpen(false); setItemToDelete(null); }
  };

  const modulosFiltrados = form.sistema_id ? modulos.filter(m => m.sistema_id == form.sistema_id) : modulos;
  const admins = usersFormatted.filter(u => u.nivel_acesso_id === 1 && u.ativo);

  const isFormInvalid =  !String(form.sistema_id).trim() || !String(form.modulo_id).trim() || !String(form.responsavel_id).trim() || !form.nome.trim() || !form.descricao.trim();

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDelete}
        title="Excluir Projeto?" message={`Tem certeza que deseja excluir "${itemToDelete?.nome}"?`} isDanger={true}
      />

      {view === 'form' && (
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            <section className="card form-section">
              <div className="form-header"><h2 className="form-title">{editingId ? 'Editar Projeto' : 'Novo Projeto'}</h2></div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div><label className="input-label">Nome do Projeto</label><input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="form-control"/></div>
                  <div><label className="input-label">Descrição</label><textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="form-control" rows="3" /></div>
                  <div className="form-grid">
                      <div><label className="input-label"><b>Sistema</b></label><SearchableSelect options={sistemas} value={form.sistema_id} onChange={(val) => setForm({ ...form, sistema_id: val, modulo_id: '' })} placeholder="Selecione o sistema..." labelKey="nome" /></div>
                      <div><label className="input-label"><b>Módulo</b></label><SearchableSelect options={modulosFiltrados} value={form.modulo_id} onChange={(val) => setForm({ ...form, modulo_id: val })} placeholder={form.sistema_id ? "Selecione o módulo..." : "Selecione um sistema antes"} disabled={!form.sistema_id} labelKey="nome" /></div>
                  </div>
                  <div className="form-grid">
                      <div><label className="input-label"><b>Responsável</b></label><SearchableSelect options={admins} value={form.responsavel_id} onChange={(val) => setForm({ ...form, responsavel_id: val })} placeholder="Selecione o responsável..." labelKey="labelCompleto" /></div>
                      <div>
                        <label className="input-label"><b>Status</b></label>
                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="form-control bg-gray">
                            <option value="ativo">Ativo</option><option value="pausado">Pausado</option><option value="finalizado">Finalizado</option>
                        </select>
                      </div>
                  </div>
              </div>
              <div className="form-actions">
                  <button type="button" onClick={handleReset} className="btn">Cancelar</button>
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={isFormInvalid} 
                    title={isFormInvalid ? "Preencha todos os campos" : ""}
                  >
                    Salvar
                  </button>
              </div>
            </section>
          </form>
        </div>
      )}

      {view === 'list' && (
        <section className="card" style={{marginTop: 0}}>
           <div className="toolbar">
               <h3 className="page-title">Projetos</h3>
               <div className="toolbar-actions">
                   <button onClick={() => setView('form')} className="btn primary btn-new">Novo Projeto</button>
                   <div className="separator"></div>
                   <div ref={wrapperRef} className="search-wrapper">
                       <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowSuggestions(true)} className="search-input" />
                       <span className="search-icon"><Search /></span>
                       {showSuggestions && (
                           <ul className="custom-dropdown">
                               {opcoesParaMostrar.length === 0 ? <li style={{color:'#999'}}>Nenhum projeto encontrado.</li> : opcoesParaMostrar.map(p => (
                                   <li key={p.id} onClick={() => { setSearchTerm(p.nome); setShowSuggestions(false); }}>
                                       <div style={{display:'flex', justifyContent:'space-between', width:'100%'}}>
                                           <span>{truncate(p.nome, 20)}</span><span style={{fontSize:'0.75rem', color:'#9ca3af', fontStyle:'italic'}}></span>
                                       </div>
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
                           <th>Nome</th>
                           <th>Descrição</th>                           
                           <th style={{width: '220px', verticalAlign: 'middle'}}>
                                <div className="th-filter-container" ref={respHeaderRef}>
                                    {isRespSearchOpen || selectedRespId ? (
                                        <div style={{position: 'relative', width: '100%'}}>
                                            <input 
                                                autoFocus type="text" className={`th-search-input ${selectedRespId ? 'active' : ''}`}
                                                placeholder="Responsável..."
                                                value={selectedRespId && respSearchText === '' ? getRespName(parseInt(selectedRespId)) : respSearchText}
                                                onChange={(e) => { setRespSearchText(e.target.value); if(selectedRespId) setSelectedRespId(''); }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button className="btn-clear-filter" onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (selectedRespId) { setSelectedRespId(''); setRespSearchText(''); } 
                                                    else { setIsRespSearchOpen(false); setRespSearchText(''); }
                                                }}>✕</button>
                                            {(!selectedRespId || respSearchText) && (
                                                <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}>
                                                    <li onClick={() => { setSelectedRespId(''); setRespSearchText(''); setIsRespSearchOpen(false); }}>
                                                        <span style={{color: '#757575', fontWeight: 'bold'}}>Todos</span>
                                                    </li>
                                                    {filteredRespForHeader.map(u => (
                                                        <li key={u.id} onClick={() => { setSelectedRespId(u.id); setRespSearchText(''); setIsRespSearchOpen(true); }}>{truncate(u.labelCompleto, 20)}</li>
                                                    ))}
                                                    {filteredRespForHeader.length === 0 && <li style={{color:'#94a3b8'}}>Sem resultados</li>}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="th-label" onClick={() => setIsRespSearchOpen(true)} title="Filtrar Responsável">
                                            RESPONSÁVEL <span className="filter-icon">▼</span>
                                        </div>
                                    )}
                                </div>
                           </th>
                           <th style={{width: '140px', verticalAlign: 'middle', textAlign: 'center'}}>
                                <div className="th-filter-container" ref={statusHeaderRef} style={{justifyContent: 'center'}}>
                                    {isStatusSearchOpen || selectedStatus ? (
                                        <div style={{position: 'relative', width: '100%'}}>
                                            <input 
                                                autoFocus type="text" className={`th-search-input ${selectedStatus ? 'active' : ''}`}
                                                placeholder="Status..."
                                                value={selectedStatus && statusSearchText === '' ? selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1) : statusSearchText}
                                                onChange={(e) => { setStatusSearchText(e.target.value); if(selectedStatus) setSelectedStatus(''); }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button className="btn-clear-filter" onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (selectedStatus) { setSelectedStatus(''); setStatusSearchText(''); } 
                                                    else { setIsStatusSearchOpen(false); setStatusSearchText(''); }
                                                }}>✕</button>
                                            {(!selectedStatus || statusSearchText) && (
                                                <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0, textAlign: 'left'}}>
                                                    <li onClick={() => { setSelectedStatus(''); setStatusSearchText(''); setIsStatusSearchOpen(false); }}>
                                                        <span style={{color: '#7c7c7c', fontWeight: 'bold'}}>Todos</span>
                                                    </li>
                                                    {filteredStatusForHeader.map(opt => (
                                                        <li key={opt.value} onClick={() => { setSelectedStatus(opt.value); setStatusSearchText(''); setIsStatusSearchOpen(true); }}>{opt.label}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="th-label" onClick={() => setIsStatusSearchOpen(true)} title="Filtrar Status">
                                            STATUS <span className="filter-icon">▼</span>
                                        </div>
                                    )}
                                </div>
                           </th>
                           <th style={{textAlign: 'right'}}>Ações</th>
                         </tr>
                       </thead>
                       <tbody>
                         {filteredData.length === 0 ? (
                            <tr><td colSpan="6" className="no-results" style={{textAlign: 'center', padding: '20px'}}>Nenhum projeto encontrado com os filtros atuais.</td></tr>
                         ) : (
                             currentData.map(item => (
                                <tr key={item.id} className="selectable" onClick={() => handleEdit(item)}>
                                    <td className="cell-id">#{item.id}</td>
                                    <td className="cell-name">{truncate(item.nome, 15)}</td>
                                    <td className="text-secondary">{truncate(item.descricao, 30)}</td>
                                    <td style={{fontSize: '0.85rem'}}>
                                        {(() => {
                                            const resp = usersFormatted.find(u => u.id === item.responsavel_id);
                                            return resp ? (
                                                <div><span>{resp.nome}</span>{resp.username && <span style={{color:'#64748b', fontSize:'0.75rem', marginLeft:'6px'}}>@{resp.username}</span>}</div>
                                            ) : '-';
                                        })()}
                                    </td>
                                    <td className="cell-status"><span className={`status-badge ${item.status}`}>{item.status}</span></td>
                                    <td className="cell-actions">
                                        <button onClick={(e) => { e.stopPropagation(); setItemToDelete(item); setIsDeleteModalOpen(true); }} className="btn danger small btn-action-icon"><Trash /></button>
                                    </td>
                                </tr>
                             ))
                         )}
                       </tbody>
                     </table>
               </div>
               {filteredData.length > 0 && (
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
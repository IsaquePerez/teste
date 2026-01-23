import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Trash } from '../../components/icons/Trash';
import { Search } from '../../components/icons/Search';
import './styles.css';

// --- COMPONENTE REUTILIZÁVEL ---
const SearchableSelect = ({ options, value, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const truncate = (str, n = 20) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  useEffect(() => {
    const selectedOption = options.find(opt => String(opt.id) === String(value));
    if (selectedOption) {
      if (!isOpen) setSearchTerm(selectedOption.nome);
    } else if (!value) {
      setSearchTerm('');
    }
  }, [value, options, isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        const selectedOption = options.find(opt => String(opt.id) === String(value));
        setSearchTerm(selectedOption ? selectedOption.nome : '');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value, options]);

  const filteredOptions = searchTerm === '' 
    ? options 
    : options.filter(opt => opt.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  const displayOptions = filteredOptions.slice(0, 5);

  const handleSelect = (option) => {
    onChange(option.id);
    setSearchTerm(option.nome);
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
        onFocus={() => { if(!disabled) setIsOpen(true); }}
        disabled={disabled}
        style={{ cursor: disabled ? 'not-allowed' : 'text', paddingRight: '30px' }}
      />
      <span className="search-icon" style={{ cursor: disabled ? 'not-allowed' : 'pointer', right: '10px', position: 'absolute', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }} onClick={() => !disabled && setIsOpen(!isOpen)}>▼</span>

      {isOpen && !disabled && (
        <ul className="custom-dropdown" style={{ width: '100%', top: '100%', zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
          {displayOptions.length === 0 ? (
            <li style={{ color: '#999', cursor: 'default', padding: '10px' }}>Sem resultados</li>
          ) : (
            displayOptions.map(opt => (
              <li key={opt.id} onClick={() => handleSelect(opt)} title={opt.nome}>
                {truncate(opt.nome, 20)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export function AdminModulos() {
  const [modulos, setModulos] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  
  const [view, setView] = useState('list');
  const [form, setForm] = useState({ nome: '', descricao: '', sistema_id: '', ativo: true });
  const [editingId, setEditingId] = useState(null);
  
  const { success, error, warning } = useSnackbar();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [moduloToDelete, setModuloToDelete] = useState(null);
    
  const [searchTerm, setSearchTerm] = useState('');
  const [showGlobalSuggestions, setShowGlobalSuggestions] = useState(false);
  const globalSearchRef = useRef(null); 

  const [sistemaSearchText, setSistemaSearchText] = useState(''); 
  const [selectedSistemaId, setSelectedSistemaId] = useState(''); 
  const [isSistemaSearchOpen, setIsSistemaSearchOpen] = useState(false);
  const sistemaHeaderRef = useRef(null);

  const [statusSearchText, setStatusSearchText] = useState(''); 
  const [selectedStatus, setSelectedStatus] = useState(''); 
  const [isStatusSearchOpen, setIsStatusSearchOpen] = useState(false);
  const statusHeaderRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const truncate = (str, n = 25) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';
  const getSistemaName = (id) => sistemas.find(s => s.id === id)?.nome || '-';

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedSistemaId, selectedStatus]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (globalSearchRef.current && !globalSearchRef.current.contains(event.target)) {
        setShowGlobalSuggestions(false);
      }
      if (sistemaHeaderRef.current && !sistemaHeaderRef.current.contains(event.target)) {
        if (!selectedSistemaId) { setIsSistemaSearchOpen(false); setSistemaSearchText(''); }
      }
      if (statusHeaderRef.current && !statusHeaderRef.current.contains(event.target)) {
        if (!selectedStatus) { setIsStatusSearchOpen(false); setStatusSearchText(''); }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedSistemaId, selectedStatus]);

  const loadData = async () => {
    try {
        const [modsResponse, sisResponse] = await Promise.all([
            api.get("/modulos/"),
            api.get("/sistemas/")
        ]);
        setModulos(modsResponse.data || modsResponse || []);
        setSistemas(sisResponse.data || sisResponse || []);
    } catch (e) { error("Erro ao carregar dados."); }
  };

  const filteredModulos = modulos.filter(m => {
      if (selectedSistemaId && m.sistema_id !== parseInt(selectedSistemaId)) return false;
      if (selectedStatus !== '') {
          const statusBool = selectedStatus === 'true';
          if (m.ativo !== statusBool) return false;
      }
      if (searchTerm && !m.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
  });

  const globalSuggestions = searchTerm === '' 
    ? filteredModulos.slice(0, 5) 
    : filteredModulos.slice(0, 5);

  const filteredSistemasForHeader = sistemas.filter(s => s.nome.toLowerCase().includes(sistemaSearchText.toLowerCase())).slice(0, 5);
  const statusOptions = [{ label: 'Ativo', value: 'true' }, { label: 'Inativo', value: 'false' }];
  const filteredStatusForHeader = statusOptions.filter(opt => opt.label.toLowerCase().includes(statusSearchText.toLowerCase()));

  const handleNew = () => { handleCancel(); setView('form'); };
  const handleCancel = () => { setEditingId(null); setForm({nome:'', descricao:'', sistema_id:'', ativo: true}); setView('list'); };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sistema_id) return warning("Selecione o Sistema.");
    if (!form.nome.trim()) return warning("Preencha o nome.");

    try {
      const payload = { ...form, sistema_id: parseInt(form.sistema_id) };
      if (editingId) {
          await api.put(`/modulos/${editingId}`, payload);
          success("Atualizado!");
      } else {
          await api.post("/modulos/", payload);
          success("Cadastrado!");
      }
      handleCancel();
      loadData();
    } catch (err) { error("Erro ao salvar."); }
  };

  const handleSelectRow = (m) => {
      setForm({ nome: m.nome, descricao: m.descricao, sistema_id: m.sistema_id, ativo: m.ativo });
      setEditingId(m.id);
      setView('form');
  };

  const requestDelete = (m) => { setModuloToDelete(m); setIsDeleteModalOpen(true); };
  const confirmDelete = async () => {
      if(!moduloToDelete) return;
      try { await api.delete(`/modulos/${moduloToDelete.id}`); success("Excluído."); setModulos(prev => prev.filter(m => m.id !== moduloToDelete.id)); }
      catch(e) { error("Erro ao excluir."); }
      finally { setModuloToDelete(null); setIsDeleteModalOpen(false); }
  };

  const totalPages = Math.ceil(filteredModulos.length / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  const currentModulos = filteredModulos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginate = (n) => setCurrentPage(n);

  const isFormInvalid =  !String(form.sistema_id).trim() || !form.nome.trim() || !form.descricao.trim();

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete}
        title="Excluir Módulo?" message={`Tem certeza que deseja excluir "${moduloToDelete?.nome}"?`} isDanger={true}
      />

      {view === 'form' ? (
        <div style={{maxWidth: '800px', margin: '0 auto'}}> 
          <section className="card form-card">
            <h2 className="section-title">{editingId ? 'Editar Módulo' : 'Novo Módulo'}</h2>
            <form onSubmit={handleSubmit}>
               <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr auto' }}> 
                 <div style={{gridColumn: 'span 1'}}>
                    <label className="input-label"><b>Sistema</b></label>
                    <SearchableSelect 
                        options={sistemas.filter(s => s.ativo)} 
                        value={form.sistema_id}
                        onChange={(val) => setForm({ ...form, sistema_id: val })}
                        placeholder="Selecione o sistema..."
                    />
                 </div>

                 <div className="toggle-wrapper">
                    <label className="switch">
                        <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({...form, ativo: e.target.checked})}/>
                        <span className="slider"></span>
                    </label>
                    <span className="toggle-label">{form.ativo ? 'Ativo' : 'Inativo'}</span>
                 </div>

                 <div style={{gridColumn: '1 / -1'}}>
                    <label className="input-label"><b>Nome</b></label>
                    <input className="form-control" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required />
                 </div>
                 
                 <div style={{gridColumn: '1 / -1'}}>
                    <label className="input-label"><b>Descrição</b></label>
                    <input className="form-control" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
                 </div>
               </div>

               <div className="form-actions">
                 <button type="button" onClick={handleCancel} className="btn">Cancelar</button>
                 <button
                  type="submit"
                  className="btn primary"
                  disabled={isFormInvalid} 
                  title={isFormInvalid ? "Preencha todos os campos" : ""}
                 >
                  Salvar
                 </button>
               </div>
            </form>
          </section>
        </div>
      ) : (
        <section className="card">
          <div className="toolbar">
              <h2 className="page-title">Módulos</h2>
              <div className="toolbar-actions">
                <button onClick={handleNew} className="btn primary btn-new">Novo Módulo</button>
                <div className="separator"></div>
                <div ref={globalSearchRef} className="search-wrapper">
                    <input 
                        type="text" 
                        placeholder={"Buscar..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowGlobalSuggestions(true)}
                        className="search-input"
                    />
                    <span className="search-icon"><Search /></span>
                    {showGlobalSuggestions && (
                        <ul className="custom-dropdown">
                            {globalSuggestions.length === 0 ? <li style={{color:'#999'}}>Nenhum módulo encontrado.</li> : globalSuggestions.map(m => (
                                <li key={m.id} onClick={() => { setSearchTerm(m.nome); setShowGlobalSuggestions(false); }}>
                                    {truncate(m.nome, 20)}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
              </div>
          </div>

          <div className="table-wrap">
              <div className="content-area">
                  <table>
                      <thead>
                          <tr>
                              <th style={{width: '60px', textAlign: 'center'}}>ID</th>

                              <th style={{textAlign: 'left'}}>Módulo</th>
                              
                              <th style={{width: '200px', verticalAlign: 'middle'}}>
                                <div className="th-filter-container" ref={sistemaHeaderRef}>
                                    {isSistemaSearchOpen || selectedSistemaId ? (
                                        <div style={{position: 'relative', width: '100%'}}>
                                            <input 
                                                autoFocus type="text" className={`th-search-input ${selectedSistemaId ? 'active' : ''}`}
                                                placeholder="Sistema..."
                                                value={selectedSistemaId && sistemaSearchText === '' ? truncate(getSistemaName(parseInt(selectedSistemaId)), 15) : sistemaSearchText}
                                                onChange={(e) => { setSistemaSearchText(e.target.value); if(selectedSistemaId) setSelectedSistemaId(''); }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button className="btn-clear-filter" onClick={(e) => {
                                                e.stopPropagation();
                                                if (selectedSistemaId) { setSelectedSistemaId(''); setSistemaSearchText(''); } 
                                                else { setIsSistemaSearchOpen(false); setSistemaSearchText(''); }
                                            }}>✕</button>
                                            {(!selectedSistemaId || sistemaSearchText) && (
                                                <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}>
                                                    <li onClick={() => { setSelectedSistemaId(''); setSistemaSearchText(''); setIsSistemaSearchOpen(false); }}><span style={{color: '#3b82f6', fontWeight: 'bold'}}>Todos</span></li>
                                                    {filteredSistemasForHeader.map(s => (
                                                        <li key={s.id} onClick={() => { setSelectedSistemaId(s.id); setSistemaSearchText(''); setIsSistemaSearchOpen(true); }}>{truncate(s.nome, 15)}</li>
                                                    ))}
                                                    {filteredSistemasForHeader.length === 0 && <li style={{color:'#94a3b8'}}>Sem resultados</li>}
                                                </ul>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="th-label" onClick={() => setIsSistemaSearchOpen(true)} title="Filtrar Sistema">
                                            SISTEMA <span className="filter-icon">▼</span>
                                        </div>
                                    )}
                                </div>
                              </th>
                              
                              <th style={{textAlign: 'center', width: '140px', verticalAlign: 'middle'}}>
                                <div className="th-filter-container" ref={statusHeaderRef} style={{justifyContent: 'center'}}>
                                    {isStatusSearchOpen || selectedStatus ? (
                                        <div style={{position: 'relative', width: '100%'}}>
                                            <input 
                                                autoFocus type="text" className={`th-search-input ${selectedStatus ? 'active' : ''}`}
                                                placeholder="Status..."
                                                value={selectedStatus && statusSearchText === '' ? (selectedStatus === 'true' ? 'Ativo' : 'Inativo') : statusSearchText}
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
                                                    <li onClick={() => { setSelectedStatus(''); setStatusSearchText(''); setIsStatusSearchOpen(false); }}><span style={{color: '#3b82f6', fontWeight: 'bold'}}>Todos</span></li>
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
                          {filteredModulos.length === 0 ? (
                              <tr><td colSpan="5" className="no-results">Nenhum módulo encontrado.</td></tr>
                          ) : (
                              currentModulos.map(m => (
                                  <tr key={m.id} onClick={() => handleSelectRow(m)} className={'selectable'} style={{opacity: m.ativo ? 1 : 0.6}}>
                                      
                                      <td style={{textAlign: 'center', fontWeight: 'bold', color: '#666'}}>#{m.id}</td>

                                      <td className="cell-name">
                                          <strong>{truncate(m.nome, 20)}</strong>
                                          <div className="muted">{truncate(m.descricao, 30)}</div>
                                      </td>
                                      <td><span className="badge system">{truncate(getSistemaName(m.sistema_id), 20)}</span></td>
                                      <td style={{textAlign: 'center'}}>
                                          <span className={`badge ${m.ativo ? 'on' : 'off'}`}>{m.ativo ? 'ATIVO' : 'INATIVO'}</span>                                      
                                      </td>
                                      <td className="cell-actions">
                                          <button onClick={(e) => { e.stopPropagation(); requestDelete(m); }} className="btn danger small"><Trash /></button>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
              <div className="pagination-container">
                    <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn nav-btn">‹</button>
                    {Array.from({length: totalPages}, (_, i) => (
                        <button key={i+1} onClick={() => paginate(i+1)} className={`pagination-btn ${currentPage === i+1 ? 'active' : ''}`}>{i+1}</button>
                    )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                    <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-btn nav-btn">›</button>
              </div>
          </div>
        </section>
      )}
    </main>
  );
}
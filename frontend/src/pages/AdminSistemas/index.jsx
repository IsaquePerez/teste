import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal'; 
import { Trash } from '../../components/icons/Trash';
import { Search } from '../../components/icons/Search';
import './styles.css';

export function AdminSistemas() {
  const [sistemas, setSistemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [form, setForm] = useState({ nome: '', descricao: '', ativo: true }); 
  const [editingId, setEditingId] = useState(null);
  
  const { success, error, warning } = useSnackbar();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sistemaToDelete, setSistemaToDelete] = useState(null);
  
  // --- FILTRO GLOBAL ---
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

  const truncate = (str, n = 40) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;

  useEffect(() => { loadSistemas(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedStatus]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (statusHeaderRef.current && !statusHeaderRef.current.contains(event.target)) {
        if (!selectedStatus) { setIsStatusSearchOpen(false); setStatusSearchText(''); }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, selectedStatus]);

  const loadSistemas = async () => {
    setLoading(true);
    try {
      const data = await api.get("/sistemas/");
      setSistemas(Array.isArray(data) ? data : []);
    } catch (err) { 
      error("Erro ao carregar sistemas."); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- LÓGICA DE FILTRAGEM ---
  const filteredSistemas = sistemas.filter(s => {
      if (selectedStatus !== '') {
          const statusBool = selectedStatus === 'true';
          if (s.ativo !== statusBool) return false;
      }
      if (searchTerm && !s.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
  });

  const opcoesParaMostrar = searchTerm === '' 
    ? filteredSistemas.slice(0, 5) 
    : filteredSistemas.slice(0, 5);

  const statusOptions = [{label: 'Ativo', value: 'true'}, {label: 'Inativo', value: 'false'}];
  const filteredStatusHeader = statusOptions.filter(opt => opt.label.toLowerCase().includes(statusSearchText.toLowerCase()));

  // --- ACTIONS ---
  const handleNew = () => {
    setForm({ nome: '', descricao: '', ativo: true });
    setEditingId(null);
    setView('form');
  };

  const handleCancel = () => {
      setForm({ nome: '', descricao: '', ativo: true });
      setEditingId(null);
      setView('list');
  };

  const handleSelectRow = (s) => {
    setForm({ nome: s.nome, descricao: s.descricao, ativo: s.ativo });
    setEditingId(s.id);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return warning("Por favor, preencha o nome do sistema.");

    const nomeNormalizado = form.nome.trim().toLowerCase();
    const duplicado = sistemas.some(s => s.nome.trim().toLowerCase() === nomeNormalizado && s.id !== editingId);

    if (duplicado) return warning("Já existe um Sistema com este nome.");

    try {
      if (editingId) {
        await api.put(`/sistemas/${editingId}`, form);
        success("Sistema atualizado com sucesso!");
      } else {
        await api.post("/sistemas/", form); 
        success("Sistema cadastrado com sucesso!");
      }
      loadSistemas(); 
      handleCancel();
    } catch (err) { 
      const msg = err.response?.data?.detail || "Erro ao salvar sistema.";
      error(msg); 
    }
  };

  const requestDelete = (sistema) => {
      setSistemaToDelete(sistema);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!sistemaToDelete) return;
      try {
          await api.delete(`/sistemas/${sistemaToDelete.id}`);
          success("Sistema excluído com sucesso.");
          loadSistemas();
          if (editingId === sistemaToDelete.id) handleCancel();
      } catch (err) {
          error("Não foi possível excluir. Verifique se existem vínculos.");
      } finally {
          setSistemaToDelete(null); 
          setIsDeleteModalOpen(false);
      }
  };

  // --- PAGINAÇÃO ---
  const totalPages = Math.ceil(filteredSistemas.length / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  const currentSistemas = filteredSistemas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginate = (n) => setCurrentPage(n);

  const isFormInvalid =  !form.nome.trim() || !form.descricao.trim();

  return (
    <main className="container"> 
      <ConfirmationModal 
        isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete}
        title="Excluir Sistema?" message={`Tem certeza que deseja excluir "${sistemaToDelete?.nome}"?`} isDanger={true}
      />

      {view === 'form' && (
        <section className="card form-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 className="section-title">{editingId ? 'Editar Sistema' : 'Novo Sistema'}</h2>
          <form onSubmit={handleSubmit}>
            
            <div className="form-grid" style={{ gridTemplateColumns: '1fr auto' }}> 
              
              <div style={{gridColumn: '1'}}>
                  <label className="input-label"><b>Nome</b></label>
                  <input maxLength={50} value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="form-control"/>
              </div>

              <div className="toggle-wrapper" style={{marginTop: '28px'}}>
                  <label className="switch">
                      <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({...form, ativo: e.target.checked})}/>
                      <span className="slider"></span>
                  </label>
                  <span className="toggle-label">{form.ativo ? 'Ativo' : 'Inativo'}</span>
              </div>

              <div style={{gridColumn: '1 / -1'}}>
                  <label className="input-label"><b>Descrição</b></label>
                  <input maxLength={100} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="form-control"/>
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
      )}

      {view === 'list' && (
        <section className="card" style={{marginTop: 0}}>
          <div className="toolbar">
              <h2 className="page-title">Sistemas</h2>
              <div className="toolbar-actions" style={{display:'flex', gap:'10px', alignItems:'center'}}>
                <button onClick={handleNew} className="btn primary btn-new">Novo Sistema</button>
                <div className="separator"></div>
                <div ref={wrapperRef} className="search-wrapper">
                    <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowSuggestions(true)} className="search-input" />
                    <span className="search-icon"><Search /></span>
                    {showSuggestions && (
                        <ul className="custom-dropdown">
                            {opcoesParaMostrar.length === 0 ? <li style={{color:'#999'}}>Nenhum sistema encontrado.</li> : opcoesParaMostrar.map(s => (
                                <li key={s.id} onClick={() => { setSearchTerm(s.nome); setShowSuggestions(false); }}>{truncate(s.nome, 20)}</li>
                            ))}
                        </ul>
                    )}
                </div>
              </div>
          </div>

          <div className="table-wrap">
              <div className="content-area">
                  {loading ? <p style={{padding:'20px', textAlign:'center'}}>Carregando...</p> : (
                      <table>
                          <thead>
                              <tr>
                                  <th style={{width: '60px', textAlign: 'center'}}>ID</th>
                                  
                                  <th style={{textAlign: 'left'}}>Nome</th>
                                  
                                  <th style={{textAlign: 'center', width: '140px', verticalAlign: 'middle'}}>
                                    <div className="th-filter-container" ref={statusHeaderRef} style={{justifyContent: 'center'}}>
                                            {isStatusSearchOpen || selectedStatus ? (
                                                <div style={{position: 'relative', width: '100%'}}>
                                                    <input 
                                                        autoFocus type="text" className={`th-search-input ${selectedStatus ? 'active' : ''}`} placeholder="Status..."
                                                        value={selectedStatus && statusSearchText === '' ? (selectedStatus === 'true' ? 'Ativo' : 'Inativo') : statusSearchText}
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
                              {filteredSistemas.length === 0 ? (
                                  <tr><td colSpan="4" className="no-results">Nenhum sistema encontrado.</td></tr>
                              ) : (
                                  currentSistemas.map(s => (
                                      <tr key={s.id} onClick={() => handleSelectRow(s)} className="selectable" style={{opacity: s.ativo ? 1 : 0.6}}>
                                          
                                          <td style={{textAlign: 'center', fontWeight: 'bold', color: '#666'}}>#{s.id}</td>

                                          <td className="cell-name">
                                              <strong title={s.nome}>{truncate(s.nome, 30)}</strong>
                                              <div title={s.descricao}>{truncate(s.descricao, 40)}</div>
                                          </td>
                                          <td style={{textAlign: 'center', whiteSpace: 'nowrap'}}>
                                              <span className={`badge ${s.ativo ? 'on' : 'off'}`}>{s.ativo ? 'ATIVO' : 'INATIVO'}</span>
                                          </td>
                                          <td className="cell-actions">
                                              <button onClick={(e) => { e.stopPropagation(); requestDelete(s); }} className="btn danger small"><Trash /></button>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  )}
              </div>
              {filteredSistemas.length > 0 && (
                  <div className="pagination-container">
                        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn nav-btn">‹</button>
                        {Array.from({length: totalPages}, (_, i) => (
                            <button key={i+1} onClick={() => paginate(i+1)} className={`pagination-btn ${currentPage === i+1 ? 'active' : ''}`}>{i+1}</button>
                        )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                        <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-btn nav-btn">›</button>
                  </div>
              )}
          </div>
        </section>
      )}
    </main>
  );
}
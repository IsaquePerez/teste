import { useState, useEffect, useRef } from 'react';
import { api, getSession } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';

export function QADefeitos() {
  const isAdmin = getSession().role === 'admin';
  const [defeitos, setDefeitos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [galleryImages, setGalleryImages] = useState(null);
  
  // --- ESTADOS DA BUSCA E FILTROS ---
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // --- FILTROS DE COLUNA (Apenas Admin vê) ---
  const [origemSearchText, setOrigemSearchText] = useState('');
  const [isOrigemSearchOpen, setIsOrigemSearchOpen] = useState(false);
  const origemHeaderRef = useRef(null);

  const [sevSearchText, setSevSearchText] = useState('');
  const [selectedSev, setSelectedSev] = useState('');
  const [isSevSearchOpen, setIsSevSearchOpen] = useState(false);
  const sevHeaderRef = useRef(null);

  const [statusSearchText, setStatusSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isStatusSearchOpen, setIsStatusSearchOpen] = useState(false);
  const statusHeaderRef = useRef(null);

  const { success, error } = useSnackbar();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [defectToDelete, setDefectToDelete] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const truncate = (str, n = 35) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  // Click Outside
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (!event.target.closest('.status-cell')) setOpenMenuId(null);
        if (searchRef.current && !searchRef.current.contains(event.target)) setShowSuggestions(false);
        if (origemHeaderRef.current && !origemHeaderRef.current.contains(event.target)) {
            if (!origemSearchText) setIsOrigemSearchOpen(false);
        }
        if (sevHeaderRef.current && !sevHeaderRef.current.contains(event.target)) {
            if (!selectedSev) { setIsSevSearchOpen(false); setSevSearchText(''); }
        }
        if (statusHeaderRef.current && !statusHeaderRef.current.contains(event.target)) {
            if (!selectedStatus) { setIsStatusSearchOpen(false); setStatusSearchText(''); }
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedSev, selectedStatus, origemSearchText]);

  useEffect(() => { loadDefeitos(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, origemSearchText, selectedSev, selectedStatus]);

  const loadDefeitos = async () => {
    setLoading(true);
    try {
      const data = await api.get("/defeitos/");
      setDefeitos(Array.isArray(data) ? data : []);
    } catch (err) { error("Erro ao carregar defeitos."); }
    finally { setLoading(false); }
  };

  // --- LÓGICA DE FILTRAGEM ---
  const filteredDefeitos = defeitos.filter(d => {
      const nomeTeste = d.execucao?.caso_teste?.nome || '';
      
      // Filtros de Coluna
      if (origemSearchText && !nomeTeste.toLowerCase().includes(origemSearchText.toLowerCase())) return false;
      if (selectedSev && d.severidade !== selectedSev) return false;
      if (selectedStatus && d.status !== selectedStatus) return false;

      // Filtro Global
      if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchTeste = nomeTeste.toLowerCase().includes(term);
          const matchTitulo = d.titulo.toLowerCase().includes(term);
          if (!matchTeste && !matchTitulo) return false;
      }
      return true;
  });

  const globalSuggestions = searchTerm === '' ? filteredDefeitos.slice(0, 5) : filteredDefeitos.slice(0, 5);

  const sevOptions = [{label:'Crítico', value:'critico'}, {label:'Alto', value:'alto'}, {label:'Médio', value:'medio'}, {label:'Baixo', value:'baixo'}];
  const filteredSevHeader = sevOptions.filter(o => o.label.toLowerCase().includes(sevSearchText.toLowerCase()));

  const statusOptions = [{label:'Aberto', value:'aberto'}, {label:'Em Teste', value:'em_teste'}, {label:'Corrigido', value:'corrigido'}, {label:'Fechado', value:'fechado'}];
  const filteredStatusHeader = statusOptions.filter(o => o.label.toLowerCase().includes(statusSearchText.toLowerCase()));

  const totalPages = Math.ceil(filteredDefeitos.length / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  const currentDefeitos = filteredDefeitos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginate = (n) => setCurrentPage(n);

  const handleUpdateStatus = async (id, newStatus) => {    
    setOpenMenuId(null); 
    try { await api.put(`/defeitos/${id}`, { status: newStatus }); success(`Status atualizado!`); loadDefeitos(); } catch (e) { error("Erro ao atualizar."); }
  };
  
  const requestDelete = (d) => { setDefectToDelete(d); setIsDeleteModalOpen(true); };
  const confirmDelete = async () => {
      if (!defectToDelete) return;
      try { await api.delete(`/defeitos/${defectToDelete.id}`); success(`Excluído.`); loadDefeitos(); } catch (err) { error("Erro ao excluir."); } finally { setDefectToDelete(null); }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getSeveridadeColor = (sev) => {
      switch(sev) { case 'critico': return '#b91c1c'; case 'alto': return '#ef4444'; case 'medio': return '#f59e0b'; default: return '#10b981'; }
  };

  const parseEvidencias = (evidenciaString) => {
      if (!evidenciaString) return [];
      if (typeof evidenciaString === 'string' && evidenciaString.trim().startsWith('http') && !evidenciaString.trim().startsWith('[')) return [evidenciaString];
      try { const parsed = JSON.parse(evidenciaString); return Array.isArray(parsed) ? parsed : [evidenciaString]; } catch (e) { return [evidenciaString]; }
  };

  const openGallery = (evidencias) => { const lista = parseEvidencias(evidencias); if (lista.length > 0) setGalleryImages(lista); };
  const toggleMenu = (id) => { if (!isAdmin) return; setOpenMenuId(openMenuId === id ? null : id); };

  const getPaginationGroup = () => {
    const maxButtons = 5; let start = Math.max(1, currentPage - Math.floor(maxButtons / 2)); let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
    const pages = []; for (let i = start; i <= end; i++) pages.push(i); return pages;
  };

  return (
    <main className="container">
      <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={() => { confirmDelete(); setIsDeleteModalOpen(false); }} title="Excluir?" message={`Excluir "${defectToDelete?.titulo || ''}"?`} isDanger={true} />
      
      <section className="card">
        <div className="toolbar" style={{ flexWrap: 'wrap', gap: '15px' }}>
            <h2 className="section-title">Gestão de Defeitos</h2>
            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto', alignItems: 'center' }}>
                <button onClick={loadDefeitos} className="btn">Atualizar</button>
                <div className="separator"></div>
                <div className="search-wrapper" ref={searchRef} style={{ position: 'relative', width: '250px' }}>
                    <input 
                        type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowSuggestions(true)}
                        style={{ padding: '8px 0px 8px 8px', border: '1px solid #e2e8f0', borderRadius: '6px', width: '100%', fontSize: '0.9rem', outline: 'none' }}
                    />
                    <span className="search-icon">🔍</span>
                    {showSuggestions && (
                        <ul className="dropdown-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, listStyle: 'none', margin: '5px 0 0 0', padding: 0, maxHeight: '200px', overflowY: 'auto' }}>
                            {globalSuggestions.length === 0 ? <li style={{padding:'10px', color:'#999'}}>Sem resultados.</li> : globalSuggestions.map((d) => (
                                <li key={d.id} onClick={() => { setSearchTerm(d.titulo); setShowSuggestions(false); }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', color: '#334155' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>
                                    {truncate(d.titulo, 25)}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>

        {loading ? <p>Carregando...</p> : (
          <div className="table-wrap">
            <div className="content-area">
                <table style={{ borderCollapse: 'separate', borderSpacing: '0 5px' }}>
                    <thead>
                    <tr>
                        <th>ID</th>
                        
                        {/* --- HEADER ORIGEM --- */}
                        <th style={{width: '200px', verticalAlign: 'middle'}}>
                            <div className="th-filter-container" ref={origemHeaderRef}>
                                {isAdmin && (isOrigemSearchOpen || origemSearchText) ? (
                                    <div style={{position: 'relative', width: '100%'}}>
                                        <input autoFocus type="text" className={`th-search-input ${origemSearchText ? 'active' : ''}`} placeholder="Origem..." value={origemSearchText} onChange={(e) => setOrigemSearchText(e.target.value)} onClick={(e) => e.stopPropagation()} />
                                        <button className="btn-clear-filter" onClick={(e) => { e.stopPropagation(); setOrigemSearchText(''); setIsOrigemSearchOpen(false); }}>✕</button>
                                    </div>
                                ) : (
                                    <div className="th-label" onClick={() => isAdmin && setIsOrigemSearchOpen(true)} title={isAdmin ? "Filtrar Origem" : ""}>
                                        ORIGEM {isAdmin && <span className="filter-icon">▼</span>}
                                    </div>
                                )}
                            </div>
                        </th>

                        <th>Erro</th>
                        <th>Evidências</th>

                        {/* --- HEADER SEVERIDADE --- */}
                        <th style={{width: '130px', verticalAlign: 'middle'}}>
                            <div className="th-filter-container" ref={sevHeaderRef}>
                                {isAdmin && (isSevSearchOpen || selectedSev) ? (
                                    <div style={{position: 'relative', width: '100%'}}>
                                        <input autoFocus type="text" className={`th-search-input ${selectedSev ? 'active' : ''}`} placeholder="Sev..." value={selectedSev && sevSearchText==='' ? (selectedSev.charAt(0).toUpperCase()+selectedSev.slice(1)) : sevSearchText} onChange={(e) => { setSevSearchText(e.target.value); if(selectedSev) setSelectedSev(''); }} onClick={(e) => e.stopPropagation()} />
                                        <button className="btn-clear-filter" onClick={(e) => { e.stopPropagation(); if(selectedSev){setSelectedSev('');setSevSearchText('')}else{setIsSevSearchOpen(false);setSevSearchText('')} }}>✕</button>
                                        {(!selectedSev || sevSearchText) && <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}><li onClick={() => { setSelectedSev(''); setSevSearchText(''); setIsSevSearchOpen(false); }}><span style={{color:'#3b82f6'}}>Todos</span></li>{filteredSevHeader.map(o=><li key={o.value} onClick={()=>{setSelectedSev(o.value);setSevSearchText('');setIsSevSearchOpen(true)}}>{o.label}</li>)}</ul>}
                                    </div>
                                ) : (
                                    <div className="th-label" onClick={() => isAdmin && setIsSevSearchOpen(true)} title={isAdmin ? "Filtrar" : ""}>SEVERIDADE {isAdmin && <span className="filter-icon">▼</span>}</div>
                                )}
                            </div>
                        </th>

                        {/* --- HEADER STATUS --- */}
                        <th style={{width: '130px', verticalAlign: 'middle'}}>
                            <div className="th-filter-container" ref={statusHeaderRef}>
                                {isAdmin && (isStatusSearchOpen || selectedStatus) ? (
                                    <div style={{position: 'relative', width: '100%'}}>
                                        <input autoFocus type="text" className={`th-search-input ${selectedStatus ? 'active' : ''}`} placeholder="Status..." value={selectedStatus && statusSearchText==='' ? selectedStatus.replace('_',' ').toUpperCase() : statusSearchText} onChange={(e) => { setStatusSearchText(e.target.value); if(selectedStatus) setSelectedStatus(''); }} onClick={(e) => e.stopPropagation()} />
                                        <button className="btn-clear-filter" onClick={(e) => { e.stopPropagation(); if(selectedStatus){setSelectedStatus('');setStatusSearchText('')}else{setIsStatusSearchOpen(false);setStatusSearchText('')} }}>✕</button>
                                        {(!selectedStatus || statusSearchText) && <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}><li onClick={() => { setSelectedStatus(''); setStatusSearchText(''); setIsStatusSearchOpen(false); }}><span style={{color:'#3b82f6'}}>Todos</span></li>{filteredStatusHeader.map(o=><li key={o.value} onClick={()=>{setSelectedStatus(o.value);setStatusSearchText('');setIsStatusSearchOpen(true)}}>{o.label}</li>)}</ul>}
                                    </div>
                                ) : (
                                    <div className="th-label" onClick={() => isAdmin && setIsStatusSearchOpen(true)} title={isAdmin ? "Filtrar" : ""}>STATUS {isAdmin && <span className="filter-icon">▼</span>}</div>
                                )}
                            </div>
                        </th>

                        <th style={{textAlign: 'right'}}>Data</th>
                        
                        {/* --- AÇÕES (APENAS PARA ADMIN) --- */}
                        {isAdmin && <th style={{textAlign: 'right'}}>Ações</th>}
                    </tr>
                    </thead>
                    <tbody>                    
                    {filteredDefeitos.length === 0 ? <tr><td colSpan={isAdmin ? 8 : 7} className="no-results" style={{textAlign:'center'}}>Nenhum defeito encontrado.</td></tr> : currentDefeitos.map(d => {
                        const temEvidencia = d.evidencias && parseEvidencias(d.evidencias).length > 0;
                        return (
                            <tr key={d.id}>
                                <td className="col-id">#{d.id}</td>
                                <td className="col-origin">
                                    <div><strong>{d.execucao?.caso_teste?.nome || 'Teste Removido'}</strong></div>
                                    <div>{!d.execucao?.responsavel ? <span className="resp-badge resp-unknown">Desconhecido</span> : <span className={`resp-badge ${d.execucao.responsavel.ativo ? 'resp-active' : 'resp-inactive'}`}>{d.execucao.responsavel.nome} {d.execucao.responsavel.ativo ? '' : '(Inativo)'}</span>}</div>
                                </td>
                                <td className="col-error"><strong>{d.titulo}</strong><div className="desc" title={d.descricao}>{truncate(d.descricao, 30)}</div></td>
                                <td>{temEvidencia ? <button onClick={() => openGallery(d.evidencias)} className="btn-view">Ver</button> : <span style={{color: '#cbd5e1'}}>-</span>}</td>
                                <td><span className="col-severity" style={{color: getSeveridadeColor(d.severidade)}}>{d.severidade}</span></td>                                
                                <td className="status-cell" style={{ position: 'relative' }}> 
                                    {isAdmin ? (                                 
                                            <>
                                                <button onClick={() => toggleMenu(d.id)} className={`status-badge status-${d.status || 'aberto'} status-dropdown-btn`}>{d.status.replace('_',' ').toUpperCase()} <span>▼</span></button>
                                                {openMenuId === d.id && (
                                                    <div className="dropdown-menu">
                                                        {['aberto', 'em_teste', 'corrigido', 'fechado'].map(opt => (
                                                            <div key={opt} onClick={() => handleUpdateStatus(d.id, opt)} className={`dropdown-item ${d.status === opt ? 'active' : ''}`}>{opt.replace('_', ' ')}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                    ) : <span className={`status-badge status-${d.status || 'aberto'}`}>{d.status.replace('_',' ').toUpperCase()}</span>}
                                </td>
                                <td className="col-date">{formatDate(d.created_at)}</td>
                                
                                {/* --- AÇÕES (APENAS PARA ADMIN) --- */}
                                {isAdmin && (
                                    <td style={{textAlign: 'right'}}>
                                        <button onClick={(e) => { e.stopPropagation(); requestDelete(d); }} className="btn danger small">🗑️</button>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            <div className="pagination-container">
                <button onClick={() => paginate(1)} disabled={currentPage === 1 || totalPages === 0} className="pagination-btn nav-btn">«</button>
                <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1 || totalPages === 0} className="pagination-btn nav-btn">‹</button>
                {getPaginationGroup().map((item) => (<button key={item} onClick={() => paginate(item)} className={`pagination-btn ${currentPage === item ? 'active' : ''}`}>{item}</button>))}
                <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="pagination-btn nav-btn">›</button>
                <button onClick={() => paginate(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="pagination-btn nav-btn">»</button>
            </div>
          </div>
        )}
      </section>

      {galleryImages && (
          <div className="gallery-overlay" onClick={() => setGalleryImages(null)}>
              <div className="gallery-track">
                  {galleryImages.map((url, idx) => {
                      const filename = url.split('/').pop();
                      const downloadUrl = `http://localhost:8000/api/v1/testes/evidencias/download/${filename}`;
                      return (
                        <div key={idx} className="gallery-item">
                            <img src={url} alt={`Evidência ${idx+1}`} className="gallery-img" onClick={(e) => e.stopPropagation()} />
                            <div style={{ marginTop:'15px', display:'flex', alignItems:'center', justifyContent:'center', gap:'15px', color:'white' }}> 
                                <span style={{fontSize: '1.1rem'}}>Imagem {idx + 1}</span>
                                {isAdmin && <a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none', background: 'white', color: '#333', padding: '5px 12px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>⬇️ Baixar</a>}
                            </div>
                        </div>
                      );
                  })}
              </div>
              <button className="btn" style={{marginTop:'20px', background:'rgba(255,255,255,0.2)', color:'white', border:'1px solid white'}} onClick={() => setGalleryImages(null)}>Fechar Galeria</button>
          </div>
      )}
    </main>
  );
}
import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Search } from '../../components/icons/Search';
import { useAuth } from '../../context/AuthContext';
import './styles.css';

// --- COMPONENTE REUTILIZÁVEL (Cópia do AdminCiclos para consistência) ---
const SearchableSelect = ({ options = [], value, onChange, placeholder, disabled, labelKey = 'nome', maxLen = 25 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const truncate = (str, n) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  useEffect(() => {
    if (!Array.isArray(options)) return;
    if (value === null || value === undefined || value === '') {
      if (!(value === '' && searchTerm !== '')) setSearchTerm('');
    }
    const selectedOption = options.find(opt => String(opt.id) === String(value));
    if (selectedOption) {
      if (!isOpen || searchTerm === '') setSearchTerm(selectedOption[labelKey]);
    }
  }, [value, options, labelKey]); 

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        if (value && Array.isArray(options)) {
            const selectedOption = options.find(opt => String(opt.id) === String(value));
            if (selectedOption) setSearchTerm(selectedOption[labelKey]);
        } else {
            setSearchTerm(''); 
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value, options, labelKey]);

  const safeOptions = Array.isArray(options) ? options : [];
  const filteredOptions = searchTerm === '' 
    ? safeOptions 
    : safeOptions.filter(opt => opt[labelKey] && opt[labelKey].toLowerCase().includes(searchTerm.toLowerCase()));

  const displayOptions = filteredOptions.slice(0, 50);

  const handleSelect = (option) => {
    onChange(option.id);
    setSearchTerm(option[labelKey]);
    setIsOpen(false);
  };

  const handleClear = (e) => {
      e.stopPropagation();
      onChange('');
      setSearchTerm('');
      setIsOpen(false);
  }

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
            <li onClick={handleClear} style={{ color: '#3b82f6', fontWeight: 'bold', borderBottom: '1px solid #eee', cursor: 'pointer', padding: '10px 15px' }}>
                Todos
            </li>
            {displayOptions.length === 0 ? (
                <li style={{ color: '#999', cursor: 'default', padding: '10px' }}>{searchTerm ? 'Sem resultados' : 'Digite para buscar...'}</li>
            ) : (
                displayOptions.map(opt => (
                <li key={opt.id} onClick={() => handleSelect(opt)} title={opt[labelKey]}>
                    {truncate(opt[labelKey], maxLen)}
                </li>
                ))
            )}
        </ul>
      )}
    </div>
  );
};

export function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [sistemas, setSistemas] = useState([]); // Para o filtro
  const [loading, setLoading] = useState(true);
  const { error, success } = useSnackbar();
  const { user } = useAuth();
  
  // --- ESTADOS DE FILTRO ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSistema, setSelectedSistema] = useState('');
  
  // Filtro de Ação (Dropdown no Header)
  const [acaoSearchText, setAcaoSearchText] = useState('');
  const [selectedAcao, setSelectedAcao] = useState('');
  const [isAcaoOpen, setIsAcaoOpen] = useState(false);
  const acaoHeaderRef = useRef(null);

  // Estados de Ação
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Logs geralmente mostram mais itens por página

  const isAdmin = user?.role === 'admin' || user?.nivel_acesso?.nome === 'admin';

  const truncate = (str, n = 50) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';
  
  // Formata data PT-BR
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // --- EFEITOS ---
  useEffect(() => {
    loadData();
  }, []);

  // Fecha dropdown do header ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (acaoHeaderRef.current && !acaoHeaderRef.current.contains(event.target)) {
        if (!selectedAcao) { setIsAcaoOpen(false); setAcaoSearchText(''); }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedAcao]);

  // Reset paginação ao filtrar
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedSistema, selectedAcao]);

  // --- CARREGAMENTO ---
  const loadData = async () => {
    setLoading(true);
    try {
      // Carrega Logs e Sistemas para o filtro
      const [logsRes, sisRes] = await Promise.all([
          api.get('/logs/'),
          api.get('/sistemas/')
      ]);
      
      const logsData = Array.isArray(logsRes.data || logsRes) ? (logsRes.data || logsRes) : [];
      // Ordena logs por data decrescente (caso o backend não garanta)
      logsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setLogs(logsData);
      setSistemas(Array.isArray(sisRes.data || sisRes) ? (sisRes.data || sisRes) : []);
    } catch (err) {
      console.error(err);
      error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = (log) => {
      setLogToDelete(log);
      setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
      if(!logToDelete) return;
      try {
          await api.delete(`/logs/${logToDelete.id}`);
          success("Registro removido.");
          loadData();
      } catch(e) {
          error("Erro ao remover registro.");
      } finally {
          setIsDeleteOpen(false);
          setLogToDelete(null);
      }
  };

  // --- FILTRAGEM DOS DADOS ---
  const filteredLogs = logs.filter(log => {
      // Filtro de Sistema
      if (selectedSistema && String(log.sistema_id) !== String(selectedSistema)) return false;
      
      // Filtro de Ação (Coluna)
      if (selectedAcao && log.acao !== selectedAcao) return false;

      // Filtro de Texto (Global)
      if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const match = 
            (log.usuario_nome || '').toLowerCase().includes(s) ||
            (log.sistema_nome || '').toLowerCase().includes(s) ||
            (log.entidade || '').toLowerCase().includes(s) ||
            (log.detalhes || '').toLowerCase().includes(s) ||
            String(log.id).includes(s);
          if (!match) return false;
      }
      return true;
  });

  // Opções para o filtro de Ação no Header
  const acaoOptions = [
      {label: 'CRIAR', value: 'CRIAR'},
      {label: 'ATUALIZAR', value: 'ATUALIZAR'},
      {label: 'DELETAR', value: 'DELETAR'},
      {label: 'LOGIN', value: 'LOGIN'}
  ];
  const filteredAcaoHeader = acaoOptions.filter(o => o.label.toLowerCase().includes(acaoSearchText.toLowerCase()));

  // --- PAGINAÇÃO ---
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentItems = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginate = (n) => setCurrentPage(n);

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Apagar Log"
        message="Tem certeza? Esta ação remove o rastro de auditoria permanentemente."
        isDanger={true}
      />

      <section className="card" style={{marginTop: 0}}>
        <div className="toolbar">
            <h3 className="page-title">Logs do Sistema</h3>
            <div className="toolbar-actions">
                <div className="filter-group">
                     <span className="filter-label">SISTEMA:</span>
                     <div style={{width: '200px'}}>
                         <SearchableSelect 
                             options={sistemas}
                             value={selectedSistema}
                             onChange={setSelectedSistema}
                             placeholder="Todos os Sistemas"
                             maxLen={20}
                         />
                     </div>
                </div>

                <div className="separator"></div>

                <div className="search-wrapper">
                    <input 
                        type="text" 
                        placeholder="Buscar log..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="search-input" 
                    />
                    <span className="search-icon"><Search /></span>
                </div>
            </div>
        </div>

        {loading ? <div className="loading-text">Carregando histórico...</div> : (
            <div className="table-wrap">
                <div className="content-area">
                    <table>
                        <thead>
                            <tr>
                                <th style={{width: '60px'}}>ID</th>
                                <th style={{width: '140px'}}>Data / Hora</th>
                                <th style={{width: '160px'}}>Usuário</th>
                                <th style={{width: '140px'}}>Sistema</th>
                                
                                {/* Filtro Dropdown no Header (Ação) */}
                                <th style={{width: '110px', textAlign: 'center', verticalAlign: 'middle'}}>
                                    <div className="th-filter-container" ref={acaoHeaderRef} style={{justifyContent: 'center'}}>
                                        {isAcaoOpen || selectedAcao ? (
                                            <div style={{position: 'relative', width: '100%'}}>
                                                <input 
                                                    autoFocus 
                                                    type="text" 
                                                    className={`th-search-input ${selectedAcao ? 'active' : ''}`} 
                                                    placeholder="Ação..." 
                                                    value={selectedAcao ? selectedAcao : acaoSearchText}
                                                    onChange={(e) => { setAcaoSearchText(e.target.value); if(selectedAcao) setSelectedAcao(''); }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <button className="btn-clear-filter" onClick={(e) => {
                                                    e.stopPropagation(); 
                                                    if(selectedAcao){setSelectedAcao('');setAcaoSearchText('')}
                                                    else{setIsAcaoOpen(false);setAcaoSearchText('')}
                                                }}>✕</button>
                                                
                                                {(!selectedAcao || acaoSearchText) && (
                                                    <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}>
                                                        <li onClick={() => { setSelectedAcao(''); setAcaoSearchText(''); setIsAcaoOpen(false); }}>
                                                            <span style={{color:'#3b82f6'}}>Todos</span>
                                                        </li>
                                                        {filteredAcaoHeader.map(opt => (
                                                            <li key={opt.value} onClick={()=>{setSelectedAcao(opt.value);setAcaoSearchText('');setIsAcaoOpen(true)}}>
                                                                {opt.label}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="th-label" onClick={() => setIsAcaoOpen(true)} title="Filtrar">
                                                AÇÃO <span className="filter-icon">▼</span>
                                            </div>
                                        )}
                                    </div>
                                </th>

                                <th style={{width: '140px'}}>Entidade</th>
                                <th>Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="no-results" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>
                                        Nenhum registro encontrado.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map(row => (
                                    <tr key={row.id} className="selectable">
                                        <td className="cell-id">#{row.id}</td>
                                        <td style={{fontSize: '0.8rem', color:'#64748b'}}>
                                            {formatDate(row.created_at)}
                                        </td>
                                        <td>
                                            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                                <div style={{
                                                    width:'24px', height:'24px', backgroundColor:'#e2e8f0', 
                                                    borderRadius:'50%', display:'flex', alignItems:'center', 
                                                    justifyContent:'center', fontSize:'10px', fontWeight:'bold', color:'#475569'
                                                }}>
                                                    {(row.usuario_nome||'?').charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{fontWeight:500}}>{truncate(row.usuario_nome || 'Sistema', 15)}</span>
                                            </div>
                                        </td>
                                        <td style={{fontWeight: 600, color: '#334155'}}>
                                            {row.sistema_nome || 'Acesso'}
                                        </td>
                                        <td style={{textAlign: 'center'}}>
                                            <span className={`log-action-badge log-action-${row.acao}`}>
                                                {row.acao}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="log-entidade-badge">
                                                {row.entidade} <span style={{opacity:0.6}}>#{row.entidade_id}</span>
                                            </span>
                                        </td>
                                        <td style={{color: '#475569', fontSize: '0.85rem'}}>
                                            {truncate(row.detalhes, 60)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredLogs.length > 0 && (
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
    </main>
  );
}
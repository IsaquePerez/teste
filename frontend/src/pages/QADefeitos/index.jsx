import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext'; 
import { DefectModal } from '../../components/DefectModal'; 
import './styles.css';

export function QADefeitos() {
  const { user } = useAuth();
  const { error } = useSnackbar();

  // --- TRAVA DE SEGURANÇA VISUAL ---
  if (!user) {
      return <div className="loading-text" style={{marginTop: '50px'}}>Carregando sessão...</div>;
  }

  const isAdmin = user.role === 'admin';
  const isRunner = !isAdmin;

  // --- ESTADOS ---
  // Agora 'execucoes' armazena os grupos, não defeitos isolados
  const [execucoes, setExecucoes] = useState([]); 
  const [usuarios, setUsuarios] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState(null);
  
  // --- FILTROS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);
  
  const [statusSearchText, setStatusSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusHeaderRef = useRef(null);
  
  const [sevSearchText, setSevSearchText] = useState('');
  const [selectedSev, setSelectedSev] = useState('');
  const [isSevOpen, setIsSevOpen] = useState(false);
  const sevHeaderRef = useRef(null);
  
  const [respSearchText, setRespSearchText] = useState('');
  const [selectedResp, setSelectedResp] = useState('');
  const [isRespOpen, setIsRespOpen] = useState(false);
  const respHeaderRef = useRef(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const truncate = (str, n = 30) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  // --- HELPER DE AGRUPAMENTO ---
  const groupDefects = (defects) => {
    const groups = defects.reduce((acc, defect) => {
        const execId = defect.execucao_teste_id;
        if (!acc[execId]) {
            acc[execId] = {
                id: execId, // ID da Execução
                projeto_nome: defect.projeto_nome,
                caso_teste_nome: defect.caso_teste_nome,
                responsavel_teste_nome: defect.responsavel_teste_nome,
                responsavel_id: defect.responsavel_id,
                created_at: defect.created_at,
                // Array contendo todos os bugs desta execução
                defeitos: [] 
            };
        }
        acc[execId].defeitos.push(defect);
        return acc;
    }, {});
    
    // Converte objeto para array e ordena por data
    return Object.values(groups).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  // --- CARREGAMENTO DE DADOS ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [defResponse, userResponse] = await Promise.all([
          api.get('/defeitos/'), // Note a barra no final por precaução
          api.get('/usuarios/')
      ]);
      
      const rawDefects = Array.isArray(defResponse) ? defResponse : [];
      const grouped = groupDefects(rawDefects);
      
      setExecucoes(grouped);
      setUsuarios(Array.isArray(userResponse) ? userResponse : []);
    } catch (err) {
      error("Erro ao carregar dados.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- EVENT LISTENERS PARA FECHAR DROPDOWNS ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowSuggestions(false);
      if (statusHeaderRef.current && !statusHeaderRef.current.contains(event.target)) {
        if (!selectedStatus) { setIsStatusOpen(false); setStatusSearchText(''); }
      }
      if (sevHeaderRef.current && !sevHeaderRef.current.contains(event.target)) {
        if (!selectedSev) { setIsSevOpen(false); setSevSearchText(''); }
      }
      if (respHeaderRef.current && !respHeaderRef.current.contains(event.target)) {
        if (!selectedResp) { setIsRespOpen(false); setRespSearchText(''); }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedStatus, selectedSev, selectedResp]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedStatus, selectedSev, selectedResp]);

  // --- LÓGICA DE FILTRAGEM (Adaptada para Grupos) ---
  const filteredExecucoes = execucoes.filter(group => {
    // Filtro de Status: Verifica se ALGUM defeito do grupo tem o status selecionado
    if (selectedStatus) {
        const hasStatus = group.defeitos.some(d => d.status === selectedStatus);
        if (!hasStatus) return false;
    }

    // Filtro de Severidade: Verifica se ALGUM defeito do grupo tem a severidade selecionada
    if (selectedSev) {
        const hasSev = group.defeitos.some(d => d.severidade === selectedSev);
        if (!hasSev) return false;
    }

    // Filtro de Responsável
    if (selectedResp) {
        // Verifica pelo ID do responsável salvo no grupo ou no primeiro defeito
        const respId = group.responsavel_id || group.defeitos[0]?.responsavel_id;
        if (String(respId) !== String(selectedResp)) return false;
    }

    // Filtro de Texto (Busca Geral)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const proj = group.projeto_nome || '';
      const caso = group.caso_teste_nome || '';
      const resp = group.responsavel_teste_nome || '';
      const idStr = String(group.id);
      
      // Procura também nos títulos dos defeitos internos
      const hasDefectMatch = group.defeitos.some(d => d.titulo.toLowerCase().includes(term));

      if (
          !proj.toLowerCase().includes(term) && 
          !caso.toLowerCase().includes(term) && 
          !resp.toLowerCase().includes(term) && 
          !idStr.includes(term) &&
          !hasDefectMatch
      ) {
            return false;
      }
    }
    return true;
  });

  const totalPages = Math.ceil(filteredExecucoes.length / itemsPerPage);
  const currentItems = filteredExecucoes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginate = (n) => setCurrentPage(n);

  // Opções para os Dropdowns
  const statusOptions = [{label: 'Aberto', value: 'aberto'}, {label: 'Corrigido', value: 'corrigido'}, {label: 'Fechado', value: 'fechado'}];
  const filteredStatusHeader = statusOptions.filter(o => o.label.toLowerCase().includes(statusSearchText.toLowerCase()));
  
  const sevOptions = [{label: 'Crítico', value: 'critico'}, {label: 'Alto', value: 'alto'}, {label: 'Médio', value: 'medio'}, {label: 'Baixo', value: 'baixo'}];
  const filteredSevHeader = sevOptions.filter(o => o.label.toLowerCase().includes(sevSearchText.toLowerCase()));
  
  const filteredRespHeader = usuarios.filter(u => u.nome.toLowerCase().includes(respSearchText.toLowerCase())).slice(0, 5);

  // --- HELPERS DE RENDERIZAÇÃO ---
  // Define a severidade mais alta do grupo para exibir o badge
  const getGroupSeverity = (defects) => {
      if (defects.some(d => d.severidade === 'critico')) return 'critico';
      if (defects.some(d => d.severidade === 'alto')) return 'alto';
      if (defects.some(d => d.severidade === 'medio')) return 'medio';
      return 'baixo';
  };

  const getSeveridadeBadge = (s) => `badge-sev-${s}`;

  const handleRowClick = (group) => setSelectedExecution(group);
  
  const handleCloseModal = (refreshNeeded) => {
      setSelectedExecution(null);
      if (refreshNeeded === true) {
          loadData();
      }
  };

  return (
    <main className="container">
      
      {/* Modal agora recebe o GRUPO inteiro */}
      {selectedExecution && (
        <DefectModal 
          executionGroup={selectedExecution} // <--- MUDANÇA IMPORTANTE: Passamos o grupo
          onClose={handleCloseModal}
        />
      )}

      <section className="card" style={{ marginTop: 0 }}>
        <div className="toolbar">
          <h3 className="page-title">{isRunner ? "Meus Reportes" : "Gestão de Falhas"}</h3>
          <div className="toolbar-actions">
            <div ref={wrapperRef} className="search-wrapper" style={{width: '300px'}}>
                <input type="text" placeholder="Buscar projeto, caso ou runner..." className="search-input" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} />
                <span className="search-icon">🔍</span>
            </div>
          </div>
        </div>

        {loading ? <div className="loading-text">Carregando...</div> : (
            <div className="table-wrap">
                <div className="content-area">
                    <table>
                        <thead>
                            <tr>
                                <th style={{width: '60px'}}>ID Exec</th>
                                <th style={{width: '30%'}}>Projeto / Caso de Teste</th>
                                <th style={{width: '20%'}}>Runner</th>
                                
                                {/* COLUNA DE RESUMO DE DEFEITOS */}
                                <th style={{width: '20%', textAlign: 'center'}}>
                                    Falhas Reportadas
                                </th>

                                <th style={{width: '15%', textAlign: 'center', verticalAlign: 'middle'}}>
                                    <div className="th-filter-container" ref={sevHeaderRef} style={{justifyContent: 'center'}}>
                                        {isSevOpen || selectedSev ? (
                                            <div style={{position: 'relative', width: '100%'}}>
                                                <input autoFocus type="text" className={`th-search-input ${selectedSev ? 'active' : ''}`} placeholder="Sev..." value={selectedSev && sevSearchText === '' ? selectedSev : sevSearchText} onChange={(e) => { setSevSearchText(e.target.value); if(selectedSev) setSelectedSev(''); }} onClick={(e) => e.stopPropagation()} />
                                                <button className="btn-clear-filter" onClick={(e) => { e.stopPropagation(); if(selectedSev){setSelectedSev('');setSevSearchText('')}else{setIsSevOpen(false);setSevSearchText('')} }}>✕</button>
                                                {(!selectedSev || sevSearchText) && <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}><li onClick={() => { setSelectedSev(''); setSevSearchText(''); setIsSevOpen(false); }}><span style={{color:'#3b82f6'}}>Todas</span></li>{filteredSevHeader.map(o=><li key={o.value} onClick={()=>{setSelectedSev(o.value);setSevSearchText('');setIsSevOpen(true)}}>{o.label}</li>)}</ul>}
                                            </div>
                                        ) : <div className="th-label" onClick={() => setIsSevOpen(true)} title="Filtrar">SEVERIDADE MÁX. <span className="filter-icon">▼</span></div>}
                                    </div>
                                </th>

                                <th style={{width: '10%', textAlign: 'right'}}>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExecucoes.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="no-results" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>
                                        Nenhuma falha encontrada.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map(group => (
                                    <tr key={group.id} onClick={() => handleRowClick(group)} className="selectable-row" title="Clique para gerenciar falhas">
                                        <td className="cell-id">#{group.id}</td>
                                        <td>
                                            <div className="cell-name">{truncate(group.projeto_nome, 25)}</div>
                                            <div style={{fontSize: '0.8rem', color: '#64748b'}}>{truncate(group.caso_teste_nome, 40)}</div>
                                        </td>
                                        <td><span className="cell-resp">{truncate(group.responsavel_teste_nome, 20)}</span></td>
                                        
                                        {/* Badge de Contagem */}
                                        <td style={{textAlign: 'center'}}>
                                            <span style={{
                                                backgroundColor: '#fee2e2', 
                                                color: '#991b1b', 
                                                padding: '4px 12px', 
                                                borderRadius: '20px', 
                                                fontSize: '0.8rem', 
                                                fontWeight: '700'
                                            }}>
                                                {group.defeitos.length} Defeito(s)
                                            </span>
                                        </td>

                                        {/* Badge da Pior Severidade */}
                                        <td style={{textAlign: 'center'}}>
                                            <span className={`badge ${getSeveridadeBadge(getGroupSeverity(group.defeitos))}`}>
                                                {getGroupSeverity(group.defeitos).toUpperCase()}
                                            </span>
                                        </td>

                                        <td style={{textAlign: 'right', fontSize: '0.85rem'}}>
                                            {new Date(group.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredExecucoes.length > 0 && (
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
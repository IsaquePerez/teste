import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Trash } from '../../components/icons/Trash';
import { Search } from '../../components/icons/Search';
import './styles.css';

// --- COMPONENTE REUTILIZÁVEL: SEARCHABLE SELECT ---
const SearchableSelect = ({ options = [], value, onChange, placeholder, disabled, labelKey = 'nome', maxLen = 25 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const truncate = (str, n) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  useEffect(() => {
    if (!Array.isArray(options)) return;

    if (value === null || value === undefined || value === '') {
      if (!(value === '' && searchTerm !== '')) {
        setSearchTerm('');
      }
    }

    const selectedOption = options.find(opt => String(opt.id) === String(value));
    
    if (selectedOption) {
      if (!isOpen || searchTerm === '') {
        setSearchTerm(selectedOption[labelKey]);
      }
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
      <span className="search-icon" style={{ cursor: disabled ? 'not-allowed' : 'pointer', right: '10px', position: 'absolute', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }} onClick={() => !disabled && setIsOpen(!isOpen)}>▼</span>
      
      {isOpen && !disabled && (
        <ul className="custom-dropdown" style={{ width: '100%', top: '100%', zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
          {displayOptions.length === 0 ? (
            <li style={{ color: '#999', cursor: 'default', padding: '10px' }}>
                {searchTerm ? 'Sem resultados' : 'Digite para buscar...'}
            </li>
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

// --- COMPONENTE PRINCIPAL ---
export function AdminCasosTeste() {
  const [projetos, setProjetos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [usuarios, setUsuarios] = useState([]); 
  const [casos, setCasos] = useState([]);
  
  const { success, error, warning, info } = useSnackbar();
  const [selectedProjeto, setSelectedProjeto] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [casoToDelete, setCasoToDelete] = useState(null);

  // --- FILTROS GLOBAIS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  // --- FILTROS DE HEADER ---
  const [prioSearchText, setPrioSearchText] = useState('');
  const [selectedPrio, setSelectedPrio] = useState('');
  const [isPrioOpen, setIsPrioOpen] = useState(false);
  const prioHeaderRef = useRef(null);

  const [cicloSearchText, setCicloSearchText] = useState('');
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [isCicloOpen, setIsCicloOpen] = useState(false);
  const cicloHeaderRef = useRef(null);

  const [respSearchText, setRespSearchText] = useState('');
  const [selectedResp, setSelectedResp] = useState('');
  const [isRespOpen, setIsRespOpen] = useState(false);
  const respHeaderRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [form, setForm] = useState({
    nome: '', descricao: '', pre_condicoes: '', criterios_aceitacao: '', status: 'ativo',
    prioridade: 'media', responsavel_id: '', ciclo_id: '', projeto_id: '',
    passos: [{ ordem: 1, acao: '', resultado_esperado: '' }]
  });

  const truncate = (str, n = 30) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowSuggestions(false);
      
      if (prioHeaderRef.current && !prioHeaderRef.current.contains(event.target)) {
        if (!selectedPrio) { setIsPrioOpen(false); setPrioSearchText(''); }
      }
      if (cicloHeaderRef.current && !cicloHeaderRef.current.contains(event.target)) {
        if (!selectedCiclo) { setIsCicloOpen(false); setCicloSearchText(''); }
      }
      if (respHeaderRef.current && !respHeaderRef.current.contains(event.target)) {
        if (!selectedResp) { setIsRespOpen(false); setRespSearchText(''); }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedPrio, selectedCiclo, selectedResp]);

  useEffect(() => {
    const loadBasics = async () => {
      try {
        const [projData, userData] = await Promise.all([api.get("/projetos"), api.get("/usuarios/")]);
        setProjetos(Array.isArray(projData) ? projData : []); 
        setUsuarios(Array.isArray(userData) ? userData : []);
        
        const ativos = (Array.isArray(projData) ? projData : []).filter(p => p.status === 'ativo');
        if (ativos.length > 0) setSelectedProjeto(ativos[0].id);
      } catch (e) { error("Erro ao carregar dados iniciais."); }
    };
    loadBasics();
  }, []);

  useEffect(() => { 
      if (selectedProjeto) {
          loadDadosProjeto(selectedProjeto);
      } else {
          setCasos([]); 
          setCiclos([]);
      }
  }, [selectedProjeto]);
  
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedPrio, selectedCiclo, selectedResp]);

  // Função auxiliar para buscar ciclos de um projeto específico
  const fetchCiclos = async (projId) => {
    if (!projId) {
        setCiclos([]);
        return;
    }
    try {
        const response = await api.get(`/testes/projetos/${projId}/ciclos`);
        setCiclos(Array.isArray(response) ? response : []);
    } catch (err) {
        console.error("Erro ao buscar ciclos", err);
        setCiclos([]);
    }
  };

  const loadDadosProjeto = async (projId) => {
    setLoading(true);
    try {
      const casosData = await api.get(`/testes/projetos/${projId}/casos`);
      // Carrega os ciclos também para garantir que o filtro funcione
      await fetchCiclos(projId);
      setCasos(Array.isArray(casosData) ? casosData : []);
    } catch (err) { error("Erro ao carregar casos e ciclos."); } finally { setLoading(false); }
  };

  const filteredCasos = casos.filter(c => {
      const cCicloId = c.ciclo_id || (c.ciclo ? c.ciclo.id : null);
      if (selectedPrio && c.prioridade !== selectedPrio) return false;
      if (selectedCiclo && String(cCicloId) != String(selectedCiclo)) return false; 
      if (selectedResp && String(c.responsavel_id) != String(selectedResp)) return false;
      if (searchTerm && !c.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
  });

  const globalSuggestions = searchTerm === '' ? filteredCasos.slice(0, 5) : filteredCasos.slice(0, 5);
  
  const prioOptions = [{label:'Alta', value:'alta'}, {label:'Média', value:'media'}, {label:'Baixa', value:'baixa'}];
  const filteredPrioHeader = prioOptions.filter(o => o.label.toLowerCase().includes(prioSearchText.toLowerCase()));

  const filteredCicloHeader = ciclos.filter(c => c.nome.toLowerCase().includes(cicloSearchText.toLowerCase())).slice(0, 5);
  const filteredRespHeader = usuarios.filter(u => u.nome.toLowerCase().includes(respSearchText.toLowerCase())).slice(0, 5);

  const getRespName = (id) => {
      const u = usuarios.find(user => String(user.id) == String(id));
      return u ? u.nome : '-';
  };
  
  const getCicloName = (caso) => {
      if (!caso) return '-';
      if (caso.ciclo && caso.ciclo.nome) return caso.ciclo.nome;
      const idBusca = caso.ciclo_id || caso.cicloId;
      if (!idBusca) return '-'; 
      const found = ciclos.find(c => String(c.id) == String(idBusca));
      return found ? found.nome : '-';
  };

  const getCicloNameById = (id) => {
      const found = ciclos.find(c => String(c.id) == String(id));
      return found ? found.nome : '-';
  };

  const currentProject = projetos.find(p => String(p.id) == String(selectedProjeto));
  const isProjectActive = currentProject?.status === 'ativo';

  const handleReset = () => {
    // Reset volta para a listagem e limpa o form, mas mantém o contexto do projeto selecionado na lista
    setForm({ nome: '', descricao: '', pre_condicoes: '', criterios_aceitacao: '', status: 'ativo', prioridade: 'media', responsavel_id: '', ciclo_id: '', projeto_id: '', passos: [{ ordem: 1, acao: '', resultado_esperado: '' }] });
    setEditingId(null); setSearchTerm(''); setView('list');
    // Garante que os ciclos carregados sejam do projeto selecionado na lista
    if (selectedProjeto) fetchCiclos(selectedProjeto);
  };

  const handleNew = async () => { 
    if (!isProjectActive) return warning(`Projeto Inativo.`); 
    
    // Preenche o formulário com o projeto selecionado na listagem
    setForm({ 
        nome: '', descricao: '', pre_condicoes: '', criterios_aceitacao: '', status: 'ativo', 
        prioridade: 'media', responsavel_id: '', 
        ciclo_id: '', // Ciclo começa vazio
        projeto_id: selectedProjeto, // <--- PREENCHE AUTOMATICAMENTE
        passos: [{ ordem: 1, acao: '', resultado_esperado: '' }] 
    });
    
    // Garante que os ciclos disponíveis sejam deste projeto
    if (selectedProjeto) {
        await fetchCiclos(selectedProjeto);
    }
    
    setView('form'); 
  };

  // --- NOVA FUNÇÃO: Trata a mudança de projeto DENTRO do formulário ---
  const handleFormProjectChange = async (newProjectId) => {
    // 1. Atualiza o ID do projeto no form
    // 2. Limpa o Ciclo (pois o ciclo antigo não pertence ao novo projeto)
    setForm(prev => ({
        ...prev,
        projeto_id: newProjectId,
        ciclo_id: '' 
    }));

    // 3. Busca os ciclos do novo projeto para popular o dropdown
    await fetchCiclos(newProjectId);
  };

  const handleEdit = async (caso) => {
    let cicloIdValue = '';
    if (caso.ciclo_id !== null && caso.ciclo_id !== undefined) {
        cicloIdValue = caso.ciclo_id;
    } else if (caso.ciclo && caso.ciclo.id) {
        cicloIdValue = caso.ciclo.id;
    }

    let respIdValue = '';
    if (caso.responsavel_id !== null && caso.responsavel_id !== undefined) {
        respIdValue = caso.responsavel_id;
    } else if (caso.responsavel && caso.responsavel.id) {
        respIdValue = caso.responsavel.id;
    }

    setForm({
      nome: caso.nome, 
      descricao: caso.descricao || '', 
      pre_condicoes: caso.pre_condicoes || '', 
      criterios_aceitacao: caso.criterios_aceitacao || '',
      prioridade: caso.prioridade || 'media', 
      status: caso.status || 'ativo', 
      responsavel_id: respIdValue, 
      ciclo_id: cicloIdValue, 
      projeto_id: caso.projeto_id, // Garante que o ID do projeto venha do caso
      passos: caso.passos && caso.passos.length > 0 
        ? caso.passos.map(p => ({...p})) 
        : [{ ordem: 1, acao: '', resultado_esperado: '' }]
    });
    
    // Busca ciclos do projeto DESTE caso específico (pode ser diferente do selecionado na lista)
    if (caso.projeto_id) {
        await fetchCiclos(caso.projeto_id);
    }

    setEditingId(caso.id); 
    setView('form');
  };

  const addStep = () => { setForm(prev => ({ ...prev, passos: [...prev.passos, { ordem: prev.passos.length + 1, acao: '', resultado_esperado: '' }] })); };
  const removeStep = (index) => { if (form.passos.length === 1) return info("Mínimo 1 passo."); const newPassos = form.passos.filter((_, i) => i !== index).map((p, i) => ({ ...p, ordem: i + 1 })); setForm(prev => ({ ...prev, passos: newPassos })); };
  const updateStep = (index, field, value) => { const newPassos = [...form.passos]; newPassos[index][field] = value; setForm(prev => ({ ...prev, passos: newPassos })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Usa form.projeto_id em vez de selectedProjeto, para respeitar a escolha do usuário no form
    if (!form.projeto_id) return error("Selecione um projeto.");
    if (!form.nome.trim()) return warning("Título obrigatório.");
    
    const passosValidos = form.passos.filter(p => p.acao && p.acao.trim() !== '');
    if (passosValidos.length === 0) return warning("Preencha ao menos um passo.");

    const payload = { 
        ...form, 
        projeto_id: parseInt(form.projeto_id), 
        responsavel_id: form.responsavel_id ? parseInt(form.responsavel_id) : null, 
        ciclo_id: form.ciclo_id ? parseInt(form.ciclo_id) : null, 
        passos: passosValidos 
    };
    
    try {
      if (editingId) { await api.put(`/testes/casos/${editingId}`, payload); success("Atualizado!"); } 
      else { await api.post(`/testes/projetos/${form.projeto_id}/casos`, payload); success("Salvo!"); }
      
      handleReset(); 
      // Recarrega a lista baseada no filtro principal
      if (selectedProjeto) loadDadosProjeto(selectedProjeto);
    } catch (err) { 
        const msg = err.response?.data?.detail || "Erro ao salvar.";
        error(typeof msg === 'string' ? msg : "Erro de validação."); 
    }
  };

  const handleDelete = async () => { if (!casoToDelete) return; try { await api.delete(`/testes/casos/${casoToDelete.id}`); success("Excluído."); loadDadosProjeto(selectedProjeto); } catch (e) { error("Erro ao excluir."); } finally { setIsDeleteModalOpen(false); setCasoToDelete(null); } };
  
  const handleImportarModelo = (casoId) => { 
      const casoOrigem = casos.find(c => c.id === casoId); 
      if (casoOrigem) { 
          setForm(prev => ({ 
              ...prev, 
              nome: `${casoOrigem.nome}`, 
              descricao: casoOrigem.descricao||'', 
              pre_condicoes: casoOrigem.pre_condicoes||'', 
              criterios_aceitacao: casoOrigem.criterios_aceitacao||'', 
              prioridade: casoOrigem.prioridade, 
              passos: casoOrigem.passos?.length > 0 ? casoOrigem.passos.map((p, i) => ({ ordem: i + 1, acao: p.acao, resultado_esperado: p.resultado_esperado })) : [{ ordem: 1, acao: '', resultado_esperado: '' }] 
          })); 
          setSearchTerm(''); 
          success("Importado!"); 
      } 
  };

  const totalPages = Math.ceil(filteredCasos.length / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  const currentCasos = filteredCasos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginate = (n) => setCurrentPage(n);


  const usersFormatted = usuarios.map(u => ({ ...u, labelCompleto: `${u.nome} ${u.username ? `(@${u.username})` : ''}` }));
  const testers = usersFormatted.filter(u => u.nivel_acesso_id === 2 && u.ativo);

  const isFormInvalid =  !String(form.ciclo_id).trim() || !String(form.responsavel_id).trim() || !form.nome.trim() || !form.pre_condicoes.trim() || !form.criterios_aceitacao.trim() || !form.prioridade.trim();

  return (
    <main className="container">
      <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDelete} title="Excluir Caso de Teste?" message={`Tem certeza que deseja excluir "${casoToDelete?.nome}"?`} isDanger={true} />

      {view === 'form' && (
        <div style={{maxWidth: '100%', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            <section className="card form-section">
              <div className="form-header">
                <h3 className="form-title">{editingId ? 'Editar' : 'Novo'}</h3>
                {!editingId && (
                    <div ref={wrapperRef} className="search-wrapper" style={{ marginLeft: 'auto', width: '300px' }}>
                        <input type="text" placeholder="Buscar modelo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowSuggestions(true)} className="search-input" />
                        <span className="search-icon"><Search /></span>
                        {showSuggestions && <ul className="custom-dropdown">{globalSuggestions.length === 0 ? <li style={{color:'#999'}}>Sem resultados.</li> : globalSuggestions.map(c => (<li key={c.id} onClick={() => { handleImportarModelo(c.id); setShowSuggestions(false); }}><div style={{fontWeight:600}}>{truncate(c.nome, 20)}</div></li>))}</ul>}
                    </div>
                )}
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div className="form-grid">
                      <div>
                        <label className="input-label">Projeto *</label>
                        {/* USO DA NOVA FUNÇÃO DE MUDANÇA DE PROJETO */}
                        <SearchableSelect 
                            options={projetos.filter(p => p.status === 'ativo')} 
                            value={form.projeto_id} 
                            onChange={handleFormProjectChange} 
                            placeholder="Selecione..." 
                            disabled={!!editingId} // Bloqueia edição de projeto na edição de caso
                        />
                      </div>
                      <div><label className="input-label"><b>Título</b></label><input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="form-control" /></div>
                  </div>
                  
                  <div className="form-grid">
                      <div>
                        <label>Prioridade</label>
                        <select value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})} className="form-control bg-gray">
                            <option value="alta">Alta</option>
                            <option value="media">Média</option>
                            <option value="baixa">Baixa</option>
                        </select>
                      </div>
                      
                      <div>
                          <label>Status da Documentação</label>
                          <select 
                            value={form.status} 
                            onChange={e => setForm({...form, status: e.target.value})} 
                            className="form-control"
                            style={{ 
                                borderColor: form.status === 'ativo' ? '#10b981' : form.status === 'obsoleto' ? '#ef4444' : '#f59e0b' 
                            }}
                          >
                              <option value="rascunho">Rascunho</option>
                              <option value="ativo">Ativo</option>
                              <option value="revisao">Em Revisão</option>
                              <option value="obsoleto">Obsoleto</option>
                          </select>
                      </div>
                  </div>
                  
                  <div className="form-grid">
                      <div><label>Pré-condições</label><input value={form.pre_condicoes} onChange={e => setForm({...form, pre_condicoes: e.target.value})} className="form-control" /></div>
                      <div><label>Objetivo</label><input value={form.criterios_aceitacao} onChange={e => setForm({...form, criterios_aceitacao: e.target.value})} className="form-control" /></div>
                  </div>
              </div>
            </section>
            <section className="card form-section">
              <h3 className="section-subtitle">Alocação</h3>
              <div className="form-grid">
                  <div>
                      <label><b>Ciclo</b></label>
                      <SearchableSelect 
                          options={ciclos} 
                          value={form.ciclo_id} 
                          onChange={(val) => setForm({ ...form, ciclo_id: val })} 
                          placeholder="Selecione o ciclo..." 
                      />
                  </div>
                  <div>
                      <label><b>Responsável</b></label>
                      <SearchableSelect 
                          options={testers} 
                          value={form.responsavel_id} 
                          onChange={(val) => setForm({ ...form, responsavel_id: val })} 
                          placeholder="Selecione o responsável..."
                          labelKey="labelCompleto"
                      />
                  </div>
              </div>
            </section>
            <section className="card">
               <div className="steps-header-row"><h3 className="section-subtitle" style={{marginBottom: 0}}>Passos</h3><button type="button" onClick={addStep} className="btn btn-add-step">+ Passo</button></div>
               <div className="steps-container">
                 {form.passos.map((passo, idx) => (
                   <div key={idx} className="step-row"><div className="step-index">{idx + 1}</div><input placeholder="Ação" value={passo.acao} onChange={e => updateStep(idx, 'acao', e.target.value)} className="form-control small-text" /><input placeholder="Resultado Esperado" value={passo.resultado_esperado} onChange={e => updateStep(idx, 'resultado_esperado', e.target.value)} className="form-control small-text" /><button type="button" onClick={() => removeStep(idx)} className="btn danger small btn-remove-step">✕</button></div>
                 ))}
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
               <h3 className="page-title">Casos de Teste</h3>
               <div className="toolbar-actions">
                   <div className="filter-group">
                        <span className="filter-label">PROJETO:</span>
                        <div style={{width: '200px'}}>
                            <SearchableSelect 
                                options={projetos.filter(p => p.status === 'ativo')}
                                value={selectedProjeto}
                                onChange={(val) => setSelectedProjeto(val)}
                                placeholder="Filtrar Projeto..."
                                maxLen={15}
                            />
                        </div>
                   </div>
                   <button onClick={handleNew} className="btn primary btn-new" disabled={!isProjectActive} style={{opacity: isProjectActive ? 1 : 0.5, cursor: isProjectActive ? 'pointer' : 'not-allowed'}}>Novo Cenário</button>
                   <div className="separator"></div>
                   <div ref={wrapperRef} className="search-wrapper">
                       <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowSuggestions(true)} className="search-input" />
                       <span className="search-icon"><Search /></span>
                       {showSuggestions && <ul className="custom-dropdown">{globalSuggestions.length===0 ? <li style={{color:'#999'}}>Sem resultados.</li> : globalSuggestions.map(c => (<li key={c.id} onClick={() => { setSearchTerm(c.nome); setShowSuggestions(false); }}><div style={{display:'flex',justifyContent:'space-between'}}><span>{truncate(c.nome, 20)}</span><span style={{fontSize:'0.75rem',color:'#9ca3af',fontStyle:'italic'}}></span></div></li>))}</ul>}
                   </div>
               </div>
           </div>

           {loading ? <div className="loading-text">Carregando...</div> : (
             <div className="table-wrap">
               <div className="content-area">
                   <table>
                       <thead>
                         <tr>
                           <th style={{width: '50px'}}>ID</th>
                           <th style={{width: '25%'}}>Cenário</th>
                           <th style={{width: '10%', textAlign: 'center'}}>Status</th>
                           <th style={{width: '10%', textAlign: 'center', verticalAlign: 'middle'}}>
                                <div className="th-filter-container" ref={prioHeaderRef} style={{justifyContent: 'center'}}>
                                    {isPrioOpen || selectedPrio ? (
                                        <div style={{position: 'relative', width: '100%'}}>
                                            <input autoFocus type="text" className={`th-search-input ${selectedPrio ? 'active' : ''}`} placeholder="Prio..." value={selectedPrio && prioSearchText === '' ? selectedPrio : prioSearchText} onChange={(e) => { setPrioSearchText(e.target.value); if(selectedPrio) setSelectedPrio(''); }} onClick={(e) => e.stopPropagation()} />
                                            <button className="btn-clear-filter" onClick={(e) => { e.stopPropagation(); if(selectedPrio){setSelectedPrio('');setPrioSearchText('')}else{setIsPrioOpen(false);setPrioSearchText('')} }}>✕</button>
                                            {(!selectedPrio || prioSearchText) && <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}><li onClick={() => { setSelectedPrio(''); setPrioSearchText(''); setIsPrioOpen(false); }}><span style={{color:'#3b82f6'}}>Todos</span></li>{filteredPrioHeader.map(o=><li key={o.value} onClick={()=>{setSelectedPrio(o.value);setPrioSearchText('');setIsPrioOpen(true)}}>{o.label}</li>)}</ul>}
                                        </div>
                                    ) : <div className="th-label" onClick={() => setIsPrioOpen(true)} title="Filtrar">PRIORIDADE <span className="filter-icon">▼</span></div>}
                                </div>
                           </th>

                           <th style={{width: '15%', verticalAlign: 'middle'}}>
                                <div className="th-filter-container" ref={cicloHeaderRef}>
                                    {isCicloOpen || selectedCiclo ? (
                                        <div style={{position: 'relative', width: '100%'}}>
                                            <input autoFocus type="text" className={`th-search-input ${selectedCiclo ? 'active' : ''}`} placeholder="Ciclo..." value={selectedCiclo && cicloSearchText === '' ? truncate(getCicloNameById(selectedCiclo), 15) : cicloSearchText} onChange={(e) => { setCicloSearchText(e.target.value); if(selectedCiclo) setSelectedCiclo(''); }} onClick={(e) => e.stopPropagation()} />
                                            <button className="btn-clear-filter" onClick={(e) => { e.stopPropagation(); if(selectedCiclo){setSelectedCiclo('');setCicloSearchText('')}else{setIsCicloOpen(false);setCicloSearchText('')} }}>✕</button>
                                            {(!selectedCiclo || cicloSearchText) && <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}><li onClick={() => { setSelectedCiclo(''); setCicloSearchText(''); setIsCicloOpen(false); }}><span style={{color:'#3b82f6'}}>Todos</span></li>{filteredCicloHeader.map(c=><li key={c.id} onClick={()=>{setSelectedCiclo(String(c.id));setCicloSearchText('');setIsCicloOpen(true)}}>{truncate(c.nome,20)}</li>)}</ul>}
                                        </div>
                                    ) : <div className="th-label" onClick={() => setIsCicloOpen(true)} title="Filtrar">CICLO <span className="filter-icon">▼</span></div>}
                                </div>
                           </th>

                           <th style={{width: '15%', verticalAlign: 'middle'}}>
                                <div className="th-filter-container" ref={respHeaderRef}>
                                    {isRespOpen || selectedResp ? (
                                        <div style={{position: 'relative', width: '100%'}}>
                                            <input autoFocus type="text" className={`th-search-input ${selectedResp ? 'active' : ''}`} placeholder="Resp..." value={selectedResp && respSearchText === '' ? truncate(getRespName(parseInt(selectedResp)), 15) : respSearchText} onChange={(e) => { setRespSearchText(e.target.value); if(selectedResp) setSelectedResp(''); }} onClick={(e) => e.stopPropagation()} />
                                            <button className="btn-clear-filter" onClick={(e) => { e.stopPropagation(); if(selectedResp){setSelectedResp('');setRespSearchText('')}else{setIsRespOpen(false);setRespSearchText('')} }}>✕</button>
                                            {(!selectedResp || respSearchText) && <ul className="custom-dropdown" style={{width: '100%', top: '32px', left: 0}}><li onClick={() => { setSelectedResp(''); setRespSearchText(''); setIsRespOpen(false); }}><span style={{color:'#3b82f6'}}>Todos</span></li>{filteredRespHeader.map(u=><li key={u.id} onClick={()=>{setSelectedResp(String(u.id));setRespSearchText('');setIsRespOpen(true)}}>{truncate(u.nome,20)}</li>)}</ul>}
                                        </div>
                                    ) : <div className="th-label" onClick={() => setIsRespOpen(true)} title="Filtrar">RESPONSÁVEL <span className="filter-icon">▼</span></div>}
                                </div>
                           </th>

                           <th style={{width: '10%', textAlign: 'center'}}>Passos</th>
                           <th style={{width: '10%', textAlign: 'right'}}>Ações</th>
                         </tr>
                       </thead>
                       <tbody> 
                         {filteredCasos.length === 0 ? (
                           <tr>
                               <td colSpan="8" className="no-results" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>
                                   {!selectedProjeto ? <span>Selecione um projeto para visualizar os casos de teste.</span> : <span>Nenhum caso encontrado neste projeto.</span>}
                               </td>
                           </tr>
                         ) : (
                           currentCasos.map(c => (
                            <tr key={c.id} className="selectable" onClick={() => handleEdit(c)}>
                                <td className="cell-id">#{c.id}</td>
                                <td><div className="cell-name" title={c.nome}>{truncate(c.nome, 30)}</div></td>
                                <td style={{textAlign: 'center'}}>
                                    <span className={`badge status-${c.status || 'rascunho'}`}>
                                        {c.status ? c.status.toUpperCase() : 'RASCUNHO'}
                                    </span>
                                </td>
                                <td className="cell-priority" style={{textAlign: 'center'}}><span className={`badge priority-badge ${c.prioridade}`}>{c.prioridade?.toUpperCase()}</span></td>
                                <td style={{color: '#64748b'}}>{truncate(getCicloName(c), 20)}</td>
                                <td><span className="cell-resp">{c.responsavel_id ? truncate(getRespName(c.responsavel_id), 20) : '-'}</span></td>
                                <td className="cell-steps" style={{textAlign: 'center'}}>{c.passos?.length || 0}</td>
                                <td className="cell-actions"><button onClick={(e) => { e.stopPropagation(); setCasoToDelete(c); setIsDeleteModalOpen(true); }} className="btn danger small btn-action-icon"><Trash /></button></td>
                            </tr>
                           ))
                         )}
                       </tbody>
                     </table>
               </div>
               {filteredCasos.length > 0 && <div className="pagination-container"><button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn nav-btn">‹</button>{Array.from({length: totalPages}, (_, i) => (<button key={i+1} onClick={() => paginate(i+1)} className={`pagination-btn ${currentPage === i+1 ? 'active' : ''}`}>{i+1}</button>)).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}<button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-btn nav-btn">›</button></div>}
             </div>
           )}
        </section>
      )}
    </main>
  );
}
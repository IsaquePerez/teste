import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import './styles.css';


const SearchableSelect = ({ options, value, onChange, placeholder, disabled, labelKey = 'nome' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

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
        style={{ cursor: disabled ? 'not-allowed' : 'text' }}
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
          {filteredOptions.length === 0 ? (
            <li style={{ color: '#999', cursor: 'default', padding: '10px' }}>Sem resultados</li>
          ) : (
            filteredOptions.map(opt => (
              <li key={opt.id} onClick={() => handleSelect(opt)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>{opt[labelKey]}</span>
                  {opt.status && (
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '8px', fontStyle: 'italic' }}>
                      ({opt.status})
                    </span>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

// Componente Principal
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

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    pre_condicoes: '',
    criterios_aceitacao: '',
    prioridade: 'media',
    responsavel_id: '',
    ciclo_id: '',
    passos: [{ ordem: 1, acao: '', resultado_esperado: '' }]
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const truncate = (str, n = 30) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';
  
  useEffect(() => {
    const loadBasics = async () => {
      try {
        const [projData, userData] = await Promise.all([
          api.get("/projetos"),
          api.get("/usuarios/") 
        ]);
        setProjetos(projData || []);
        setUsuarios(userData || []);
        
        const ativos = (projData || []).filter(p => p.status === 'ativo');
        if (ativos.length > 0) {
          setSelectedProjeto(ativos[0].id);
        }
      } catch (e) {
        error("Erro ao carregar dados básicos.");
      }
    };
    loadBasics();
  }, []);

  useEffect(() => {
    if (selectedProjeto) loadDadosProjeto(selectedProjeto);
  }, [selectedProjeto]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const loadDadosProjeto = async (projId) => {
    setLoading(true);
    try {
      const [casosData, ciclosData] = await Promise.all([
        api.get(`/testes/projetos/${projId}/casos`),
        api.get(`/testes/projetos/${projId}/ciclos`)
      ]);
      setCasos(Array.isArray(casosData) ? casosData : []);
      setCiclos(Array.isArray(ciclosData) ? ciclosData : []);
    } catch (err) {
      error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCasos = casos.filter(c => 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.prioridade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const opcoesParaMostrar = searchTerm === '' 
    ? [...casos].sort((a, b) => b.id - a.id).slice(0, 5) 
    : filteredCasos.slice(0, 5);

  const totalPages = Math.ceil(filteredCasos.length / itemsPerPage);
  
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCasos = filteredCasos.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getPaginationGroup = () => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
        start = Math.max(1, end - maxButtons + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    return pages;
  };

  const currentProject = projetos.find(p => p.id == selectedProjeto);
  const isProjectActive = currentProject?.status === 'ativo';

  const handleReset = () => {
    setForm({
      nome: '', descricao: '', pre_condicoes: '', criterios_aceitacao: '',
      prioridade: 'media', responsavel_id: '', ciclo_id: '',
      passos: [{ ordem: 1, acao: '', resultado_esperado: '' }]
    });
    setEditingId(null);
    setSearchTerm('');
    setView('list');
  };

  const handleNew = () => {
    if (!isProjectActive) return warning(`Projeto ${currentProject?.status?.toUpperCase() || 'Inativo'}. Criação bloqueada.`);
    handleReset();
    setView('form');
  };

  const handleEdit = (caso) => {
    setForm({
      nome: caso.nome,
      descricao: caso.descricao || '',
      pre_condicoes: caso.pre_condicoes || '',
      criterios_aceitacao: caso.criterios_aceitacao || '',
      prioridade: caso.prioridade,
      responsavel_id: caso.responsavel_id || '',
      ciclo_id: '',
      passos: caso.passos && caso.passos.length > 0 ? caso.passos.map(p => ({...p})) : [{ ordem: 1, acao: '', resultado_esperado: '' }]
    });
    setEditingId(caso.id);
    setView('form');
  };

  const addStep = () => {
    setForm(prev => ({
      ...prev,
      passos: [...prev.passos, { ordem: prev.passos.length + 1, acao: '', resultado_esperado: '' }]
    }));
  };

  const removeStep = (index) => {
    if (form.passos.length === 1) return info("O teste precisa de pelo menos 1 passo.");
    const newPassos = form.passos.filter((_, i) => i !== index).map((p, i) => ({ ...p, ordem: i + 1 }));
    setForm(prev => ({ ...prev, passos: newPassos }));
  };

  const updateStep = (index, field, value) => {
    const newPassos = [...form.passos];
    newPassos[index][field] = value;
    setForm(prev => ({ ...prev, passos: newPassos }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjeto) return error("Selecione um projeto.");
    if (!form.nome.trim()) return warning("Título obrigatório.");
    
    const passosValidos = form.passos.filter(p => p.acao && p.acao.trim() !== '');
    if (passosValidos.length === 0) return warning("Preencha ao menos um passo.");

    const payload = {
        ...form,
        projeto_id: parseInt(selectedProjeto),
        responsavel_id: form.responsavel_id ? parseInt(form.responsavel_id) : null,
        ciclo_id: form.ciclo_id ? parseInt(form.ciclo_id) : null,
        passos: passosValidos
    };

    try {
      if (editingId) {
        await api.put(`/testes/casos/${editingId}`, payload);
        success("Cenário atualizado!");
      } else {
        await api.post(`/testes/projetos/${selectedProjeto}/casos`, payload);
        success("Cenário salvo!");
      }
      handleReset();
      loadDadosProjeto(selectedProjeto);
    } catch (err) {
      error(err.message || "Erro ao salvar.");
    }
  };

  const handleDelete = async () => {
      if (!casoToDelete) return;
      try {
        await api.delete(`/testes/casos/${casoToDelete.id}`);
        success("Cenário excluído.");
        loadDadosProjeto(selectedProjeto);
      } catch (e) { 
          error("Erro ao excluir."); 
      } finally {
         setIsDeleteModalOpen(false);
         setCasoToDelete(null);
      }
  };

  const handleImportarModelo = (casoId) => {
    const casoOrigem = casos.find(c => c.id === casoId);
    
    if (casoOrigem) {
      setForm(prev => ({
        ...prev,
        nome: `${casoOrigem.nome}`,
        descricao: casoOrigem.descricao || '',
        pre_condicoes: casoOrigem.pre_condicoes || '',
        criterios_aceitacao: casoOrigem.criterios_aceitacao || '',
        prioridade: casoOrigem.prioridade,
        passos: casoOrigem.passos && casoOrigem.passos.length > 0 
          ? casoOrigem.passos.map((p, index) => ({
              ordem: index + 1,
              acao: p.acao,
              resultado_esperado: p.resultado_esperado
            }))
          : [{ ordem: 1, acao: '', resultado_esperado: '' }]
      }));
      setSearchTerm('');
      success("Dados do modelo importados!");
    }
  };

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Caso de Teste?"
        message={`Deseja excluir "${casoToDelete?.nome}"? O histórico será perdido.`}
        confirmText="Sim, Excluir"
        isDanger={true}
      />

      {view === 'form' && (
        <div style={{maxWidth: '100%', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            <section className="card form-section">
              <div className="form-header">
                <h3 className="form-title">{editingId ? 'Editar Cenário' : 'Novo Cenário'}</h3>

                {!editingId && (
                    <div ref={wrapperRef} className="search-wrapper" style={{ marginLeft: 'auto', width: '300px' }}>
                        <input 
                            type="text" 
                            placeholder="Buscar modelo..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            onFocus={() => setShowSuggestions(true)}
                            className="search-input"
                        />
                        <span className="search-icon">🔍</span>
                        
                        {showSuggestions && (
                            <ul className="custom-dropdown">
                                {opcoesParaMostrar.length === 0 ? (
                                    <li style={{ color: '#999', cursor: 'default' }}>Nenhum modelo encontrado.</li>
                                ) : (
                                    opcoesParaMostrar.map(c => (
                                        <li key={c.id} onClick={() => { handleImportarModelo(c.id); setShowSuggestions(false); }}>
                                            <div style={{ fontWeight: 600, color: '#334155' }}>
                                                {truncate(c.nome, 20)}
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </div>
                )}
            </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div>
                    <label className="input-label">Título do Cenário <span className="required-asterisk">*</span></label>
                    <input 
                       value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} 
                       placeholder="Ex: Validar fluxo de checkout"
                       className="form-control"
                    />
                  </div>
                  <div className="form-grid">
                      <div>
                        <label>Prioridade</label>
                        <select 
                            value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})}
                            className="form-control bg-gray"
                        >
                           <option value="alta">Alta</option>
                           <option value="media">Média</option>
                           <option value="baixa">Baixa</option>
                        </select>
                      </div>
                      <div>
                        <label>Pré-condições</label>
                        <input value={form.pre_condicoes} onChange={e => setForm({...form, pre_condicoes: e.target.value})} className="form-control" />
                      </div>
                  </div>
                  <div>
                    <label>Objetivo / Critérios</label>
                    <input value={form.criterios_aceitacao} onChange={e => setForm({...form, criterios_aceitacao: e.target.value})} className="form-control" />
                  </div>
              </div>
            </section>

            <section className="card form-section">
              <h3 className="section-subtitle">Alocação (Opcional)</h3>
              <div className="form-grid">
                  <div>
                    <label>Ciclo (Sprint)</label>
                    <SearchableSelect
                        options={ciclos}
                        value={form.ciclo_id}
                        onChange={(val) => setForm({ ...form, ciclo_id: val })}
                        placeholder="Selecione ou busque o ciclo..."
                        disabled={!!editingId}
                        labelKey="nome"
                    />
                  </div>
                  <div>
                    <label>Responsável</label>
                    <SearchableSelect
                        options={usuarios.filter(u => u.ativo)}
                        value={form.responsavel_id}
                        onChange={(val) => setForm({ ...form, responsavel_id: val })}
                        placeholder="Buscar responsável..."
                        labelKey="nome"
                    />
                </div>
              </div>
            </section>

            <section className="card">
               <div className="steps-header-row">
                 <h3 className="section-subtitle" style={{marginBottom: 0}}>Passos do Teste</h3>
                 <button type="button" onClick={addStep} className="btn btn-add-step">+ Passo</button>
               </div>
               <div className="steps-container">
                 {form.passos.map((passo, idx) => (
                   <div key={idx} className="step-row">
                      <div className="step-index">{idx + 1}</div>
                      <input 
                        placeholder="Ação (Ex: Clicar em Entrar)" 
                        value={passo.acao} 
                        onChange={e => updateStep(idx, 'acao', e.target.value)}
                        className="form-control small-text" 
                      />
                      <input 
                        placeholder="Resultado Esperado" 
                        value={passo.resultado_esperado} 
                        onChange={e => updateStep(idx, 'resultado_esperado', e.target.value)}
                        className="form-control small-text" 
                      />
                      <button type="button" onClick={() => removeStep(idx)} className="btn danger small btn-remove-step">✕</button>
                   </div>
                 ))}
               </div>
               <div className="form-actions">
                  <button type="button" onClick={handleReset} className="btn">Cancelar</button>
                  <button type="submit" className="btn primary">{editingId ? 'Salvar Alterações' : 'Salvar Cenário'}</button>
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
                       <select 
                        value={selectedProjeto} onChange={e => setSelectedProjeto(e.target.value)}
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
                    Novo Cenário
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
               <div className="content-area">
                   {filteredCasos.length === 0 ? (
                     <div className="empty-container">
                        <p style={{marginBottom: '10px'}}>Nenhum caso de teste encontrado.</p>
                        {isProjectActive && <button onClick={handleNew} className="btn primary small">Criar o primeiro</button>}
                     </div>
                   ) : (
                     <table>
                       <thead>
                         <tr>
                           <th style={{width: '50px'}}>ID</th>
                           <th style={{width: '35%'}}>Cenário</th>
                           <th style={{width: '10%', textAlign: 'center'}}>Prioridade</th>
                           <th style={{width: '20%'}}>Responsável</th>
                           <th style={{width: '10%', textAlign: 'center'}}>Passos</th>
                           <th style={{width: '10%', textAlign: 'right'}}>Ações</th>
                         </tr>
                       </thead>
                       <tbody>                         
                         {currentCasos.map(c => (
                            <tr key={c.id} className="selectable" onClick={() => handleEdit(c)}>
                                <td className="cell-id">#{c.id}</td>
                                <td>
                                    <div className="cell-name" title={c.nome}>{truncate(c.nome, 40)}</div>
                                </td>
                                <td className="cell-priority">
                                    <span className="badge priority-badge">{c.prioridade}</span>
                                </td>
                                <td>
                                    <span className="cell-resp">{c.responsavel ? truncate(c.responsavel.nome, 20) : '-'}</span>
                                </td>
                                <td className="cell-steps">
                                    {c.passos?.length || 0}
                                </td>
                                <td className="cell-actions">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setCasoToDelete(c); setIsDeleteModalOpen(true); }} 
                                        className="btn danger small btn-action-icon"
                                        title="Excluir"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                       </tbody>
                     </table>
                   )}
               </div>

               <div className="pagination-container">
                    <button onClick={() => paginate(1)} disabled={currentPage === 1 || totalPages === 0} className="pagination-btn nav-btn" title="Primeira">«</button>
                    <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1 || totalPages === 0} className="pagination-btn nav-btn" title="Anterior">‹</button>

                    {getPaginationGroup().map((item) => (
                      <button
                        key={item}
                        onClick={() => paginate(item)}
                        className={`pagination-btn ${currentPage === item ? 'active' : ''}`}
                      >
                        {item}
                      </button>
                    ))}

                    {totalPages === 0 && (
                        <button className="pagination-btn active" disabled>1</button>
                    )}

                    <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="pagination-btn nav-btn" title="Próxima">›</button>
                    <button onClick={() => paginate(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="pagination-btn nav-btn" title="Última">»</button>
               </div>
             </div>
           )}
        </section>
      )}
    </main>
  );
}
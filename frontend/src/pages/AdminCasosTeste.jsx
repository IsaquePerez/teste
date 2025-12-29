import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

export function AdminCasosTeste() {
  const [projetos, setProjetos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [usuarios, setUsuarios] = useState([]); 
  const [casos, setCasos] = useState([]);
  
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

  // Busca e Autocomplete
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const opcoesParaMostrar = searchTerm === '' 
    ? [...casos].sort((a, b) => b.id - a.id).slice(0, 5) 
    : casos.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 8);

  const filteredCasos = casos.filter(c => 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.prioridade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const truncate = (str, n = 30) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';
  
  const inputStyle = {
    width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px',
    fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box'
  };

  useEffect(() => {
    const loadBasics = async () => {
      try {
        const [projData, userData] = await Promise.all([
          api.get("/projetos"),
          api.get("/usuarios/") 
        ]);
        setProjetos(projData || []);
        setUsuarios(userData || []);
        
        // Seleciona o primeiro projeto ativo
        const ativos = (projData || []).filter(p => p.status === 'ativo');
        if (ativos.length > 0) {
          setSelectedProjeto(ativos[0].id);
        }
      } catch (e) {
        toast.error("Erro ao carregar dados básicos.");
      }
    };
    loadBasics();
  }, []);

  useEffect(() => {
    if (selectedProjeto) loadDadosProjeto(selectedProjeto);
  }, [selectedProjeto]);

  // Fecha dropdown ao clicar fora
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
    } catch (error) {
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
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
    setView('list');
  };

  const handleNew = () => {
    if (!isProjectActive) return toast.warning(`Projeto ${currentProject?.status?.toUpperCase() || 'Inativo'}. Criação bloqueada.`);
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
    if (form.passos.length === 1) return toast.info("O teste precisa de pelo menos 1 passo.");
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
    if (!selectedProjeto) return toast.error("Selecione um projeto.");
    if (!form.nome.trim()) return toast.warning("Título obrigatório.");
    
    const passosValidos = form.passos.filter(p => p.acao && p.acao.trim() !== '');
    if (passosValidos.length === 0) return toast.warning("Preencha ao menos um passo.");

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
        toast.success("Cenário atualizado!");
      } else {
        await api.post(`/testes/projetos/${selectedProjeto}/casos`, payload);
        toast.success("Cenário salvo!");
      }
      handleReset();
      loadDadosProjeto(selectedProjeto);
    } catch (error) {
      toast.error(error.message || "Erro ao salvar.");
    }
  };

  const handleDelete = async () => {
      if (!casoToDelete) return;
      try {
        await api.delete(`/testes/casos/${casoToDelete.id}`);
        toast.success("Cenário excluído.");
        loadDadosProjeto(selectedProjeto);
      } catch (e) { 
          toast.error("Erro ao excluir."); 
      } finally {
         setIsDeleteModalOpen(false);
         setCasoToDelete(null);
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
            
            {/* Bloco de Detalhes */}
            <section className="card" style={{marginBottom: '20px'}}>
              <div style={{borderBottom:'1px solid #f1f5f9', paddingBottom:'15px', marginBottom:'20px'}}>
                 <h3 style={{margin:0, color: '#1e293b'}}>{editingId ? 'Editar Cenário' : 'Novo Cenário'}</h3>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151'}}>Título do Cenário <span style={{color:'#ef4444'}}>*</span></label>
                    <input 
                       value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} 
                       placeholder="Ex: Validar fluxo de checkout"
                       style={{...inputStyle, fontSize: '1rem'}}
                    />
                  </div>
                  <div className="form-grid">
                      <div>
                        <label>Prioridade</label>
                        <select 
                            value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})}
                            style={{...inputStyle, backgroundColor: '#f9fafb'}}
                        >
                           <option value="alta">Alta</option>
                           <option value="media">Média</option>
                           <option value="baixa">Baixa</option>
                        </select>
                      </div>
                      <div>
                        <label>Pré-condições</label>
                        <input value={form.pre_condicoes} onChange={e => setForm({...form, pre_condicoes: e.target.value})} style={inputStyle} />
                      </div>
                  </div>
                  <div>
                    <label>Objetivo / Critérios</label>
                    <input value={form.criterios_aceitacao} onChange={e => setForm({...form, criterios_aceitacao: e.target.value})} style={inputStyle} />
                  </div>
              </div>
            </section>

            {/* Alocação */}
            <section className="card" style={{marginBottom: '20px'}}>
              <h3 style={{marginTop: 0, marginBottom: '20px', color: '#334155', fontSize: '1.1rem'}}>Alocação (Opcional)</h3>
              <div className="form-grid">
                  <div>
                    <label>Ciclo (Sprint)</label>
                    <select 
                        value={form.ciclo_id} onChange={e => setForm({...form, ciclo_id: e.target.value})}
                        style={{...inputStyle, backgroundColor: '#f9fafb'}}
                        disabled={!!editingId}
                    >
                       <option value="">Apenas Salvar na Biblioteca</option>
                       {ciclos.map(c => <option key={c.id} value={c.id}>{truncate(c.nome, 25)} ({c.status})</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Responsável</label>
                    <select 
                        value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})}
                        style={{...inputStyle, backgroundColor: '#f9fafb'}}
                    >
                        <option value="">Definir depois</option>
                        {usuarios.filter(u => u.ativo).map(u => (
                            <option key={u.id} value={u.id}>{truncate(u.nome, 30)}</option>
                        ))}
                    </select>
                </div>
              </div>
            </section>

            {/* Steps do Teste */}
            <section className="card">
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                 <h3 style={{margin: 0, color: '#334155', fontSize: '1.1rem'}}>Passos do Teste</h3>
                 <button type="button" onClick={addStep} className="btn" style={{backgroundColor: '#eef2ff', color: '#3730a3', border:'none'}}>+ Passo</button>
               </div>
               <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                 {form.passos.map((passo, idx) => (
                   <div key={idx} style={{display: 'grid', gridTemplateColumns: '30px 1fr 1fr 40px', gap: '10px', alignItems: 'center', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0'}}>
                      <div style={{fontWeight: 'bold', color: '#94a3b8', textAlign: 'center'}}>{idx + 1}</div>
                      <input 
                        placeholder="Ação (Ex: Clicar em Entrar)" 
                        value={passo.acao} 
                        onChange={e => updateStep(idx, 'acao', e.target.value)}
                        style={{...inputStyle, backgroundColor: 'white', fontSize:'0.9rem'}} 
                      />
                      <input 
                        placeholder="Resultado Esperado" 
                        value={passo.resultado_esperado} 
                        onChange={e => updateStep(idx, 'resultado_esperado', e.target.value)}
                        style={{...inputStyle, backgroundColor: 'white', fontSize:'0.9rem'}} 
                      />
                      <button type="button" onClick={() => removeStep(idx)} className="btn danger small" style={{padding:0, width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center'}}>✕</button>
                   </div>
                 ))}
               </div>
               <div className="actions" style={{marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                  <button type="button" onClick={handleReset} className="btn">Cancelar</button>
                  <button type="submit" className="btn primary">{editingId ? 'Salvar Alterações' : 'Salvar Cenário'}</button>
               </div>
            </section>
          </form>
        </div>
      )}

      {/* --- LISTAGEM --- */}
      {view === 'list' && (
        <section className="card" style={{marginTop: 0}}>
           
           {/* Toolbar de Filtros */}
           <div style={{paddingBottom: '15px', borderBottom: '1px solid #f1f5f9', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px'}}>
               
               <h3 style={{margin: 0, fontSize: '1.25rem', color: '#1e293b'}}>Casos de Teste</h3>
               
               <div style={{display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap'}}>
                   
                   {/* Filtro de Projeto */}
                   <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                       <span style={{fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase'}}>PROJETO:</span>
                       <select 
                        value={selectedProjeto} onChange={e => setSelectedProjeto(e.target.value)}
                        style={{
                            padding: '6px 10px', 
                            borderRadius: '6px', 
                            border: '1px solid #cbd5e1', 
                            fontSize: '0.85rem', 
                            backgroundColor: '#f8fafc', 
                            cursor: 'pointer', 
                            minWidth: '160px', 
                            fontWeight: 500, 
                            color: '#334155'
                        }}
                       >
                        {projetos.filter(p => p.status === 'ativo').map(p => (
                            <option key={p.id} value={p.id}>{truncate(p.nome, 25)}</option>
                        ))}
                       </select>
                   </div>
                   
                   <button 
                        onClick={handleNew} className="btn primary" disabled={!isProjectActive} 
                        style={{
                            height: '34px', 
                            padding: '0 15px', 
                            opacity: isProjectActive ? 1 : 0.5, 
                            cursor: isProjectActive ? 'pointer' : 'not-allowed', 
                            fontSize: '0.85rem', 
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                   >
                    Novo Cenário
                   </button>
                   
                   <div style={{width: '1px', height: '24px', backgroundColor: '#e2e8f0', display: 'none', '@media (min-width: 768px)': {display: 'block'}}}></div>

                   {/* Busca com Dropdown Global */}
                   <div ref={wrapperRef} className="search-wrapper" style={{width: '220px'}}>
                        <input 
                            type="text" placeholder="Buscar..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowSuggestions(true)}
                            style={{
                                width: '100%', 
                                padding: '8px 30px 8px 12px', 
                                borderRadius: '6px', 
                                border: '1px solid #cbd5e1', 
                                fontSize: '0.85rem', 
                                height: '34px', 
                                boxSizing: 'border-box'
                            }}
                        />
                        <span style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: '0.9rem'}}>🔍</span>
                        
                        {showSuggestions && opcoesParaMostrar.length > 0 && (
                            <ul className="custom-dropdown">
                                {opcoesParaMostrar.map(c => (
                                    <li key={c.id} onClick={() => { setSearchTerm(c.nome); setShowSuggestions(false); }}>
                                        <span>
                                            {truncate(c.nome, 20)}
                                            <span style={{fontSize:'0.75rem', color:'#9ca3af', marginLeft:'8px'}}>({c.prioridade})</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                   </div>
               </div>
           </div>

           {loading ? <div style={{padding:'20px', textAlign:'center', color:'#64748b'}}>Carregando dados...</div> : (
             <div className="table-wrap">
               {casos.length === 0 ? (
                 <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #e2e8f0'}}>
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
                     {filteredCasos.length === 0 ? (
                       <tr><td colSpan="6" style={{textAlign:'center', padding:'20px', color: '#64748b'}}>Sem resultados para "{searchTerm}"</td></tr>
                     ) : (
                       filteredCasos.map(c => (
                           <tr key={c.id} className="selectable" onClick={() => handleEdit(c)}>
                               <td style={{color: '#64748b'}}>#{c.id}</td>
                               <td>
                                   <div style={{fontWeight: 600, color:'#334155'}} title={c.nome}>{truncate(c.nome, 40)}</div>
                               </td>
                               <td style={{textAlign: 'center'}}>
                                   <span className="badge" style={{backgroundColor: '#f1f5f9', color: '#475569'}}>{c.prioridade}</span>
                               </td>
                               <td>
                                   <span style={{color: '#475569', fontSize: '0.85rem'}}>{c.responsavel ? truncate(c.responsavel.nome, 20) : '-'}</span>
                               </td>
                               <td style={{textAlign: 'center', color: '#64748b'}}>
                                   {c.passos?.length || 0}
                               </td>
                               <td style={{textAlign: 'right'}}>
                                   <button 
                                       onClick={(e) => { e.stopPropagation(); setCasoToDelete(c); setIsDeleteModalOpen(true); }} 
                                       className="btn danger small"
                                       style={{padding: '6px 10px', lineHeight: 1}}
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
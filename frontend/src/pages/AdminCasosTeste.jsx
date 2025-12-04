import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function AdminCasosTeste() {
  // --- ESTADOS ---
  const [projetos, setProjetos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [usuarios, setUsuarios] = useState([]); // Lista completa (para histórico)
  const [casos, setCasos] = useState([]);
  
  const [selectedProjeto, setSelectedProjeto] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingId, setEditingId] = useState(null);

  // Estado do Formulário
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

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    const loadBasics = async () => {
      try {
        const [projData, userData] = await Promise.all([
          api.get("/projetos"),
          api.get("/usuarios/") // Carrega TODOS (ativos e inativos) para a tabela funcionar
        ]);
        setProjetos(projData || []);
        setUsuarios(userData || []);
        
        if (projData && projData.length > 0) {
          setSelectedProjeto(projData[0].id);
        }
      } catch (e) {
        console.error("Erro ao carregar básicos:", e);
      }
    };
    loadBasics();
  }, []);

  // --- MUDANÇA DE PROJETO ---
  useEffect(() => {
    if (selectedProjeto) {
      loadDadosProjeto(selectedProjeto);
    }
  }, [selectedProjeto]);

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
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- GESTÃO DO FORMULÁRIO ---
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
      passos: caso.passos && caso.passos.length > 0 
              ? caso.passos.map(p => ({...p})) 
              : [{ ordem: 1, acao: '', resultado_esperado: '' }]
    });
    setEditingId(caso.id);
    setView('form');
  };

  // --- STEPS ---
  const addStep = () => {
    setForm(prev => ({
      ...prev,
      passos: [...prev.passos, { ordem: prev.passos.length + 1, acao: '', resultado_esperado: '' }]
    }));
  };

  const removeStep = (index) => {
    if (form.passos.length === 1) return;
    const newPassos = form.passos.filter((_, i) => i !== index).map((p, i) => ({ ...p, ordem: i + 1 }));
    setForm(prev => ({ ...prev, passos: newPassos }));
  };

  const updateStep = (index, field, value) => {
    const newPassos = [...form.passos];
    newPassos[index][field] = value;
    setForm(prev => ({ ...prev, passos: newPassos }));
  };

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjeto) return alert("Erro: Nenhum projeto selecionado.");
    if (!form.nome.trim()) return alert("O Título do teste é obrigatório.");
    if (form.passos.length === 0 || !form.passos[0].acao.trim()) return alert("Adicione pelo menos 1 passo válido.");

    try {
      const payload = {
        ...form,
        projeto_id: parseInt(selectedProjeto),
        responsavel_id: form.responsavel_id ? parseInt(form.responsavel_id) : null,
        ciclo_id: form.ciclo_id ? parseInt(form.ciclo_id) : null,
        passos: form.passos.filter(p => p.acao.trim() !== '')
      };

      if (editingId) {
        await api.put(`/testes/casos/${editingId}`, payload);
        alert("Teste atualizado com sucesso!");
      } else {
        await api.post(`/testes/projetos/${selectedProjeto}/casos`, payload);
        
        if (payload.ciclo_id && payload.responsavel_id) {
             alert(`Teste criado e enviado para execução!`);
        } else {
             alert("Teste salvo na biblioteca.");
        }
      }

      handleReset();
      loadDadosProjeto(selectedProjeto);

    } catch (error) {
      console.error("ERRO:", error);
      alert("Falha ao salvar. Verifique se todos os campos estão corretos.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza?")) return;
    try {
      await api.delete(`/testes/casos/${id}`);
      loadDadosProjeto(selectedProjeto);
    } catch (e) { alert("Erro ao excluir."); }
  };

  // --- HELPERS VISUAIS ---

  // Renderiza o responsável com estilo de Badge (Azul=Ativo, Vermelho=Inativo)
  const renderResponsavel = (id) => {
      if (!id) return <span style={{color: '#cbd5e1'}}>-</span>;
      
      const user = usuarios.find(u => u.id === id);
      if (!user) return <span style={{color: '#94a3b8'}}>Desconhecido</span>;

      // Inativo
      if (!user.ativo) {
          return (
              <span className="badge" style={{backgroundColor: '#fee2e2', color: '#b91c1c'}} title="Inativo">
                  {user.nome.split(' ')[0]} (Inativo)
              </span>
          );
      }
      
      // Ativo
      return (
          <span className="badge" style={{backgroundColor: '#eef2ff', color: '#3730a3'}}>
              {user.nome.split(' ')[0]}
          </span>
      );
  };

  // Filtro para o dropdown: Apenas ativos podem receber novos testes
  const usuariosAtivos = usuarios.filter(u => u.ativo);

  // --- RENDERIZAÇÃO ---
  return (
    <main className="container">
      {/* HEADER DA PÁGINA */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb'}}>
        <div>
           <h2 style={{margin: 0, color: '#1e293b'}}>Casos de Testes</h2>
           <p className="muted" style={{margin: '5px 0 0 0'}}>Gerencie e planeje os cenários de teste do projeto.</p>
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
           <div style={{textAlign: 'right'}}>
             <label style={{display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '2px'}}>PROJETO ATIVO</label>
             <select 
                value={selectedProjeto} 
                onChange={e => setSelectedProjeto(e.target.value)}
                style={{padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '200px', fontWeight: 500}}
             >
                {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
             </select>
           </div>
           
           {view === 'list' ? (
             <button onClick={handleNew} className="btn primary" style={{height: '40px', padding: '0 20px'}}>
               Novo Teste
             </button>
           ) : (
             <button onClick={handleReset} className="btn" style={{height: '40px'}}>Voltar à Lista</button>
           )}
        </div>
      </div>

      {view === 'form' && (
        <div style={{maxWidth: '900px', margin: '0 auto'}}>
          <form onSubmit={handleSubmit}>
            
            {/* CARD 1: INFORMAÇÕES BÁSICAS */}
            <section className="card" style={{marginBottom: '20px'}}>
              <h3 style={{marginTop: 0, marginBottom: '20px', color: '#334155', fontSize: '1.1rem'}}>
                Detalhes do Cenário
              </h3>
              
              <div className="form-grid">
                 <div style={{gridColumn: '1/-1'}}>
                   <label>Título do Cenário <span style={{color:'red'}}>*</span></label>
                   <input 
                      required 
                      value={form.nome} 
                      onChange={e => setForm({...form, nome: e.target.value})} 
                      placeholder="Ex: Validar login com credenciais inválidas"
                      style={{fontSize: '1.1rem', fontWeight: 500}}
                   />
                 </div>
                 
                 <div>
                   <label>Prioridade</label>
                   <select value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})}>
                      <option value="alta"> Alta</option>
                      <option value="media"> Média</option>
                      <option value="baixa"> Baixa</option>
                   </select>
                 </div>

                 <div>
                   <label>Pré-condições</label>
                   <input value={form.pre_condicoes} onChange={e => setForm({...form, pre_condicoes: e.target.value})} placeholder="Ex: Usuário na Home" />
                 </div>

                 <div style={{gridColumn: '1/-1'}}>
                   <label>Critérios de Aceitação / Objetivo</label>
                   <input
                      rows="2" 
                      value={form.criterios_aceitacao} 
                      onChange={e => setForm({...form, criterios_aceitacao: e.target.value})}
                      placeholder="O que deve acontecer para o teste passar?"
                   />
                 </div>
              </div>
            </section>

            {/* CARD 2: PLANEJAMENTO */}
            <section className="card" style={{marginBottom: '20px'}}>
              <h3 style={{marginTop: 0, marginBottom: '20px', color: '#334155', fontSize: '1.1rem'}}>
                Planejamento & Alocação
              </h3>
              <div className="form-grid">
                 <div>
                   <label>Alocar ao Ciclo (Sprint)</label>
                   <select value={form.ciclo_id} onChange={e => setForm({...form, ciclo_id: e.target.value})}>
                      <option value="">Apenas Salvar na Biblioteca</option>
                      {ciclos.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.status})</option>)}
                   </select>
                 </div>
                 <div>
                   <label>Responsável (Testador)</label>
                   <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})}>
                      <option value="">Definir depois</option>
                      {/* AQUI: Usamos usuariosAtivos para não selecionar quem saiu */}
                      {usuariosAtivos.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                   </select>
                 </div>
              </div>
              <p style={{fontSize: '0.85rem', color: '#64748b', marginTop: '10px', fontStyle: 'italic'}}>
                 * Ao selecionar ambos, o teste será enviado automaticamente para a fila de execução do responsável.
              </p>
            </section>

            {/* CARD 3: PASSOS */}
            <section className="card">
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                 <h3 style={{margin: 0, color: '#334155', fontSize: '1.1rem'}}>Passos</h3>
                 <button type="button" onClick={addStep} className="btn small" style={{backgroundColor: '#f1f5f9', color: '#334155'}}>+ Passo</button>
               </div>
               
               <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                 {form.passos.map((passo, idx) => (
                   <div key={idx} style={{display: 'flex', gap: '15px', alignItems: 'flex-start', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                      <div style={{
                          height: '28px', 
                          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '0.85rem', fontWeight: 'bold', marginTop: '3px'
                      }}>
                        {idx + 1}
                      </div>
                      
                      <div style={{flex: 1}}>
                         <input 
                            placeholder="Ação (O que o testador deve fazer)" 
                            value={passo.acao} 
                            onChange={e => updateStep(idx, 'acao', e.target.value)}
                            style={{width: '100%', marginBottom: '8px', fontWeight: 500, border: '1px solid #cbd5e1'}} 
                         />
                         <input 
                            placeholder="Resultado Esperado" 
                            value={passo.resultado_esperado} 
                            onChange={e => updateStep(idx, 'resultado_esperado', e.target.value)}
                            style={{width: '100%', fontSize: '0.9rem', color: '#059669', border: '1px solid #cbd5e1'}} 
                         />
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => removeStep(idx)} 
                        className="btn danger" 
                        style={{padding: '5px 10px', height: '30px'}}
                        title="Remover passo"
                      >
                        X
                      </button>
                   </div>
                 ))}
               </div>

               <div className="actions" style={{marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                  <button type="button" onClick={handleReset} className="btn large">Cancelar</button>
                  <button type="submit" className="btn primary large">
                    {editingId ? 'Salvar Alterações' : 'Criar Caso de Teste'}
                  </button>
               </div>
            </section>

          </form>
        </div>
      )}

      {/* LISTAGEM DE CASOS */}
      {view === 'list' && (
        <section className="card">
           {loading ? <p>Carregando biblioteca...</p> : (
             <div className="table-wrap">
               {casos.length === 0 ? (
                 <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>
                    <p style={{fontSize: '1.2rem'}}>Nenhum caso de teste encontrado neste projeto.</p>
                    <button onClick={handleNew} className="btn primary">Crie o primeiro teste agora</button>
                 </div>
               ) : (
                 <table>
                   <thead>
                     <tr>
                       <th style={{width: '60px'}}>ID</th>
                       <th>Cenário</th>
                       <th>Prioridade</th>
                       <th>Testador</th>
                       <th>Passos</th>
                       <th style={{textAlign: 'right'}}>Ações</th>
                     </tr>
                   </thead>
                   <tbody>
                     {casos.map(c => (
                       <tr key={c.id}>
                         <td style={{color: '#64748b'}}>#{c.id}</td>
                         <td>
                           <div style={{fontWeight: 600, color: '#334155'}}>{c.nome}</div>
                           {c.pre_condicoes && <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>Pré: {c.pre_condicoes}</div>}
                         </td>
                         <td>
                            <span className={`badge ${c.prioridade === 'alta' ? 'off' : 'on'}`} 
                                  style={{
                                    backgroundColor: c.prioridade === 'alta' ? '#fef2f2' : (c.prioridade === 'media' ? '#fffbeb' : '#f0fdf4'), 
                                    color: c.prioridade === 'alta' ? '#dc2626' : (c.prioridade === 'media' ? '#b45309' : '#166534'),
                                    border: '1px solid rgba(0,0,0,0.05)'
                                  }}>
                                {c.prioridade.toUpperCase()}
                            </span>
                         </td>
                         
                         <td>
                             {renderResponsavel(c.responsavel_id)}
                         </td>
                         
                         <td>{c.passos?.length || 0}</td>
                         <td style={{textAlign: 'right'}}>
                            <button onClick={() => handleEdit(c)} className="btn" style={{marginRight: '8px', padding: '6px 12px'}}>Editar</button>
                            <button onClick={() => handleDelete(c.id)} className="btn danger" style={{padding: '6px 12px'}}>Excluir</button>
                         </td>
                       </tr>
                     ))}
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
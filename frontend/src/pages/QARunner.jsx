import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function QARunner() {
  const { user } = useAuth();
  
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeExecucao, setActiveExecucao] = useState(null);

  const [showDefectModal, setShowDefectModal] = useState(false);
  const [currentFailedStep, setCurrentFailedStep] = useState(null);
  const [defeitoForm, setDefeitoForm] = useState({ titulo: '', descricao: '', severidade: 'medio', evidencias: '' });

  // --- NOVO: Estado para Galeria de Imagens ---
  const [galleryImages, setGalleryImages] = useState(null); // null ou array de URLs

  useEffect(() => { loadMinhasTarefas(); }, []);

  const loadMinhasTarefas = async () => {
    setLoading(true);
    try {
        const data = await api.get("/testes/minhas-tarefas");
        setTarefas(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const selectTask = async (t) => {
      if (activeExecucao?.id === t.id) return;
      try {
          const data = await api.get(`/testes/execucoes/${t.id}`);
          setActiveExecucao(data);
          if (data.status_geral === 'pendente') {
              api.put(`/testes/execucoes/${t.id}/finalizar?status=em_progresso`);
              setTarefas(prev => prev.map(task => task.id === t.id ? {...task, status_geral: 'em_progresso'} : task));
          }
      } catch (e) { alert("Erro ao carregar detalhes."); }
  };

  const handleStepAction = (passoId, acao) => {
      if (acao === 'aprovado') {
          updatePasso(passoId, 'aprovado');
      } else {
          setCurrentFailedStep(passoId);
          setDefeitoForm({ titulo: '', descricao: '', severidade: 'medio', evidencias: '' });
          setShowDefectModal(true);
      }
  };

  const updatePasso = async (passoId, status) => {
      await api.put(`/testes/passos/${passoId}`, { status });
      const updatedPassos = activeExecucao.passos_executados.map(p => {
          if(p.id === passoId) return { ...p, status };
          return p;
      });
      setActiveExecucao(prev => ({ ...prev, passos_executados: updatedPassos }));
  };

  // --- HELPER: Ler Evidências (JSON ou String) ---
  const parseEvidencias = (evidenciaString) => {
      if (!evidenciaString) return [];
      try {
          const parsed = JSON.parse(evidenciaString);
          return Array.isArray(parsed) ? parsed : [evidenciaString];
      } catch (e) {
          return [evidenciaString]; // Fallback para legado
      }
  };

  const handleFileUpload = async (e, passoId) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);

      try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/testes/passos/${passoId}/evidencia`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
              body: formData
          });
          
          if (response.ok) {
              const data = await response.json();
              // O backend agora retorna "lista_completa" ou podemos reconstruir o JSON
              const novaListaJSON = JSON.stringify(data.lista_completa || [data.url]); 
              
              const updatedPassos = activeExecucao.passos_executados.map(p => {
                  if(p.id === passoId) return { ...p, evidencias: novaListaJSON };
                  return p;
              });
              setActiveExecucao(prev => ({ ...prev, passos_executados: updatedPassos }));
              alert("Evidência adicionada!");
          } else {
              const err = await response.json();
              alert("Erro: " + (err.detail || "Falha no upload"));
          }
      } catch (error) { alert("Erro de rede."); }
  };

  const saveDefect = async (e) => {
      e.preventDefault();
      try {
          await api.post("/defeitos/", { ...defeitoForm, status: 'aberto', execucao_teste_id: activeExecucao.id });
          await updatePasso(currentFailedStep, 'reprovado');
          alert("Ocorrência registrada.");
          setShowDefectModal(false);
      } catch (error) { alert("Erro ao registrar defeito."); }
  };

  const finalizarExecucao = async () => {
      if(!confirm("Finalizar teste?")) return;
      const allPassed = activeExecucao.passos_executados.every(p => p.status === 'aprovado');
      const statusFinal = allPassed ? 'passou' : 'falhou';
      await api.put(`/testes/execucoes/${activeExecucao.id}/finalizar?status=${statusFinal}`);
      setActiveExecucao(null);
      loadMinhasTarefas();
  };

  const handleDeleteEvidence = async (passoId, urlToDelete) => {
      if (!confirm("Remover esta evidência?")) return;

      // 1. Encontrar o passo e a lista atual
      const passo = activeExecucao.passos_executados.find(p => p.id === passoId);
      const listaAtual = parseEvidencias(passo.evidencias);
      
      // 2. Filtrar
      const novaLista = listaAtual.filter(url => url !== urlToDelete);
      const novoJSON = JSON.stringify(novaLista);

      try {
          // 3. Enviar atualização para o backend (rota de update genérica)
          await api.put(`/testes/passos/${passoId}`, { evidencias: novoJSON });

          // 4. Atualizar UI
          const updatedPassos = activeExecucao.passos_executados.map(p => {
              if(p.id === passoId) return { ...p, evidencias: novoJSON };
              return p;
          });
          setActiveExecucao(prev => ({ ...prev, passos_executados: updatedPassos }));
          
          // Se a galeria estiver aberta, fecha para evitar erro visual
          setGalleryImages(null);

      } catch (error) {
          console.error(error);
          alert("Erro ao remover evidência.");
      }
  };

  return (
    <main className="container" style={{maxWidth: '100%', padding: '20px'}}>
      <h2 className="section-title">Minhas Tarefas</h2>
      
      <div style={{display: 'grid', gridTemplateColumns: '350px 1fr', gap: '25px', alignItems: 'start', height: 'calc(100vh - 150px)'}}>
          
          {/* LISTA (Esquerda) */}
          <div style={{overflowY: 'auto', height: '100%', paddingRight: '5px'}}>
              {loading ? <p>A carregar...</p> : (
                  tarefas.length === 0 ? <div className="card muted">Sem tarefas pendentes.</div> : (
                      tarefas.map(t => (
                          <div key={t.id} onClick={() => selectTask(t)} className="card" 
                            style={{
                                cursor: 'pointer', marginBottom: '15px', 
                                borderLeft: `4px solid ${t.status_geral === 'em_progresso' ? '#3b82f6' : '#cbd5e1'}`,
                                backgroundColor: activeExecucao?.id === t.id ? '#eff6ff' : 'white'
                            }}>
                              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                              <h4 style={{margin: '0 0 5px 0', color: '#1e293b'}}>{t.caso_teste?.nome}</h4>
                                  <span className={`badge ${t.status_geral === 'em_progresso' ? 'on' : ''}`} style={{fontSize: '0.7rem'}}>
                                      {t.status_geral === 'em_progresso' ? 'EM ANDAMENTO' : 'PENDENTE'}
                                  </span>
                              </div>
                          </div>
                      ))
                  )
              )}
          </div>

          {/* PLAYER (Direita) */}
          <div style={{height: '100%', overflowY: 'auto'}}>
              {activeExecucao ? (
                  <div className="card" style={{minHeight: '100%'}}>
                      <div style={{borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px', display:'flex', justifyContent:'space-between'}}>
                          <h2 style={{margin:0}}>{activeExecucao.caso_teste.nome}</h2>
                          <button onClick={finalizarExecucao} className="btn primary">Finalizar</button>
                      </div>

                      <div className="steps-list">
                          {[...activeExecucao.passos_executados].sort((a,b) => a.passo_template.ordem - b.passo_template.ordem).map((p) => {
                              const evidenciasList = parseEvidencias(p.evidencias);
                              return (
                                  <div key={p.id} style={{
                                      display: 'grid', gridTemplateColumns: '40px 1fr 140px', 
                                      gap: '20px', padding: '20px', borderBottom: '1px solid #f1f5f9',
                                      backgroundColor: p.status === 'aprovado' ? '#f0fdf4' : (p.status === 'reprovado' ? '#fef2f2' : 'white')
                                  }}>
                                      <div style={{fontWeight:'bold', color:'#001C42', fontSize: '1.2rem'}}>#{p.passo_template.ordem}</div>
                                      <div>
                                          <div style={{fontWeight:600}}>{p.passo_template.acao}</div>
                                          <div style={{color:'#059669', fontSize:'0.9rem', marginBottom:'10px'}}>Esperado: {p.passo_template.resultado_esperado}</div>
                                          
                                          {/* --- ÁREA DE EVIDÊNCIAS --- */}
                                          <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center'}}>
                                              {/* Botão de Anexar */}
                                              {evidenciasList.length < 3 && (
                                                  <label className="btn small" style={{backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem'}}>
                                                      Anexar Print
                                                      <input type="file" accept="image/*" style={{display:'none'}} onChange={(e) => handleFileUpload(e, p.id)} />
                                                  </label>
                                              )}
                                              
                                              {/* Lista de Chips (Excluir/Visualizar) */}
                                              {evidenciasList.map((url, idx) => (
                                                  <div key={idx} className="evidence-chip">
                                                      <span 
                                                        style={{cursor: 'pointer', textDecoration: 'underline'}} 
                                                        onClick={() => setGalleryImages(evidenciasList)}
                                                        title="Clique para ampliar"
                                                      >
                                                          Imagem {idx + 1}
                                                      </span>
                                                      <span 
                                                        className="delete-btn" 
                                                        onClick={() => handleDeleteEvidence(p.id, url)}
                                                        title="Excluir evidência"
                                                      >
                                                          ✕
                                                      </span>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>

                                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                          {p.status === 'pendente' ? (
                                              <>
                                                {/* --- BOTÕES COM HOVER CSS --- */}
                                                <button onClick={() => handleStepAction(p.id, 'aprovado')} className="btn btn-approve"> OK</button>
                                                <button onClick={() => handleStepAction(p.id, 'reprovado')} className="btn btn-reject"> Falhou</button>
                                              </>
                                          ) : (
                                              <span style={{textAlign:'center', fontWeight:'bold', textTransform:'uppercase', fontSize:'0.8rem', color: p.status === 'aprovado' ? '#059669' : '#dc2626'}}>
                                                  {p.status}
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              ) : <div className="card muted">Selecione uma tarefa.</div>}
          </div>
      </div>

      {/* MODAL DE GALERIA */}
      {galleryImages && (
          <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }} onClick={() => setGalleryImages(null)}>
              <div style={{display:'flex', gap:'20px', overflowX: 'auto', maxWidth: '90%', padding:'20px'}}>
                  {galleryImages.map((url, idx) => (
                      <div key={idx} style={{textAlign:'center', color:'white'}}>
                          <img src={url} alt={`Evidência ${idx+1}`} style={{maxHeight: '80vh', border: '2px solid white', borderRadius: '8px'}} onClick={(e) => e.stopPropagation()} />
                          <div style={{marginTop:'10px'}}>Imagem {idx + 1} de {galleryImages.length}</div>
                      </div>
                  ))}
              </div>
              <button className="btn" style={{marginTop:'20px', background:'white', color:'black'}} onClick={() => setGalleryImages(null)}>Fechar Galeria</button>
          </div>
      )}
      {/* MODAL DEFEITO */}
      {showDefectModal && (
          <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}}>
              <div className="card" style={{width:'500px', maxWidth:'90%'}}>
                  <h3>Registrar Ocorrência</h3>
                  <form onSubmit={saveDefect}>
                      <div className="form-grid" style={{gridTemplateColumns:'1fr'}}>
                          <input required placeholder="Título do erro" value={defeitoForm.titulo} onChange={e => setDefeitoForm({...defeitoForm, titulo:e.target.value})} />
                          <textarea required rows="3" placeholder="Descrição" value={defeitoForm.descricao} onChange={e => setDefeitoForm({...defeitoForm, descricao:e.target.value})} />
                      </div>
                      <div className="actions" style={{marginTop:'15px'}}>
                          <button type="submit" className="btn danger">Confirmar</button>
                          <button type="button" onClick={() => setShowDefectModal(false)} className="btn">Cancelar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </main>
  );
}
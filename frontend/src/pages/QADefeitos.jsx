import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function QADefeitos() {
  const [defeitos, setDefeitos] = useState([]);
  const [loading, setLoading] = useState(false);
  // openMenuId controla qual dropdown está aberto no momento
  const [openMenuId, setOpenMenuId] = useState(null);
  const [galleryImages, setGalleryImages] = useState(null);

  useEffect(() => { loadDefeitos(); }, []);

  const loadDefeitos = async () => {
    setLoading(true);
    try {
      const data = await api.get("/defeitos/");
      setDefeitos(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); alert("Erro ao carregar defeitos."); }
    finally { setLoading(false); }
  };

  // Agora recebe o novo status diretamente ao clicar na opção
  const handleUpdateStatus = async (id, newStatus) => {
    // UI otimista: fecha o menu imediatamente
    setOpenMenuId(null); 
    
    try {
        await api.put(`/defeitos/${id}`, { status: newStatus });
        // Recarrega lista para confirmar
        loadDefeitos(); 
    } catch (e) { 
        alert("Erro ao atualizar status."); 
        console.error(e);
    }
  };

  // --- HELPERS VISUAIS ---

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const renderResponsavel = (responsavel) => {
      if (!responsavel) return <span style={{color: '#94a3b8', fontSize: '0.8rem'}}>Desconhecido</span>;
      if (responsavel.ativo === false) {
          return (
              <span className="badge" style={{backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem'}} title="Utilizador Inativo">
                  {responsavel.nome} (Inativo)
              </span>
          );
      }
      return (
          <span className="badge" style={{backgroundColor: '#eef2ff', color: '#3730a3', fontSize: '0.75rem'}}>
              {responsavel.nome}
          </span>
      );
  };

  const getSeveridadeColor = (sev) => {
      switch(sev) {
          case 'critico': return '#b91c1c'; 
          case 'alto': return '#ef4444'; 
          case 'medio': return '#f59e0b'; 
          default: return '#10b981'; 
      }
  };

  const getStatusStyle = (status) => {
    switch(status) {
        case 'aberto': return { bg: '#fee2e2', color: '#b91c1c' };
        case 'corrigido': return { bg: '#d1fae5', color: '#065f46' };
        case 'fechado': return { bg: '#f1f5f9', color: '#475569' };
        default: return { bg: '#eff6ff', color: '#1e40af' }; // em_teste e outros
    }
  };

  // --- GALERIA ---
  const parseEvidencias = (evidenciaString) => {
      if (!evidenciaString) return [];
      if (typeof evidenciaString === 'string' && evidenciaString.trim().startsWith('http') && !evidenciaString.trim().startsWith('[')) {
          return [evidenciaString];
      }
      try {
          const parsed = JSON.parse(evidenciaString);
          return Array.isArray(parsed) ? parsed : [evidenciaString];
      } catch (e) { return [evidenciaString]; }
  };

  const openGallery = (evidencias) => {
      const lista = parseEvidencias(evidencias);
      if (lista.length > 0) setGalleryImages(lista);
  };

  const toggleMenu = (id) => {
    if (openMenuId === id) setOpenMenuId(null);
    else setOpenMenuId(id);
  };

  return (
    <main className="container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2 className="section-title" style={{border:'none', margin:0}}>Gestão de Defeitos</h2>
        <button onClick={loadDefeitos} className="btn">Atualizar Lista</button>
      </div>

      <section className="card" style={{overflow: 'visible'}}> {/* overflow visible para o menu não cortar */}
        {loading ? <p>A carregar...</p> : (
          <div className="table-wrap" style={{overflowX: 'visible'}}>
            {defeitos.length === 0 ? <p className="muted">Nenhum defeito registado.</p> : (
              <table style={{ borderCollapse: 'separate', borderSpacing: '0 5px' }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Origem (Teste/Responsável)</th>
                    <th>Erro</th>
                    <th>Evidências</th>
                    <th>Severidade</th>
                    <th>Status & Ações</th> {/* Coluna fundida */}
                    <th>Registado em</th>
                    {/* Coluna Ações removida */}
                  </tr>
                </thead>
                <tbody>
                  {defeitos.map(d => {
                    const temEvidencia = d.evidencias && parseEvidencias(d.evidencias).length > 0;
                    const styleStatus = getStatusStyle(d.status);
                    
                    return (
                        <tr key={d.id}>
                            <td style={{color:'#64748b'}}>#{d.id}</td>
                            
                            <td>
                                <div style={{fontWeight: 600, color: '#334155', marginBottom: '4px'}}>
                                    {d.execucao?.caso_teste?.nome || 'Teste Removido'}
                                </div>
                                <div>
                                    {renderResponsavel(d.execucao?.responsavel)}
                                </div>
                            </td>

                            <td>
                                <strong>{d.titulo}</strong>
                                <div style={{fontSize:'0.85em', color:'#6b7280', marginTop:'2px', maxWidth:'300px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={d.descricao}>
                                    {d.descricao}
                                </div>
                            </td>
                            
                            <td>
                                {temEvidencia ? (
                                    <button onClick={() => openGallery(d.evidencias)} className="btn small" style={{backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontSize: '0.75rem'}}>
                                      Ver
                                    </button>
                                ) : <span style={{color: '#cbd5e1'}}>-</span>}
                            </td>
                            
                            <td>
                                <span style={{color: getSeveridadeColor(d.severidade), fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem'}}>
                                    {d.severidade}
                                </span>
                            </td>
                            
                            {/* --- COLUNA DE STATUS INTERATIVA --- */}
                            <td style={{ position: 'relative' }}> 
                                <button 
                                    onClick={() => toggleMenu(d.id)}
                                    className="badge"
                                    style={{
                                        backgroundColor: styleStatus.bg,
                                        color: styleStatus.color,
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        
                                    }}
                                >
                                    {d.status} <span style={{fontSize: '0.6rem'}}>▼</span>
                                </button>

                                {/* MENU SUSPENSO (DROPDOWN) */}
                                {openMenuId === d.id && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        borderRadius: '6px',
                                        zIndex: 50,
                                        minWidth: '120px',
                                        overflow: 'hidden'
                                    }}>
                                        {['aberto', 'em_teste', 'corrigido', 'fechado'].map(opt => (
                                            <div 
                                                key={opt}
                                                onClick={() => handleUpdateStatus(d.id, opt)}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem',
                                                    color: '#334155',
                                                    borderBottom: '1px solid #f1f5f9',
                                                    backgroundColor: d.status === opt ? '#f8fafc' : 'white'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = d.status === opt ? '#f8fafc' : 'white'}
                                            >
                                                {opt.replace('_', ' ')}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </td>

                            <td style={{fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap'}}>
                                {formatDate(d.created_at)}
                            </td>
                        </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      {/* MODAL DE IMAGENS */}
      {galleryImages && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}} onClick={() => setGalleryImages(null)}>
              <div style={{display:'flex', gap:'20px', overflowX: 'auto', maxWidth: '90%', padding:'20px'}}>
                  {galleryImages.map((url, idx) => (
                      <div key={idx} style={{textAlign:'center', color:'white'}}>
                          <img src={url} alt={`Evidência ${idx+1}`} style={{maxHeight: '80vh', border: '2px solid white', borderRadius: '8px', cursor: 'default'}} onClick={(e) => e.stopPropagation()} />
                          <div style={{marginTop:'10px'}}>Imagem {idx + 1}</div>
                      </div>
                  ))}
              </div>
              <button className="btn" style={{marginTop:'20px', background:'white', color:'black'}} onClick={() => setGalleryImages(null)}>Fechar Galeria</button>
          </div>
      )}
    </main>
  );
}
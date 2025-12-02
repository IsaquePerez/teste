import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function QADefeitos() {
  const [defeitos, setDefeitos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [statusForm, setStatusForm] = useState('');
  const [galleryImages, setGalleryImages] = useState(null);

  useEffect(() => { loadDefeitos(); }, []);

  const loadDefeitos = async () => {
    setLoading(true);
    try {
      const data = await api.get("/defeitos/");
      console.log("Defeitos carregados:", data); 
      setDefeitos(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); alert("Erro ao carregar defeitos."); }
    finally { setLoading(false); }
  };

  const handleSaveStatus = async (id) => {
    try {
        await api.put(`/defeitos/${id}`, { status: statusForm });
        alert("Status atualizado!");
        setEditingId(null);
        loadDefeitos(); 
    } catch (e) { alert("Erro ao atualizar."); }
  };

  // --- NOVA FUNÇÃO PARA FORMATAR A DATA ---
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const parseEvidencias = (evidenciaString) => {
      if (!evidenciaString) return [];
      if (typeof evidenciaString === 'string' && evidenciaString.trim().startsWith('http') && !evidenciaString.trim().startsWith('[')) {
          return [evidenciaString];
      }
      try {
          const parsed = JSON.parse(evidenciaString);
          if (Array.isArray(parsed)) return parsed;
          if (typeof parsed === 'string') return [parsed];
          return [];
      } catch (e) {
          console.warn("Falha ao parsear evidência:", evidenciaString);
          return [evidenciaString];
      }
  };

  const openGallery = (evidencias) => {
      const lista = parseEvidencias(evidencias);
      if (lista.length > 0) setGalleryImages(lista);
  };

  const getSeveridadeColor = (sev) => {
      switch(sev) {
          case 'critico': return '#b91c1c'; case 'alto': return '#ef4444'; case 'medio': return '#f59e0b'; default: return '#10b981'; 
      }
  };

  return (
    <main className="container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2 className="section-title" style={{border:'none', margin:0}}>Gestão de Defeitos</h2>
        <button onClick={loadDefeitos} className="btn">Atualizar Lista</button>
      </div>

      <section className="card">
        {loading ? <p>A carregar...</p> : (
          <div className="table-wrap">
            {defeitos.length === 0 ? <p className="muted">Nenhum defeito registado.</p> : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    {/* --- NOVA COLUNA NO CABEÇALHO --- */}
                    <th>Origem (Teste/Responsável)</th>
                    <th>Erro</th>
                    <th>Evidências</th>
                    <th>Severidade</th>
                    <th>Status</th>
                    <th>Registado em</th> 
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {defeitos.map(d => {
                    const temEvidencia = d.evidencias && parseEvidencias(d.evidencias).length > 0;
                    return (
                        <tr key={d.id}>
                        <td style={{color:'#64748b'}}>#{d.id}</td>

                        
                        <td>
                            <div style={{fontWeight: 600, color: '#334155'}}>
                                {d.execucao?.caso_teste?.nome || 'Teste Removido'}
                            </div>
                            <div style={{fontSize: '0.8rem', color: '#64748b', display:'flex', alignItems:'center', gap:'5px', marginTop:'4px'}}>
                                <span style={{backgroundColor:'#f1f5f9', padding:'2px 6px', borderRadius:'4px'}}>
                                    👤 {d.execucao?.responsavel?.nome || 'Desconhecido'}
                                </span>
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
                        <td>
                            {editingId === d.id ? (
                                <select value={statusForm} onChange={e => setStatusForm(e.target.value)} style={{padding: '4px', borderRadius: '4px', fontSize: '0.85rem'}}>
                                    <option value="aberto">Aberto</option>
                                    <option value="em_teste">Em Teste</option>
                                    <option value="corrigido">Corrigido</option>
                                    <option value="fechado">Fechado</option>
                                </select>
                            ) : (
                                <span className="badge" style={{
                                  backgroundColor: d.status === 'aberto' ? '#fee2e2' : (d.status === 'corrigido' ? '#d1fae5' : '#eff6ff'),
                                  color: d.status === 'aberto' ? '#b91c1c' : (d.status === 'corrigido' ? '#065f46' : '#1e40af')
                                }}>{d.status.toUpperCase()}</span>
                            )}
                        </td>
                          <td style={{fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap'}}>
                              {formatDate(d.created_at)}
                          </td>
                        <td>
                            {editingId === d.id ? (
                                <div style={{display:'flex', gap:'5px'}}>
                                    <button onClick={() => handleSaveStatus(d.id)} className="btn primary" style={{fontSize: '0.7rem', padding: '4px 8px'}}>OK</button>
                                    <button onClick={() => setEditingId(null)} className="btn" style={{fontSize: '0.7rem', padding: '4px 8px'}}>X</button>
                                </div>
                            ) : (
                                <button onClick={() => { setEditingId(d.id); setStatusForm(d.status); }} className="btn" style={{fontSize: '0.75rem', padding: '4px 8px'}}>Status</button>
                            )}
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

      {/* GALERIA (Mantém igual) */}
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
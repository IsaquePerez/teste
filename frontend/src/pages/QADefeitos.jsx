import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function QADefeitos() {
  const [defeitos, setDefeitos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados de Edição
  const [editingId, setEditingId] = useState(null);
  const [statusForm, setStatusForm] = useState('');

  // --- NOVO: Estado para Galeria de Imagens ---
  const [galleryImages, setGalleryImages] = useState(null); // null ou array de URLs

  useEffect(() => {
    loadDefeitos();
  }, []);

  const loadDefeitos = async () => {
    setLoading(true);
    try {
      const data = await api.get("/defeitos/");
      setDefeitos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar defeitos.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (defeito) => {
    setEditingId(defeito.id);
    setStatusForm(defeito.status);
  };

  const handleSaveStatus = async (id) => {
    try {
        await api.put(`/defeitos/${id}`, { status: statusForm });
        alert("Status atualizado!");
        setEditingId(null);
        loadDefeitos(); 
    } catch (e) {
        alert("Erro ao atualizar status.");
    }
  };

  // --- HELPER: Ler Evidências do Defeito ---
  const parseEvidencias = (evidenciaString) => {
      if (!evidenciaString) return [];
      // Verifica se é uma URL direta ou texto simples
      if (evidenciaString.startsWith('http') && !evidenciaString.startsWith('[')) {
          return [evidenciaString];
      }
      try {
          // Tenta ler como JSON (caso tenhamos implementado multiplos uploads no futuro)
          const parsed = JSON.parse(evidenciaString);
          return Array.isArray(parsed) ? parsed : [evidenciaString];
      } catch (e) {
          // Se não for JSON, retorna como string única (pode ser texto ou link)
          return [evidenciaString];
      }
  };

  const openGallery = (evidencias) => {
      const lista = parseEvidencias(evidencias);
      // Filtra apenas o que parece ser link de imagem para a galeria
      const imagens = lista.filter(item => item.startsWith('http'));
      
      if (imagens.length > 0) {
          setGalleryImages(imagens);
      } else {
          // Se for apenas texto, mostra um alerta simples (ou poderia ser um modal de texto)
          alert("Evidência (Texto): " + lista.join('\n'));
      }
  };

  const getSeveridadeColor = (sev) => {
      switch(sev) {
          case 'critico': return '#b91c1c'; 
          case 'alto': return '#ef4444'; 
          case 'medio': return '#f59e0b'; 
          default: return '#10b981'; 
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
                    <th style={{width: '50px'}}>ID</th>
                    <th>Descrição do Erro</th>
                    <th>Evidências</th> {/* NOVA COLUNA */}
                    <th>Severidade</th>
                    <th>Status</th>
                    <th style={{width: '140px'}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {defeitos.map(d => {
                    const temEvidencia = d.evidencias && d.evidencias.length > 0;
                    return (
                        <tr key={d.id}>
                        <td>#{d.id}</td>
                        <td>
                            <strong>{d.titulo}</strong><br/>
                            <span style={{fontSize:'0.85em', color:'#6b7280'}}>
                                {d.descricao}
                            </span>
                        </td>
                        <td>
                            {temEvidencia ? (
                                <button 
                                    onClick={() => openGallery(d.evidencias)}
                                    className="btn small"
                                    style={{backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', fontSize: '0.75rem'}}
                                >
                                    📷 Ver Anexo
                                </button>
                            ) : (
                                <span style={{color: '#9ca3af', fontSize: '0.8rem'}}>-</span>
                            )}
                        </td>
                        <td>
                            <span style={{color: getSeveridadeColor(d.severidade), fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem'}}>
                                {d.severidade}
                            </span>
                        </td>
                        <td>
                            {editingId === d.id ? (
                                <select 
                                    value={statusForm} 
                                    onChange={e => setStatusForm(e.target.value)}
                                    style={{padding: '4px', borderRadius: '4px', fontSize: '0.85rem'}}
                                >
                                    <option value="aberto">Aberto</option>
                                    <option value="em_teste">Em Teste</option>
                                    <option value="corrigido">Corrigido</option>
                                    <option value="fechado">Fechado</option>
                                </select>
                            ) : (
                                <span className="badge" style={{
                                    backgroundColor: d.status === 'aberto' ? '#fee2e2' : (d.status === 'corrigido' ? '#d1fae5' : '#eff6ff'),
                                    color: d.status === 'aberto' ? '#b91c1c' : (d.status === 'corrigido' ? '#065f46' : '#1e40af')
                                }}>
                                    {d.status.toUpperCase()}
                                </span>
                            )}
                        </td>
                        <td>
                            {editingId === d.id ? (
                                <div style={{display:'flex', gap:'5px'}}>
                                    <button onClick={() => handleSaveStatus(d.id)} className="btn primary" style={{fontSize: '0.7rem', padding: '4px 8px'}}>OK</button>
                                    <button onClick={() => setEditingId(null)} className="btn" style={{fontSize: '0.7rem', padding: '4px 8px'}}>X</button>
                                </div>
                            ) : (
                                <button onClick={() => handleEditClick(d)} className="btn" style={{fontSize: '0.75rem', padding: '4px 8px'}}>
                                    Alterar Status
                                </button>
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

      {/* MODAL DE GALERIA (REUTILIZADO DO RUNNER) */}
      {galleryImages && (
          <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }} onClick={() => setGalleryImages(null)}>
              <div style={{display:'flex', gap:'20px', overflowX: 'auto', maxWidth: '90%', padding:'20px'}}>
                  {galleryImages.map((url, idx) => (
                      <div key={idx} style={{textAlign:'center', color:'white'}}>
                          {/* Previne clique na imagem de fechar o modal */}
                          <img 
                            src={url} 
                            alt={`Evidência ${idx+1}`} 
                            style={{maxHeight: '80vh', border: '2px solid white', borderRadius: '8px', cursor: 'default'}} 
                            onClick={(e) => e.stopPropagation()} 
                          />
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
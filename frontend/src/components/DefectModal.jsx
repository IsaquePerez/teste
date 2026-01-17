import { useState, useEffect } from 'react';


export function DefectModal({ isOpen, onClose, onConfirm }) {
  const INITIAL_FORM = { 
    titulo: '', 
    descricao: '', 
    severidade: 'medio' 
  };

  const [form, setForm] = useState(INITIAL_FORM);

  
  useEffect(() => {
    if (isOpen) setForm(INITIAL_FORM);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(form);
  };

  const isFormInvalid = !form.titulo.trim() || !form.descricao.trim();

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(2px)'
    }} onClick={onClose}>
      
      <div 
        className="card" 
        style={{ width: '500px', maxWidth: '90%', margin: 0, animation: 'fadeIn 0.2s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, color: '#1E293B' }}>Registrar Ocorrência</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '15px' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Título do Erro</label>
              <input 
                required 
                placeholder="Ex: Botão não responde..." 
                value={form.titulo} 
                onChange={e => setForm({...form, titulo: e.target.value})} 
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Severidade</label>
              <select 
                value={form.severidade} 
                onChange={e => setForm({...form, severidade: e.target.value})}
                style={{ width: '100%' }}
              >
                <option value="baixo">Baixo</option>
                <option value="medio">Médio</option>
                <option value="alto">Alto</option>
                <option value="critico">Crítico</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Descrição Detalhada</label>
              <textarea 
                required 
                rows="4" 
                placeholder="Descreva os passos para reproduzir..." 
                value={form.descricao} 
                onChange={e => setForm({...form, descricao: e.target.value})} 
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

          </div>

          <div className="actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn">Cancelar</button>
            <button
              type="submit"
              className="btn danger"
              disabled={isFormInvalid} 
              title={isFormInvalid ? "Preencha todos os campos" : ""}
            >
              Registrar Falha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { api } from '../services/api'; 
import { X, CheckCircle, ExternalLink, AlertTriangle, Calendar } from 'lucide-react'; // Adicionei ícone Calendar
import { useSnackbar } from '../context/SnackbarContext';
import './DefectModal.css';

export function DefectModal({ executionGroup, onClose }) {
  if (!executionGroup) return null;

  const [processing, setProcessing] = useState(false);
  const { success, error } = useSnackbar();

  // Formata data e hora
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleFixAll = async () => {
    if (!window.confirm("Isso marcará todos os defeitos como 'Corrigido' e enviará a execução para 'Reteste'. Confirmar?")) return;
    
    setProcessing(true);
    try {
      const promises = executionGroup.defeitos.map(def => 
        api.put(`/defeitos/${def.id}`, { 
          status: 'corrigido',
          titulo: def.titulo,
          descricao: def.descricao,
          severidade: def.severidade
        })
      );

      await Promise.all(promises);
      success("Todos os defeitos corrigidos! Tarefa enviada para Reteste.");
      onClose(true); 
    } catch (err) {
      console.error(err);
      error("Erro ao atualizar defeitos.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content defect-group-modal" onClick={e => e.stopPropagation()}>
        
        {/* HEADER DO MODAL (Contexto da Execução) */}
        <div className="modal-header">
          <div>
            <h3>Gestão de Falhas - Execução #{executionGroup.id}</h3>
            <span className="subtitle">
              {executionGroup.projeto_nome} &gt; {executionGroup.caso_teste_nome}
            </span>
          </div>
          <button className="close-btn" onClick={() => onClose(false)}>
            <X size={24} />
          </button>
        </div>

        {/* BODY - LISTA DE DEFEITOS INDIVIDUAIS */}
        <div className="modal-body scrollable">
          <div className="alert-info">           
            <p>
              O Runner <strong>{executionGroup.responsavel_teste_nome}</strong> reportou 
              <strong> {executionGroup.defeitos.length} problema(s)</strong> neste teste.
            </p>
          </div>

          <div className="defects-list">
            {executionGroup.defeitos.map((defect, index) => (
              <div key={defect.id} className="defect-card">
                
                {/* CABEÇALHO DO DEFEITO ESPECÍFICO */}
                <div className="defect-card-header">
                  <div className="header-left-group">
                    <span className={`badge severity-${defect.severidade}`}>
                        {defect.severidade?.toUpperCase() || "MÉDIO"}
                    </span>
                    <h4>#{index + 1} - {defect.titulo}</h4>
                  </div>
                  
                  <div className="header-right-group">
                    {/* AQUI ESTÁ A DATA ESPECÍFICA DO PASSO/DEFEITO */}
                    <span className="defect-timestamp" title="Data do reporte">
                        <Calendar size={12} style={{marginRight: '4px'}} />
                        {formatDateTime(defect.created_at)}
                    </span>
                    <span className={`status-tag status-${defect.status}`}>
                        {defect.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div className="defect-content">
                    <p className="defect-desc">{defect.descricao}</p>
                    
                    {defect.logs_erro && (
                        <div className="log-box">
                            <strong>Log/Erro:</strong>
                            <pre>{defect.logs_erro}</pre>
                        </div>
                    )}

                    {defect.evidencias && Array.isArray(defect.evidencias) && defect.evidencias.length > 0 && (
                    <div className="evidence-links">
                        <strong>Evidências Anexadas:</strong>
                        <div className="evidence-grid">
                        {defect.evidencias.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="evidence-pill">
                            <ExternalLink size={14} /> Ver Evidência {i + 1}
                            </a>
                        ))}
                        </div>
                    </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={() => onClose(false)} disabled={processing}>
            Analisar Depois
          </button>
          
          <button 
            className="btn-success" 
            onClick={handleFixAll} 
            disabled={processing}
          >
            {processing ? 'Processando...' : (
              <>
                Corrigir Tudo e Retestar
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
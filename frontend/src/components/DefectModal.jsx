import React, { useState } from 'react';
import { api } from '../services/api'; 
import { X, CheckCircle, ExternalLink, AlertTriangle, Calendar, XCircle, RotateCcw } from 'lucide-react';
import { useSnackbar } from '../context/SnackbarContext';
import './DefectModal.css';

export function DefectModal({ executionGroup, onClose }) {
  if (!executionGroup) return null;

  // Inicializa estado local com os defeitos recebidos para permitir atualização visual imediata
  const [localDefects, setLocalDefects] = useState(executionGroup.defeitos);
  const [processing, setProcessing] = useState(null); // ID do defeito sendo processado
  const { success, error } = useSnackbar();

  // Formata data e hora
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Ação Individual por Defeito (Substitui o "Fix All")
  const handleUpdateDefect = async (defect, newStatus) => {
    setProcessing(defect.id);
    try {
      // 1. Atualiza o Defeito na API
      await api.put(`/defeitos/${defect.id}`, { 
        status: newStatus,
        titulo: defect.titulo,
        descricao: defect.descricao,
        severidade: defect.severidade
      });

      // 2. Atualiza estado local para refletir mudança instantaneamente (UX melhor)
      setLocalDefects(prev => prev.map(d => d.id === defect.id ? { ...d, status: newStatus } : d));

      const actionText = newStatus === 'corrigido' ? 'enviado para Reteste' : 'Rejeitado';
      success(`Defeito ${actionText} com sucesso.`);

    } catch (err) {
      console.error(err);
      error("Erro ao atualizar defeito.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(true)}>
      <div className="modal-content defect-group-modal" onClick={e => e.stopPropagation()}>
        
        {/* HEADER DO MODAL */}
        <div className="modal-header">
          <div>
            <h3>Gestão de Falhas - Execução #{executionGroup.id}</h3>
            <span className="subtitle">
              {executionGroup.projeto_nome} &gt; {executionGroup.caso_teste_nome}
            </span>
          </div>
          <button className="close-btn" onClick={() => onClose(true)}>
            <X size={24} />
          </button>
        </div>

        {/* BODY - LISTA DE DEFEITOS */}
        <div className="modal-body scrollable">
          <div className="alert-info">          
            <AlertTriangle size={18} />
            <p>
              O Runner <strong>{executionGroup.responsavel_teste_nome}</strong> reportou 
              <strong> {executionGroup.defeitos.length} problema(s)</strong>.
              Gerencie cada item individualmente abaixo.
            </p>
          </div>

          <div className="defects-list">
            {localDefects.map((defect, index) => (
              <div key={defect.id} className={`defect-card ${defect.status}`}>
                
                {/* CABEÇALHO DO DEFEITO */}
                <div className="defect-card-header">
                  <div className="header-left-group">
                    <span className={`badge severity-${defect.severidade}`}>
                        {defect.severidade?.toUpperCase() || "MÉDIO"}
                    </span>
                    <h4>#{defect.id} - {defect.titulo}</h4>
                  </div>
                  
                  <div className="header-right-group">
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

                    {/* EVIDÊNCIAS (Galeria) */}
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

                    {/* BARRA DE AÇÕES INDIVIDUAIS */}
                    <div className="defect-actions-bar">
                        {defect.status === 'aberto' && (
                            <>
                                <button 
                                    className="btn-action-small reject"
                                    onClick={() => handleUpdateDefect(defect, 'rejeitado')}
                                    disabled={processing === defect.id}
                                >
                                    <XCircle size={16} /> Rejeitar
                                </button>
                                <button 
                                    className="btn-action-small fix"
                                    onClick={() => handleUpdateDefect(defect, 'corrigido')}
                                    disabled={processing === defect.id}
                                >
                                    {processing === defect.id ? 'Processando...' : <><RotateCcw size={16} /> Enviar p/ Reteste</>}
                                </button>
                            </>
                        )}
                        {defect.status === 'corrigido' && (
                             <div className="success-msg"><CheckCircle size={16}/> Aguardando validação do Runner</div>
                        )}
                         {defect.status === 'fechado' && (
                             <div className="success-msg" style={{color: '#64748b'}}>Defeito encerrado.</div>
                        )}
                         {defect.status === 'rejeitado' && (
                             <div className="success-msg" style={{color: '#ef4444'}}>Defeito rejeitado.</div>
                        )}
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={() => onClose(true)}>
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
}
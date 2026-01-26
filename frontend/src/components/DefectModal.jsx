import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api'; 
import { X, ExternalLink, Calendar, Filter } from 'lucide-react';
import { useSnackbar } from '../context/SnackbarContext';
import { useAuth } from '../context/AuthContext';
import './DefectModal.css';

export function DefectModal({ executionGroup, onClose }) {
  if (!executionGroup) return null;

  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const { success, error } = useSnackbar();

  // --- ESTADOS PARA FILTRO E SCROLL INFINITO ---
  const [statusFilter, setStatusFilter] = useState('todos');
  const [visibleCount, setVisibleCount] = useState(5); 
  const scrollRef = useRef(null);
  
  const ITEMS_PER_BATCH = 5;

  // Reseta a paginação quando o filtro muda
  useEffect(() => {
    setVisibleCount(ITEMS_PER_BATCH);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [statusFilter]);

  // --- FILTRAGEM DOS DADOS ---
  const filteredDefects = useMemo(() => {
    if (!executionGroup.defeitos) return [];
    
    return executionGroup.defeitos.filter(d => {
      if (statusFilter === 'todos') return true;
      return d.status === statusFilter;
    });
  }, [executionGroup.defeitos, statusFilter]);
  const visibleDefects = filteredDefects.slice(0, visibleCount);

  // --- DETECTOR DE SCROLL ---
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (visibleCount < filteredDefects.length) {
        setVisibleCount(prev => prev + ITEMS_PER_BATCH);
      }
    }
  };
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };
  const parseDefectInfo = (fullTitle) => {
    if (!fullTitle) return { cleanTitle: "", acao: null, esperado: null };
    const matchNew = fullTitle.match(/^(.*) \(DetalhesPasso: (.*) \|\|\| (.*)\)$/);
    if (matchNew) return { cleanTitle: matchNew[1], acao: matchNew[2], esperado: matchNew[3] };
    const matchOld = fullTitle.match(/^(.*) \(Passo: (.*)\)$/);
    if (matchOld) return { cleanTitle: matchOld[1], acao: matchOld[2], esperado: null };
    return { cleanTitle: fullTitle, acao: null, esperado: null };
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
        <div className="modal-toolbar">
            <div className="filter-control">
                <Filter size={16} className="filter-icon" />
                <span className="filter-label">Status:</span>
                <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="status-filter-select"
                >
                    <option value="todos">Todos</option>
                    <option value="aberto">Aberto</option>
                    <option value="corrigido">Corrigido</option>
                </select>
            </div>
            <div className="count-info">
                Exibindo {visibleDefects.length} de {filteredDefects.length}
            </div>
        </div>
        <div 
            className="modal-body scrollable" 
            onScroll={handleScroll} 
            ref={scrollRef}
        >
          <div className="alert-info">           
            <p>
              O Runner <strong>{executionGroup.responsavel_teste_nome}</strong> reportou 
              <strong> {executionGroup.defeitos.length} problema(s)</strong> neste teste.
            </p>
          </div>

          <div className="defects-list">
            {visibleDefects.length === 0 ? (
                <div className="empty-filter-state">
                    Nenhum defeito encontrado com o status "{statusFilter}".
                </div>
            ) : (
                visibleDefects.map((defect, index) => {
                const { cleanTitle, acao, esperado } = parseDefectInfo(defect.titulo);

                return (
                    <div key={defect.id} className="defect-card">
                    
                    <div className="defect-card-header">
                        <div className="header-left-group">
                        <span className={`badge severity-${defect.severidade}`}>
                            {defect.severidade?.toUpperCase() || "MÉDIO"}
                        </span>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <h4 style={{ margin: 0 }}>#{index + 1} - {cleanTitle}</h4>
                            
                            {acao && (
                            <div style={{ fontSize: '0.85em', color: '#555', display: 'flex', flexDirection: 'column' }}>
                                <span><strong>Ação:</strong> {acao}</span>
                                {esperado && (
                                    <span><strong>Resultado Esperado:</strong> {esperado}</span>
                                )}
                            </div>
                            )}
                        </div>
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
                );
                })
            )}
            
            {visibleCount < filteredDefects.length && (
                <div className="scroll-loader">Carregando mais...</div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={() => onClose(false)} disabled={processing}>
            Analisar Depois
          </button>
          
          {user?.role !== 'user' && (
            <button 
                className="btn-success" 
                onClick={handleFixAll} 
                disabled={processing}
            >
                {processing ? 'Processando...' : 'Corrigir Tudo e Retestar'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
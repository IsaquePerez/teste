import React from 'react';
import styles from './styles.module.css';
import { CheckCircle, XCircle, Ban } from 'lucide-react'; // Ícones para os botões

export function ExecutionPlayer({ 
  tasks, execution, onFinish, onStepAction, onViewGallery, readOnly 
}) {
  
  if (!execution) {
    return (
      <div className={styles.playerEmpty}>
        <h3>Selecione uma tarefa ao lado para iniciar</h3>
        <p>Você tem {tasks.length} tarefas.</p>
      </div>
    );
  }

  const passosOrdenados = execution.passos_executados?.sort((a, b) => a.passo_caso_teste?.ordem - b.passo_caso_teste?.ordem) || [];

  return (
    <div className={styles.playerContainer}>
      <div className={styles.playerHeader}>
        <div>
          <h2>{execution.caso_teste?.nome}</h2>
          <p className={styles.description}>{execution.caso_teste?.descricao}</p>
          {readOnly && (
             <span className={`badge-pill ${execution.status_geral === 'passou' ? 'baixo' : 'critico'}`} style={{marginTop:'8px', display:'inline-block'}}>
                {execution.status_geral.toUpperCase()}
             </span>
          )}
        </div>
        
        <button 
            className={styles.btnFinish} 
            onClick={onFinish}
            disabled={readOnly}
            style={{ opacity: readOnly ? 0.5 : 1, cursor: readOnly ? 'not-allowed' : 'pointer' }}
        >
          {readOnly ? 'Tarefa Concluída' : 'Finalizar Tarefa'}
        </button>
      </div>

      <div className={styles.stepsContainer}>
        {passosOrdenados.map((passo, index) => {
          // Normaliza status para lowercase para bater com CSS
          const status = (passo.status || 'pendente').toLowerCase();
          const evidencias = passo.evidencias || []; 
          const hasEvidences = Array.isArray(evidencias) && evidencias.length > 0;

          // Bloqueio visual: Se já está aprovado, não mostra botões (foco no reteste)
          const isStepLocked = readOnly || status === 'passou'; // Ajustado para novo enum 'passou'

          return (
            <div key={passo.id} className={`${styles.stepCard} ${styles[status]}`}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>Passo {index + 1}</span>
                <div className={styles.stepStatusBadge}>{status.toUpperCase()}</div>
              </div>

              <div className={styles.stepContent}>
                <div className={styles.stepInfo}>
                  <strong>Ação:</strong> {passo.passo_caso_teste?.acao}
                </div>
                <div className={styles.stepInfo}>
                  <strong>Resultado Esperado:</strong> {passo.passo_caso_teste?.resultado_esperado}
                </div>
              </div>

              {hasEvidences && (
                <div className={styles.evidenceStrip}>
                  {evidencias.map((url, idx) => (
                    <div key={idx} className={styles.thumbWrapper}>
                      <img 
                        src={url} className={styles.thumbImg} 
                        onClick={() => onViewGallery(evidencias)} 
                        alt="evidencia"
                      />
                    </div>
                  ))}
                </div>
              )}

              {!isStepLocked && (
                  <div className={styles.stepActions}>
                    {/* BOTÃO PASSOU */}
                    <button 
                      className={`${styles.btnAction} ${styles.btnPass}`}
                      onClick={() => onStepAction(passo.id, 'passou')}
                      title="Marcar como Passou"
                    >
                      <CheckCircle size={18} /> Passou
                    </button>

                    {/* BOTÃO FALHOU */}
                    <button 
                      className={`${styles.btnAction} ${styles.btnFail} ${status === 'falhou' ? styles.selected : ''}`}
                      onClick={() => onStepAction(passo.id, 'falhou')}
                      title="Reportar Bug"
                    >
                      <XCircle size={18} /> {status === 'falhou' ? 'Ver Bug' : 'Falhou'}
                    </button>

                    {/* BOTÃO BLOQUEADO */}
                    <button 
                      className={`${styles.btnAction} ${styles.btnBlock} ${status === 'bloqueado' ? styles.selected : ''}`}
                      onClick={() => onStepAction(passo.id, 'bloqueado')}
                      title="Bloqueado"
                    >
                      <Ban size={18} />
                    </button>
                  </div>
              )}
              
              {status === 'passou' && !readOnly && (
                  <div style={{marginTop: '10px', fontSize: '0.8rem', color: '#166534', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'}}>
                      <CheckCircle size={14} /> Passo validado com sucesso
                  </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
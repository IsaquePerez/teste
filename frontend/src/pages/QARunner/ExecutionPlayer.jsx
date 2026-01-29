import React from 'react';
import styles from './styles.module.css';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

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

  // Ordenação dos passos
  const passosOrdenados = execution.passos_executados?.sort((a, b) => a.passo_template?.ordem - b.passo_template?.ordem) || [];

  return (
    <div className={styles.playerContainer}>
      <div className={styles.playerHeader}>
        <div className={styles.headerContent}>
          
          {/* Título, Status e Botão na mesma linha */}
          <div className={styles.titleRow}>
             <h2>{execution.caso_teste?.nome}</h2>
             
             {readOnly && (
                <span className={`badge-pill ${execution.status_geral === 'passou' ? 'baixo' : 'critico'}`}>
                    {execution.status_geral.toUpperCase()}
                </span>
             )}

            {/* BOTÃO COM MARGIN-LEFT: AUTO PARA FICAR NA DIREITA */}
            <button 
                className={styles.btnFinish} 
                onClick={onFinish}
                disabled={readOnly}
                style={{ 
                    marginLeft: 'auto', /* Empurra o botão para a direita */
                    opacity: readOnly ? 0.5 : 1, 
                    cursor: readOnly ? 'not-allowed' : 'pointer' 
                }}
            >
              {readOnly ? 'Tarefa Concluída' : 'Finalizar Tarefa'}
            </button>
          </div>

          {/* === ÁREA DE METADADOS (PRÉ-CONDIÇÕES E OBJETIVO) === */}
          <div className={styles.metaContainer}>
            
            {/* Pré-condições */}
            {execution.caso_teste?.pre_condicoes && (
                <div className={styles.metaBoxWarning}>
                    <strong><AlertTriangle size={15}/> Pré-condições:</strong>
                    <p>{execution.caso_teste.pre_condicoes}</p>
                </div>
            )}

            {/* Objetivo */}
            {execution.caso_teste?.criterios_aceitacao && (
                <div className={styles.metaBoxInfo}>
                    <strong><Info size={15}/> Objetivo:</strong>
                    <p>{execution.caso_teste.criterios_aceitacao}</p>
                </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.stepsContainer}>
        {passosOrdenados.map((passo, index) => {
          const status = passo.status || 'pendente';
          const evidencias = passo.evidencias || [];
          const hasEvidences = Array.isArray(evidencias) && evidencias.length > 0;
          const isStepLocked = readOnly;

          return (
            <div key={passo.id} className={`${styles.stepCard} ${styles[status]}`}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>Passo {index + 1}</span>
                <div className={styles.stepStatusBadge}>{status.toUpperCase()}</div>
              </div>

              <div className={styles.stepContent}>
                <div className={styles.stepInfo}>
                  <strong>Ação:</strong> {passo.passo_template?.acao}
                </div>
                <div className={styles.stepInfo}>
                  <strong>Resultado Esperado:</strong> {passo.passo_template?.resultado_esperado}
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
                    <button 
                      className={`${styles.btnAction} ${styles.btnApprove}`}
                      onClick={() => onStepAction(passo.id, 'aprovado')}
                    >
                      Aprovar
                    </button>
                    <button 
                      className={`${styles.btnAction} ${styles.btnFail} ${status === 'reprovado' ? styles.selected : ''}`}
                      onClick={() => onStepAction(passo.id, 'reprovado')}
                    >
                      {status === 'reprovado' ? 'Editar Falha' : 'Reprovar'}
                    </button>
                  </div>
              )}            
            </div>
          );
        })}
      </div>
    </div>
  );
}
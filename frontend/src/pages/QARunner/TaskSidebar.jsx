import React from 'react';
import styles from './styles.module.css';

export function TaskSidebar({ tasks, loading, activeExecId, onSelect }) {
  if (loading) return <div className={styles.sidebar}>Carregando tarefas...</div>;

  return (
    <aside className={styles.sidebar}>
      {tasks.length === 0 ? (
        <div className={styles.emptyState}>Nenhuma tarefa pendente.</div>
      ) : (
        <ul className={styles.taskList}>
          {tasks.map(task => (
            <li 
              key={task.id} 
              className={`${styles.taskItem} ${activeExecId === task.id ? styles.active : ''}`}
              onClick={() => onSelect(task)}
            >
              <div className={styles.taskHeader}>
                <span className={styles.taskId}>#{task.id}</span>
                <span className={`badge-pill ${task.caso_teste?.prioridade || 'medio'}`}>
                  {task.caso_teste?.prioridade || 'Normal'}
                </span>
              </div>
              <div className={styles.taskTitle}>
                {task.caso_teste?.nome}
              </div>
              <div className={styles.taskFooter}>
                Status: {task.status_geral.replace('_', ' ')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
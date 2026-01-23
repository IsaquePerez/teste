import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext'; 

import { ConfirmationModal } from '../../components/ConfirmationModal';
import { RegisterDefectModal } from '../../components/RegisterDefectModal';
import { TaskSidebar } from './TaskSidebar';
import { ExecutionPlayer } from './ExecutionPlayer';
import { EvidenceGallery } from './EvidenceGallery';
import styles from './styles.module.css';

export function QARunner() {
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeExecucao, setActiveExecucao] = useState(null);
  
  // --- ESTADOS ---
  const [defectsQueue, setDefectsQueue] = useState([]); 
  const [stepStatuses, setStepStatuses] = useState({});
  const [defectToEdit, setDefectToEdit] = useState(null);
  
  const [galleryImages, setGalleryImages] = useState(null);
  const [currentStepId, setCurrentStepId] = useState(null);
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  
  const { success, error, info, warning } = useSnackbar();

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', onConfirm: () => {}, isDanger: false
  });

  // --- LÓGICA DE BLOQUEIO (READ-ONLY) ---
  const isReadOnly = activeExecucao && activeExecucao.status_geral === 'fechado';

  useEffect(() => { loadMinhasTarefas(); }, []);

  // Recuperação de Estado
  useEffect(() => {
    if (activeExecucao) {
        const queue = localStorage.getItem(`queue_${activeExecucao.id}`);
        const statuses = localStorage.getItem(`statuses_${activeExecucao.id}`);
        if (queue) setDefectsQueue(JSON.parse(queue));
        if (statuses) setStepStatuses(JSON.parse(statuses));
    }
  }, [activeExecucao?.id]);

  // Salvamento Automático
  useEffect(() => {
    if (activeExecucao) {
        localStorage.setItem(`queue_${activeExecucao.id}`, JSON.stringify(defectsQueue));
        localStorage.setItem(`statuses_${activeExecucao.id}`, JSON.stringify(stepStatuses));
    }
  }, [defectsQueue, stepStatuses, activeExecucao]);

  const loadMinhasTarefas = async () => {
    setLoading(true);
    try {
        const data = await api.get("/testes/minhas-tarefas");
        setTarefas(Array.isArray(data) ? data : []);
    } catch { error("Erro ao carregar tarefas."); } 
    finally { setLoading(false); }
  };

  const selectTask = async (t) => {
      if (activeExecucao?.id === t.id) return;
      try {
          const data = await api.get(`/testes/execucoes/${t.id}`);
          
          // --- CORREÇÃO: Limpeza automática para Reteste ---
          // Se a tarefa voltou como 'reteste', limpamos o lixo do localStorage da execução anterior (fechada)
          // Isso garante que os passos não apareçam marcados incorretamente e a fila de defeitos esteja limpa.
          if (data.status_geral === 'reteste') {
              localStorage.removeItem(`queue_${t.id}`);
              localStorage.removeItem(`statuses_${t.id}`);
          }
          // ------------------------------------------------

          setActiveExecucao(data);
          
          // Reinicia estados locais (o useEffect de recuperação não achará nada no localStorage se foi limpo acima)
          setDefectsQueue([]);
          setStepStatuses({});
          setDefectToEdit(null);

          // Se estiver pendente, move para 'em_progresso' ao abrir
          if (data.status_geral === 'pendente') {
              await api.put(`/testes/execucoes/${t.id}/finalizar?status=em_progresso`);
              setTarefas(prev => prev.map(task => task.id === t.id ? {...task, status_geral: 'em_progresso'} : task));
          }
      } catch { error("Erro ao carregar execução."); }
  };
  
  const handleStepAction = (passoId, acao) => {
      if (isReadOnly) return; // Bloqueia ações se fechado

      const currentStatus = stepStatuses[passoId];
      if (currentStatus && currentStatus !== acao) {
          setConfirmModal({
              isOpen: true,
              title: "Alterar Resultado?",
              message: `Mudar de "${currentStatus.toUpperCase()}" para "${acao.toUpperCase()}"?`,
              isDanger: true,
              onConfirm: () => processStepAction(passoId, acao)
          });
          return;
      }
      processStepAction(passoId, acao);
  };

  const processStepAction = async (passoId, acao) => {
      if (acao === 'aprovado') {
          setDefectsQueue(prev => prev.filter(d => d._passo_id_local !== passoId));
          setStepStatuses(prev => ({ ...prev, [passoId]: 'aprovado' }));

          // Atualização Visual (Limpa imagens se houver)
          setActiveExecucao(prev => ({
              ...prev,
              passos_executados: prev.passos_executados.map(p => 
                  p.id === passoId ? { ...p, evidencias: [] } : p
              )
          }));

          // Limpeza no Backend
          try {
              const passoAtual = activeExecucao.passos_executados.find(p => p.id === passoId);
              if (passoAtual?.evidencias && passoAtual.evidencias !== '[]') {
                  await api.put(`/testes/passos/${passoId}`, { evidencias: '[]' });
              }
          } catch (err) { console.error("Erro ao limpar backend", err); }

          success("Passo marcado como Aprovado.");

      } else {
          // Edição: Se já existe defeito na fila, carrega para editar
          const existingDefect = defectsQueue.find(d => d._passo_id_local === passoId);
          setCurrentStepId(passoId);
          setDefectToEdit(existingDefect || null);
          setIsDefectModalOpen(true);
      }
  };

  const handleDefectConfirm = async (modalData) => {
      const { files, existingImages, ...defectInfo } = modalData; 
      let novasEvidenciasUrls = [];

      if (files && files.length > 0) {
          try {
              info(`Enviando ${files.length} imagem(ns)...`);
              const uploadPromises = files.map(file => {
                  const formData = new FormData();
                  formData.append('file', file);
                  return api.post(`/testes/passos/${currentStepId}/evidencia`, formData);
              });
              const responses = await Promise.all(uploadPromises);
              novasEvidenciasUrls = responses.map(res => (res.data?.url || res.url)); 
          } catch { error("Erro ao enviar imagens."); }
      }

      const listaFinalEvidencias = [...(existingImages || []), ...novasEvidenciasUrls];
      const evidenciasJSON = JSON.stringify(listaFinalEvidencias);

      setActiveExecucao(prev => ({
          ...prev,
          passos_executados: prev.passos_executados.map(p => 
              p.id === currentStepId ? { ...p, evidencias: listaFinalEvidencias } : p
          )
      }));

      const passoAtual = activeExecucao.passos_executados.find(p => p.id === currentStepId);
      const nomeAcaoPasso = passoAtual?.passo_caso_teste?.acao || "Passo desconhecido";
      
      const tituloCompleto = `${defectInfo.titulo} (Passo: ${nomeAcaoPasso})`;

      const newDefect = { 
          titulo: tituloCompleto,
          descricao: defectInfo.descricao,
          severidade: defectInfo.severidade,
          status: 'aberto', 
          execucao_teste_id: activeExecucao.id,
          projeto_id: activeExecucao.caso_teste.projeto_id,
          evidencias: evidenciasJSON, 
          _passo_id_local: currentStepId 
      };

      setDefectsQueue(prev => {
          const filtered = prev.filter(d => d._passo_id_local !== currentStepId);
          return [...filtered, newDefect];
      });

      setStepStatuses(prev => ({ ...prev, [currentStepId]: 'reprovado' }));
      setIsDefectModalOpen(false);
      setDefectToEdit(null);
      success("Falha registrada com o passo identificado.");
  };

  const requestFinishExecution = () => {
    if (isReadOnly) return;

    const passos = activeExecucao?.passos_executados || [];
    const missing = passos.filter(p => !stepStatuses[p.id] && (!p.status || p.status === 'pendente'));

    if (missing.length > 0) {
        warning(`Faltam ${missing.length} passos para validar.`);
        return;
    }

    const allPassed = Object.values(stepStatuses).every(s => s === 'aprovado');
    const resultadoTexto = allPassed ? 'Aprovado' : 'Com Falhas';

    setConfirmModal({
        isOpen: true,
        title: "Finalizar Tarefa?",
        message: `Resultado: ${resultadoTexto}. A tarefa será marcada como "FECHADO" e não poderá mais ser editada. Confirmar?`,
        isDanger: !allPassed,
        // Envia 'fechado' fixo, independente do resultado (conforme solicitado)
        onConfirm: () => finishExecutionConfirm('fechado') 
    });
  };

  const finishExecutionConfirm = async (statusFinal) => {
      setLoading(true);
      try {
          // 1. Enviar Defeitos
          for (const defect of defectsQueue) {
              const { _passo_id_local, ...payload } = defect;
              await api.post("/defeitos/", payload);
          }

          // 2. Atualizar Passos
          const stepPromises = Object.entries(stepStatuses).map(([passoId, status]) => 
              api.put(`/testes/execucoes/passos/${passoId}`, { status })
          );
          await Promise.all(stepPromises);

          // 3. Finalizar com status 'fechado'
          await api.put(`/testes/execucoes/${activeExecucao.id}/finalizar?status=${statusFinal}`);
          
          setActiveExecucao(prev => ({ ...prev, status_geral: statusFinal }));
          success("Tarefa fechada com sucesso!");
          
          localStorage.removeItem(`queue_${activeExecucao.id}`);
          localStorage.removeItem(`statuses_${activeExecucao.id}`);
          setDefectsQueue([]);
          setStepStatuses({});
          
          loadMinhasTarefas(); 

      } catch (err) { 
          const msg = err.response?.data?.detail || "Erro ao sincronizar.";
          error(`Falha: ${msg}`); 
      } finally { setLoading(false); }
  };

  const executionWithLocalState = activeExecucao ? {
      ...activeExecucao,
      passos_executados: activeExecucao.passos_executados.map(p => ({
          ...p,
          status: stepStatuses[p.id] || p.status || 'pendente',
          evidencias: typeof p.evidencias === 'string' ? JSON.parse(p.evidencias || '[]') : (p.evidencias || [])
      }))
  } : null;

  return (
    <main className="container">
      <ConfirmationModal 
        isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} isDanger={confirmModal.isDanger}
      />
      
      <RegisterDefectModal 
        isOpen={isDefectModalOpen} onClose={() => setIsDefectModalOpen(false)} 
        onConfirm={handleDefectConfirm} 
        initialData={defectToEdit}
      />

      <h2 className="section-title" style={{marginBottom: '15px' }}>Minhas Tarefas</h2>
      
      <div className={styles.container}>
          <TaskSidebar tasks={tarefas} loading={loading} activeExecId={activeExecucao?.id} onSelect={selectTask} />
          
          <ExecutionPlayer 
              tasks={tarefas} execution={executionWithLocalState} 
              onFinish={requestFinishExecution} onStepAction={handleStepAction} 
              onDeleteEvidence={() => {}} // Delete manual bloqueado na player em modo edição
              onViewGallery={setGalleryImages}
              readOnly={isReadOnly} 
          />
      </div>
      <EvidenceGallery images={galleryImages} onClose={() => setGalleryImages(null)} />
    </main>
  );
}
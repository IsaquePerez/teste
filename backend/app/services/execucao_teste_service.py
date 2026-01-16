from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile 
from typing import Optional, List 
from app.repositories.execucao_teste_repository import ExecucaoTesteRepository
from app.repositories.ciclo_teste_repository import CicloTesteRepository
from app.repositories.caso_teste_repository import CasoTesteRepository
from app.schemas.execucao_teste import ExecucaoTesteResponse, ExecucaoPassoResponse, ExecucaoPassoUpdate
from app.models.testing import StatusExecucaoEnum, StatusPassoEnum
import json
import shutil
import uuid
import os

class ExecucaoTesteService:
    def __init__(self, db: AsyncSession):
        self.repo = ExecucaoTesteRepository(db)
        self.ciclo_repo = CicloTesteRepository(db)
        self.caso_repo = CasoTesteRepository(db)

    async def alocar_teste(self, ciclo_id: int, caso_id: int, responsavel_id: int):
        ciclo = await self.ciclo_repo.get_by_id(ciclo_id)
        if not ciclo:
             raise HTTPException(status_code=404, detail="Ciclo não encontrado")
        
        caso = await self.caso_repo.get_by_id(caso_id)
        if not caso:
             raise HTTPException(status_code=404, detail="Caso de Teste não encontrado")

        nova_execucao = await self.repo.criar_planejamento(ciclo_id, caso_id, responsavel_id)
        return ExecucaoTesteResponse.model_validate(nova_execucao)

    async def listar_tarefas_usuario(self, usuario_id: int, status: Optional[StatusExecucaoEnum] = None, skip: int = 0, limit: int = 20):
        items = await self.repo.get_minhas_execucoes(usuario_id, status, skip, limit)
        return [ExecucaoTesteResponse.model_validate(i) for i in items]
    
    async def obter_execucao(self, execucao_id: int):
        execucao = await self.repo.get_by_id(execucao_id)
        if not execucao:
            return None
        return ExecucaoTesteResponse.model_validate(execucao)

    # --- LÓGICA DE ATUALIZAÇÃO AUTOMÁTICA ---
    async def registrar_resultado_passo(self, passo_id: int, dados: ExecucaoPassoUpdate):
        # 1. Atualiza o passo
        passo = await self.repo.get_execucao_passo(passo_id)
        if not passo:
             raise HTTPException(status_code=404, detail="Passo da execução não encontrado")
        
        atualizado = await self.repo.update_passo(passo_id, dados)
        
        # 2. Recalcula o status do teste pai
        await self._calcular_status_automatico(atualizado.execucao_teste_id)

        return ExecucaoPassoResponse.model_validate(atualizado)
    
    async def _calcular_status_automatico(self, execucao_id: int):
        """
        Regra:
        1. 1 Reprovado -> Teste FALHOU
        2. 1 Bloqueado (e 0 reprovados) -> Teste BLOQUEADO
        3. Todos Aprovados -> Teste PASSOU
        4. Caso contrário -> EM PROGRESSO
        """
        execucao = await self.repo.get_by_id(execucao_id)
        if not execucao or not execucao.passos_executados:
            return

        passos = execucao.passos_executados
        
        tem_reprovado = any(p.status == StatusPassoEnum.reprovado for p in passos)
        tem_bloqueado = any(p.status == StatusPassoEnum.bloqueado for p in passos)
        todos_aprovados = all(p.status == StatusPassoEnum.aprovado for p in passos)
        tem_pendente = any(p.status == StatusPassoEnum.pendente for p in passos)

        novo_status = StatusExecucaoEnum.em_progresso

        if tem_reprovado:
            novo_status = StatusExecucaoEnum.falhou
        elif tem_bloqueado:
            novo_status = StatusExecucaoEnum.bloqueado
        elif todos_aprovados:
            novo_status = StatusExecucaoEnum.passou
        elif tem_pendente:
            novo_status = StatusExecucaoEnum.em_progresso

        if execucao.status_geral != novo_status:
            await self.repo.update_status_geral(execucao_id, novo_status)

    async def finalizar_execucao(self, execucao_id: int, status_final: StatusExecucaoEnum):
        return await self.repo.update_status_geral(execucao_id, status_final)
    
    async def upload_evidencia(self, passo_id: int, file: UploadFile):
        passo_atual = await self.repo.get_execucao_passo(passo_id)
        if not passo_atual:
             raise HTTPException(status_code=404, detail="Passo não encontrado")

        evidencias_lista = []
        if passo_atual.evidencias:
            try:
                evidencias_lista = json.loads(passo_atual.evidencias)
                if not isinstance(evidencias_lista, list):
                    evidencias_lista = [passo_atual.evidencias]
            except:
                evidencias_lista = [passo_atual.evidencias]

        if len(evidencias_lista) >= 3:
            raise HTTPException(status_code=400, detail="Limite de 3 evidências atingido.")

        os.makedirs("evidencias", exist_ok=True) 
        extensao = file.filename.split(".")[-1]
        nome_arquivo = f"{uuid.uuid4()}.{extensao}"
        caminho_arquivo = f"evidencias/{nome_arquivo}"
        
        with open(caminho_arquivo, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        url_publica = f"http://localhost:8000/{caminho_arquivo}"
        
        evidencias_lista.append(url_publica)
        
        dados_update = ExecucaoPassoUpdate(evidencias=json.dumps(evidencias_lista))
        await self.repo.update_passo(passo_id, dados_update)
        
        return {"url": url_publica, "lista_completa": evidencias_lista}
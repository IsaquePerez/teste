from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, UploadFile

from app.repositories.execucao_teste_repository import ExecucaoTesteRepository
from app.repositories.caso_teste_repository import CasoTesteRepository
from app.repositories.defeito_repository import DefeitoRepository
from app.schemas.execucao_teste import ExecucaoTesteResponse, ExecucaoPassoUpdate, ExecucaoPassoResponse
from app.schemas.defeito import DefeitoCreate
from app.models.testing import StatusExecucaoEnum, StatusPassoEnum

class ExecucaoTesteService:
    def __init__(self, db: AsyncSession):
        self.repo = ExecucaoTesteRepository(db)
        self.caso_repo = CasoTesteRepository(db)
        self.defeito_repo = DefeitoRepository(db)

    async def alocar_teste(self, ciclo_id: int, caso_id: int, responsavel_id: int) -> ExecucaoTesteResponse:
        nova_exec = await self.repo.create(ciclo_id, caso_id, responsavel_id)
        return ExecucaoTesteResponse.model_validate(nova_exec)

    async def listar_tarefas_usuario(self, usuario_id: int, status: Optional[str] = None, skip: int = 0, limit: int = 20) -> List[ExecucaoTesteResponse]:
        status_enum = None
        if status:
            try:
                status_enum = StatusExecucaoEnum(status)
            except ValueError:
                pass 
        execucoes = await self.repo.get_minhas_execucoes(usuario_id, status_enum, skip, limit)
        
        return [ExecucaoTesteResponse.model_validate(e) for e in execucoes]

    async def obter_execucao(self, execucao_id: int) -> Optional[ExecucaoTesteResponse]:
        execucao = await self.repo.get_by_id(execucao_id)
        if execucao:
            return ExecucaoTesteResponse.model_validate(execucao)
        return None

    async def registrar_resultado_passo(self, passo_id: int, dados: ExecucaoPassoUpdate) -> ExecucaoPassoResponse:        
        status_map = {
            "passou": "aprovado",
            "sucesso": "aprovado",
            "passed": "aprovado",
            
            "falhou": "reprovado",
            "falha": "reprovado",
            "failed": "reprovado"
        }
        status_convertido = status_map.get(dados.status, dados.status)
        dados.status = status_convertido
        try:
            StatusPassoEnum(dados.status)
        except ValueError:
            pass
        
        passo_atual = await self.repo.get_execucao_passo(passo_id)
        if not passo_atual:
            raise HTTPException(status_code=404, detail="Passo de execução não encontrado")

        atualizado = await self.repo.update_passo(passo_id, dados)
        await self._atualizar_status_execucao(passo_atual.execucao_teste_id)
        
        return ExecucaoPassoResponse.model_validate(atualizado)

    async def _atualizar_status_execucao(self, execucao_id: int):
        execucao = await self.repo.get_by_id(execucao_id)
        if not execucao:
            return

        passos = execucao.passos_executados
        todos_status = [p.status for p in passos]
        if all(s == StatusPassoEnum.aprovado for s in todos_status):
             await self.repo.update_status_geral(execucao_id, StatusExecucaoEnum.fechado) 
        elif any(s == StatusPassoEnum.reprovado for s in todos_status): 
             await self.repo.update_status_geral(execucao_id, StatusExecucaoEnum.em_progresso)
        else:
             if execucao.status_geral == StatusExecucaoEnum.pendente:
                 await self.repo.update_status_geral(execucao_id, StatusExecucaoEnum.em_progresso)

    async def finalizar_execucao(self, execucao_id: int, status_final: StatusExecucaoEnum) -> Optional[ExecucaoTesteResponse]:
        execucao = await self.repo.update_status_geral(execucao_id, status_final)
        if execucao:
            return ExecucaoTesteResponse.model_validate(execucao)
        return None

    async def upload_evidencia(self, passo_id: int, file: UploadFile) -> dict:
        import shutil
        import os
        import uuid
        
        os.makedirs("evidencias", exist_ok=True)
        extension = os.path.splitext(file.filename)[1]
        if not extension:
            extension = ".jpg"
            
        safe_filename = f"{passo_id}_{uuid.uuid4()}{extension}"
        file_path = f"evidencias/{safe_filename}"
        await file.seek(0)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        full_url = f"http://localhost:8000/evidencias/{safe_filename}"
        
        return {"url": full_url}
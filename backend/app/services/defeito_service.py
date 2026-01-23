from typing import List, Optional, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.usuario import Usuario
from app.models.testing import StatusExecucaoEnum, StatusDefeitoEnum 
from app.models.nivel_acesso import NivelAcessoEnum
from app.repositories.defeito_repository import DefeitoRepository
from app.repositories.execucao_teste_repository import ExecucaoTesteRepository 
from app.schemas.defeito import DefeitoCreate, DefeitoUpdate, DefeitoResponse

class DefeitoService:
    def __init__(self, db: AsyncSession):
        self.repo = DefeitoRepository(db)
        self.execucao_repo = ExecucaoTesteRepository(db)

    async def registrar_defeito(self, dados: DefeitoCreate):
        return await self.repo.create(dados)

    async def listar_todos(self, current_user: Usuario, filtro_responsavel_id: Optional[int] = None):
        
        is_admin = False
        if current_user.nivel_acesso:
             is_admin = current_user.nivel_acesso.nome == NivelAcessoEnum.admin or current_user.nivel_acesso.nome == "admin"

        if not is_admin:
            return await self.repo.get_all_with_details(responsavel_id=current_user.id)
        
        return await self.repo.get_all_with_details(responsavel_id=filtro_responsavel_id)

    async def atualizar_defeito(self, id: int, dados: DefeitoUpdate):
        defeito_atualizado = await self.repo.update(id, dados)
        
        if not defeito_atualizado:
            return None

        if dados.status == StatusDefeitoEnum.corrigido:
            await self.execucao_repo.update_status(
                defeito_atualizado.execucao_teste_id, 
                StatusExecucaoEnum.reteste
            )
        
        return defeito_atualizado

    async def excluir_defeito(self, id: int):
        return await self.repo.delete(id)
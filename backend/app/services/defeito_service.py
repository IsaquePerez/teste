from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence, Optional

from app.repositories.defeito_repository import DefeitoRepository
from app.schemas.defeito import DefeitoCreate, DefeitoUpdate, DefeitoResponse

class DefeitoService:
    def __init__(self, db: AsyncSession):
        self.repo = DefeitoRepository(db)

    async def registrar_defeito(self, dados: DefeitoCreate) -> DefeitoResponse:
        defeito = await self.repo.create(dados)
        return DefeitoResponse.model_validate(defeito)

    async def listar_por_execucao(self, execucao_id: int) -> Sequence[DefeitoResponse]:
        items = await self.repo.get_by_execucao(execucao_id)
        return [DefeitoResponse.model_validate(i) for i in items]

    async def atualizar_defeito(self, id: int, dados: DefeitoUpdate) -> Optional[DefeitoResponse]:
        update_data = dados.model_dump(exclude_unset=True)
        updated = await self.repo.update(id, update_data)
        if updated:
            return DefeitoResponse.model_validate(updated)
        return None
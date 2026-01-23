from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from typing import Sequence, Optional

from app.repositories.projeto_repository import ProjetoRepository
from app.schemas.projeto import ProjetoCreate, ProjetoUpdate, ProjetoResponse
from app.core.errors import tratar_erro_integridade

class ProjetoService:
    def __init__(self, db: AsyncSession):
        self.repo = ProjetoRepository(db)

    async def create_projeto(self, dados: ProjetoCreate) -> ProjetoResponse:
        try:
            novo_projeto = await self.repo.create(dados)
            return ProjetoResponse.model_validate(novo_projeto)
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e, {
                "modulo_id": "Módulo inválido.",
                "responsavel_id": "Responsável inválido."
            })

    async def get_all_projetos(self) -> Sequence[ProjetoResponse]:
        items = await self.repo.get_all()
        return [ProjetoResponse.model_validate(i) for i in items]

    async def get_projeto_by_id(self, id: int) -> Optional[ProjetoResponse]:
        item = await self.repo.get_by_id(id)
        if item:
            return ProjetoResponse.model_validate(item)
        return None

    async def update_projeto(self, id: int, dados: ProjetoUpdate) -> Optional[ProjetoResponse]:
        try:
            # model_dump(exclude_unset=True) é importante para parciais
            item = await self.repo.update(id, dados.model_dump(exclude_unset=True))
            if item:
                return ProjetoResponse.model_validate(item)
            return None
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e)

    async def delete_projeto(self, id: int) -> bool:
        try:
            return await self.repo.delete(id)
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e, {
                "foreign key": "Não é possível excluir este projeto pois ele possui Ciclos ou Casos de Teste."
            })
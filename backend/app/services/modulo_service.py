from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from typing import Sequence, Optional

from app.repositories.modulo_repository import ModuloRepository
from app.schemas.modulo import ModuloCreate, ModuloUpdate, ModuloResponse
from app.core.errors import tratar_erro_integridade

class ModuloService:
    def __init__(self, db: AsyncSession):
        self.repo = ModuloRepository(db)

    async def create_modulo(self, dados: ModuloCreate) -> ModuloResponse:
        try:
            novo_modulo = await self.repo.create(dados)
            return ModuloResponse.model_validate(novo_modulo)
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e, {
                "sistema_id": "O sistema informado não existe."
            })

    async def get_all_modulos(self) -> Sequence[ModuloResponse]:
        items = await self.repo.get_all()
        return [ModuloResponse.model_validate(i) for i in items]

    async def get_modulo_by_id(self, id: int) -> Optional[ModuloResponse]:
        item = await self.repo.get_by_id(id)
        if item:
            return ModuloResponse.model_validate(item)
        return None

    async def update_modulo(self, id: int, dados: ModuloUpdate) -> Optional[ModuloResponse]:
        try:
            item = await self.repo.update(id, dados.model_dump(exclude_unset=True))
            if item:
                return ModuloResponse.model_validate(item)
            return None
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e)

    async def delete_modulo(self, id: int) -> bool:
        try:
            return await self.repo.delete(id)
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e, {
                "foreign key": "Não é possível excluir este módulo pois ele possui Projetos vinculados."
            })
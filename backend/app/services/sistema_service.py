from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from typing import Sequence, Optional

from app.models import Sistema
from app.repositories.sistema_repository import SistemaRepository
from app.schemas import SistemaCreate, SistemaUpdate

class SistemaService:
    def __init__(self, db: AsyncSession):
        self.repo = SistemaRepository(db)

    async def create_sistema(self, sistema_data: SistemaCreate) -> Sistema:
        existente = await self.repo.get_by_nome(sistema_data.nome)
        if existente:
            raise HTTPException(status_code=400, detail=f"Sistema com nome '{sistema_data.nome}' já existe.")

        novo_sistema = await self.repo.create_sistema(sistema_data)
        return novo_sistema

    async def get_all_sistemas(self) -> Sequence[Sistema]:
        """
        Orquestra a busca por todos os sistemas.
        """
        return await self.repo.get_all_sistemas()

    async def get_sistema_by_id(self, sistema_id: int) -> Sistema | None:
        """
        Orquestra a busca de um sistema pelo seu ID.
        """
        return await self.repo.get_sistema_by_id(sistema_id)

    async def update_sistema(self, sistema_id: int, sistema_data: SistemaUpdate) -> Optional[Sistema]:
        """
        Orquestra a atualização de um sistema.
        """
        # Pode adicionar lógicas aqui, como verificar se o sistema existe antes de atualizar
        return await self.repo.update_sistema(sistema_id, sistema_data)

    async def delete_sistema(self, sistema_id: int) -> bool:
        """
        Orquestra a remoção de um sistema.
        """
        return await self.repo.delete_sistema(sistema_id)
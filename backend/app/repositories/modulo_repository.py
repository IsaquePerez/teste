from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update as sqlalchemy_update, delete as sqlalchemy_delete
from typing import Sequence, Optional

from app.models.modulo import Modulo
from app.schemas.modulo import ModuloCreate

class ModuloRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, modulo_data: ModuloCreate) -> Modulo:
        db_modulo = Modulo(**modulo_data.model_dump())
        self.db.add(db_modulo)
        await self.db.commit()
        await self.db.refresh(db_modulo)
        return db_modulo

    async def get_all(self) -> Sequence[Modulo]:
        result = await self.db.execute(select(Modulo))
        return result.scalars().all()

    async def get_by_id(self, modulo_id: int) -> Optional[Modulo]:
        result = await self.db.execute(select(Modulo).where(Modulo.id == modulo_id))
        return result.scalars().first()
    
    async def get_by_nome_e_sistema(self, nome: str, sistema_id: int) -> Optional[Modulo]:
        query = select(Modulo).where(
            Modulo.nome == nome, 
            Modulo.sistema_id == sistema_id
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def update(self, modulo_id: int, dados: dict) -> Optional[Modulo]:
        if not dados:
            return await self.get_by_id(modulo_id)

        query = (
            sqlalchemy_update(Modulo)
            .where(Modulo.id == modulo_id)
            .values(**dados)
            .returning(Modulo)
        )
        result = await self.db.execute(query)
        await self.db.commit()
        return result.scalars().first()

    async def delete(self, modulo_id: int) -> bool:
        query = sqlalchemy_delete(Modulo).where(Modulo.id == modulo_id)
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0
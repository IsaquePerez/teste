from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update as sqlalchemy_update, delete as sqlalchemy_delete
from typing import Sequence, Optional

from app.models import Modulo
from app.schemas import ModuloCreate, ModuloUpdate

class ModuloRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_modulo(self, modulo_data: ModuloCreate) -> Modulo:
        db_modulo = Modulo(**modulo_data.model_dump())
        self.db.add(db_modulo)
        await self.db.commit()
        await self.db.refresh(db_modulo)
        return db_modulo

    async def get_all_modulos(self) -> Sequence[Modulo]:
        result = await self.db.execute(select(Modulo))
        return result.scalars().all()

    async def get_modulo_by_id(self, modulo_id: int) -> Optional[Modulo]:
        result = await self.db.execute(select(Modulo).where(Modulo.id == modulo_id))
        return result.scalars().first()
    
    async def get_by_nome_e_sistema(self, nome: str, sistema_id: int) -> Optional[Modulo]:
        query = select(Modulo).where(
            Modulo.nome == nome, 
            Modulo.sistema_id == sistema_id
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def update_modulo(self, modulo_id: int, modulo_data: ModuloUpdate) -> Optional[Modulo]:
        update_data = modulo_data.model_dump(exclude_unset=True)
        if not update_data:
            return await self.get_modulo_by_id(modulo_id)

        query = (
            sqlalchemy_update(Modulo)
            .where(Modulo.id == modulo_id)
            .values(**update_data)
            .returning(Modulo)
        )
        result = await self.db.execute(query)
        await self.db.commit()
        return result.scalars().first()

    async def delete_modulo(self, modulo_id: int) -> bool:
        query = sqlalchemy_delete(Modulo).where(Modulo.id == modulo_id)
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0
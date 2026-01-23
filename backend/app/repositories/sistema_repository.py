from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update as sqlalchemy_update, delete as sqlalchemy_delete
from typing import Sequence, Optional

from app.models import Sistema
from app.schemas import SistemaCreate, SistemaUpdate

class SistemaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_sistema(self, sistema_data: SistemaCreate) -> Sistema:
        db_sistema = Sistema(**sistema_data.model_dump())
        self.db.add(db_sistema)
        await self.db.commit()
        await self.db.refresh(db_sistema)
        return db_sistema

    async def get_all_sistemas(self) -> Sequence[Sistema]:
        result = await self.db.execute(select(Sistema))
        return result.scalars().all()

    async def get_sistema_by_id(self, sistema_id: int) -> Sistema | None:
        result = await self.db.execute(
            select(Sistema).where(Sistema.id == sistema_id)
        )
        return result.scalars().first()
    
    async def get_by_nome(self, nome: str) -> Optional[Sistema]:
        query = select(Sistema).where(Sistema.nome == nome)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def update_sistema(self, sistema_id: int, sistema_data: SistemaUpdate) -> Optional[Sistema]:
        update_data = sistema_data.model_dump(exclude_unset=True)
        
        if not update_data:
            return await self.get_sistema_by_id(sistema_id)

        query = (
            sqlalchemy_update(Sistema)
            .where(Sistema.id == sistema_id)
            .values(**update_data)
            .returning(Sistema)
        )
        result = await self.db.execute(query)
        await self.db.commit()
        return result.scalars().first()

    async def delete_sistema(self, sistema_id: int) -> bool:
        query = sqlalchemy_delete(Sistema).where(Sistema.id == sistema_id)
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0
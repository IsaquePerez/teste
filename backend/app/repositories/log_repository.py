from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Sequence
from app.models.log import LogSistema
from app.schemas.log import LogCreate

class LogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, dados: LogCreate) -> LogSistema:
        novo_log = LogSistema(**dados.model_dump())
        self.db.add(novo_log)
        await self.db.commit()
        await self.db.refresh(novo_log)
        return novo_log

    async def get_all(self, limit: int = 100) -> Sequence[LogSistema]:
        query = (
            select(LogSistema)
            .options(
                selectinload(LogSistema.usuario),
                selectinload(LogSistema.sistema)
            )
            .order_by(LogSistema.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def delete(self, id: int):
        log = await self.db.get(LogSistema, id)
        if log:
            await self.db.delete(log)
            await self.db.commit()
            return True
        return False
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import Optional
from app.models.password_reset import PasswordReset

class PasswordResetRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_token(self, password_reset: PasswordReset) -> PasswordReset:
        self.db.add(password_reset)
        await self.db.commit()
        await self.db.refresh(password_reset)
        return password_reset

    async def get_by_token(self, token: str) -> Optional[PasswordReset]:
        query = select(PasswordReset).where(PasswordReset.token == token)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_usuario_id(self, usuario_id: int) -> Optional[PasswordReset]:
        query = select(PasswordReset).where(PasswordReset.id_usuario == usuario_id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def delete_token(self, token_id: int) -> None:
        query = delete(PasswordReset).where(PasswordReset.id == token_id)
        await self.db.execute(query)
        await self.db.commit()
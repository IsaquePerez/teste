from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import update as sqlalchemy_update, delete as sqlalchemy_delete
from typing import Sequence, Optional
from app.models.usuario import Usuario

class UsuarioRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_usuario(self, usuario: Usuario) -> Usuario:
        self.db.add(usuario)
        await self.db.commit()
        await self.db.refresh(usuario)
        return await self.get_usuario_by_id(usuario.id)

    async def get_all_usuarios(self, ativo: Optional[bool] = None) -> Sequence[Usuario]:
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso))
        if ativo is not None:
            query = query.where(Usuario.ativo == ativo)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_usuario_by_id(self, usuario_id: int) -> Optional[Usuario]:
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.id == usuario_id)
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def get_usuario_by_email(self, email: str) -> Optional[Usuario]:
         query = select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.email == email)
         result = await self.db.execute(query)
         return result.scalars().first()

    async def get_usuario_by_username(self, username: str) -> Optional[Usuario]:
         query = select(Usuario).where(Usuario.username == username)
         result = await self.db.execute(query)
         return result.scalars().first()

    async def update_usuario(self, usuario_id: int, update_data: dict) -> Optional[Usuario]:
        query = (
            sqlalchemy_update(Usuario)
            .where(Usuario.id == usuario_id)
            .values(**update_data) 
            .returning(Usuario.id)
        )
        result = await self.db.execute(query)
        await self.db.commit()
        
        updated_id = result.scalars().first()
        if updated_id:
             return await self.get_usuario_by_id(updated_id)
        return None

    async def delete_usuario(self, usuario_id: int) -> bool:
        query = sqlalchemy_delete(Usuario).where(Usuario.id == usuario_id)
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0
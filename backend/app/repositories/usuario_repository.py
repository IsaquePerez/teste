from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.usuario import Usuario

class UsuarioRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> Optional[Usuario]:
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.id == user_id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Optional[Usuario]:
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.email == email)
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def get_by_username(self, username: str) -> Optional[Usuario]:
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.username == username)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_all_usuarios(self, ativo: Optional[bool] = None) -> List[Usuario]:
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso))
        if ativo is not None:
            query = query.where(Usuario.ativo == ativo)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create_usuario(self, usuario: Usuario) -> Usuario:
        self.db.add(usuario)
        await self.db.commit()
        await self.db.refresh(usuario)
        
        await self.db.execute(
            select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.id == usuario.id)
        )
        return usuario
    
    async def update_usuario(self, usuario_id: int, update_data: dict) -> Optional[Usuario]:
        db_obj = await self.get_by_id(usuario_id)
        if not db_obj:
            return None
            
        for field, value in update_data.items():
            setattr(db_obj, field, value)
            
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete_usuario(self, usuario_id: int) -> bool:
        db_obj = await self.get_by_id(usuario_id)
        if not db_obj:
            return False
            
        await self.db.delete(db_obj)
        await self.db.commit()
        return True
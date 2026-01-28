from typing import Optional, List, Union, Any, Dict
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
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso)).order_by(Usuario.id)
        if ativo is not None:
            query = query.where(Usuario.ativo == ativo)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, usuario: Usuario) -> Usuario:
        self.db.add(usuario)
        await self.db.commit()        
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.id == usuario.id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def update(self, user_id: int, update_data: Dict[str, Any]) -> Optional[Usuario]:
        db_obj = await self.get_by_id(user_id)
        if not db_obj:
            return None

        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
            
        self.db.add(db_obj)
        await self.db.commit()
        
        return await self.get_by_id(user_id)
    
    async def delete(self, user_id: int) -> bool:
        usuario = await self.get_by_id(user_id)
        if usuario:
            await self.db.delete(usuario)
            await self.db.commit()
            return True
        return False
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload  # <--- IMPORTANTE
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate

class UsuarioRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> Optional[Usuario]:
        # Carrega o nivel_acesso junto para evitar erro no Pydantic
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

    # --- MÉTODO CORRIGIDO E ADICIONADO ---
    async def get_all_usuarios(self, ativo: Optional[bool] = None) -> List[Usuario]:
        # Carrega nivel_acesso para todos
        query = select(Usuario).options(selectinload(Usuario.nivel_acesso))
        
        if ativo is not None:
            query = query.where(Usuario.ativo == ativo)
            
        result = await self.db.execute(query)
        return result.scalars().all()
    # -------------------------------------

    async def create(self, usuario: UsuarioCreate) -> Usuario:
        db_obj = Usuario(
            nome=usuario.nome,
            username=usuario.username,
            email=usuario.email,
            senha_hash=usuario.senha,
            nivel_acesso_id=usuario.nivel_acesso_id,
            ativo=usuario.ativo
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        # Importante: carregar o relacionamento após criar para retornar completo
        await self.db.execute(
            select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.id == db_obj.id)
        )
        return db_obj
    
    async def update(self, db_obj: Usuario, obj_in: UsuarioUpdate) -> Usuario:
        update_data = obj_in.dict(exclude_unset=True)
        if "senha" in update_data:
            update_data["senha_hash"] = update_data.pop("senha")
            
        for field, value in update_data.items():
            setattr(db_obj, field, value)
            
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj
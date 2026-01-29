from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from typing import Sequence, Optional
from fastapi import HTTPException, status

from app.models.usuario import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from app.core.security import get_password_hash
from app.core.errors import tratar_erro_integridade

class UsuarioService:
    def __init__(self, db: AsyncSession):
        self.repo = UsuarioRepository(db)

    async def get_all_usuarios(self, ativo: Optional[bool] = None) -> Sequence[UsuarioResponse]:
        db_usuarios = await self.repo.get_all_usuarios(ativo) 
        return [UsuarioResponse.model_validate(u) for u in db_usuarios]
    
    async def get_usuario_by_id(self, usuario_id: int) -> Optional[UsuarioResponse]:
        db_usuario = await self.repo.get_by_id(usuario_id)
        if db_usuario:
            return UsuarioResponse.model_validate(db_usuario)
        return None
    
    async def get_usuario_by_email(self, email: str):
        return await self.repo.get_by_email(email)

    async def get_usuario_by_username(self, username: str):
        return await self.repo.get_by_username(username)

    async def create_usuario(self, usuario_data: UsuarioCreate) -> UsuarioResponse:
        if await self.repo.get_by_email(usuario_data.email):
            raise HTTPException(status_code=400, detail="Email já registado.")
        
        if usuario_data.username and await self.repo.get_by_username(usuario_data.username):
            raise HTTPException(status_code=400, detail="Username já em uso.")

        db_usuario = Usuario(
            nome=usuario_data.nome,
            username=usuario_data.username,
            email=usuario_data.email,
            senha_hash=get_password_hash(usuario_data.senha), 
            nivel_acesso_id=usuario_data.nivel_acesso_id,
            ativo=usuario_data.ativo
        )
        
        try:
            novo_usuario_db = await self.repo.create(db_usuario)
            return UsuarioResponse.model_validate(novo_usuario_db)
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e, {
                "username": "ID de usuário já existente.",
                "email": "Email já existente."
            })

    async def update_usuario(self, usuario_id: int, usuario_data: UsuarioUpdate) -> Optional[UsuarioResponse]:
        update_dict = usuario_data.model_dump(exclude_unset=True)
        
        if not update_dict:
             raise HTTPException(status_code=400, detail="Nenhum dado fornecido para atualização.")

        if 'senha' in update_dict:
            update_dict['senha_hash'] = get_password_hash(update_dict.pop('senha'))

        try:
            usuario_atualizado_db = await self.repo.update(usuario_id, update_dict)
            
            if usuario_atualizado_db:
                return UsuarioResponse.model_validate(usuario_atualizado_db)
            return None
        except IntegrityError as e:
            await self.repo.db.rollback()
            tratar_erro_integridade(e, {
                "username": "ID de usuário já em uso por outra pessoa.",
                "email": "Este email já está em uso por outra pessoa."
            })

    async def delete_usuario(self, usuario_id: int) -> bool:
        usuario_alvo = await self.repo.get_by_id(usuario_id)        
        
        if not usuario_alvo:
            return False 
        
        if usuario_alvo.nivel_acesso and usuario_alvo.nivel_acesso.nome.lower() == 'admin':
            pass 

        if usuario_alvo.ativo:
            raise HTTPException(
                status_code=400, 
                detail="Ação negada: O usuário deve estar DESATIVADO antes de ser excluído permanentemente."
            )

        try:
            return await self.repo.delete(usuario_id)
        except IntegrityError as e:
            await self.repo.db.rollback()
            raise HTTPException(
                status_code=400, 
                detail="Não é possível excluir este utilizador pois ele possui registros vinculados (projetos, testes, etc)."
            )
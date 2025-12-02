from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError # <--- IMPORTANTE: Adicione este import
from typing import Sequence, Optional
from fastapi import HTTPException

from app.models.usuario import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from app.core.security import get_password_hash

class UsuarioService:
    def __init__(self, db: AsyncSession):
        self.repo = UsuarioRepository(db)

    async def get_all_usuarios(self) -> Sequence[UsuarioResponse]:
        db_usuarios = await self.repo.get_all_usuarios()
        return[UsuarioResponse.model_validate(u) for u in db_usuarios]
    
    async def get_usuario_by_id(self, usuario_id: int) -> Optional[UsuarioResponse]:
        db_usuarios = await self.repo.get_usuario_by_id(usuario_id)
        if db_usuarios:
            return UsuarioResponse.model_validate(db_usuarios)
        return None

    async def create_usuario(self, usuario_data: UsuarioCreate) -> UsuarioResponse:
        if await self.repo.get_usuario_by_email(usuario_data.email):
             raise HTTPException(status_code=400, detail="Email já cadastrado.")

        db_usuario = Usuario(
            nome=usuario_data.nome,
            email=usuario_data.email,
            senha_hash=get_password_hash(usuario_data.senha),
            nivel_acesso_id=usuario_data.nivel_acesso_id,
            ativo=usuario_data.ativo
        )
        
        try:
            novo_usuario_db = await self.repo.create_usuario(db_usuario)
            return UsuarioResponse.model_validate(novo_usuario_db)
        except IntegrityError as e:
            await self.repo.db.rollback()

            if "ix_usuarios_email" in str(e.orig):
                raise HTTPException(status_code=409, detail="Este email já está em uso por outro utilizador.")

            raise HTTPException(status_code=400, detail="Erro de integridade na base de dados.")

        except Exception as e:
            await self.repo.db.rollback()

            print(f"Erro inesperado ao criar usuário: {e}")
            raise HTTPException(status_code=500, detail="Erro interno ao criar utilizador.")

    async def update_usuario(self, usuario_id: int, usuario_data: UsuarioUpdate) -> Optional[Usuario]:
        update_user = usuario_data.model_dump(exclude_unset=True)
        if 'senha' in update_user:
            update_user['senha_hash'] = get_password_hash(update_user.pop('senha'))
        else:
            update_user.pop('senha', None)
        if not update_user:
            raise HTTPException(status_code=400, detail="Nenhum dado fornecido para atualização.")
        try:
            usuario_atualizado_db = await self.repo.update_usuario(usuario_id, update_user)
            if usuario_atualizado_db:
                return UsuarioResponse.model_validate(usuario_atualizado_db)
            return None
        except IntegrityError as e:
            await self.repo.db.rollback()
            if "ix_usuarios_email" in str(e.orig):
                 raise HTTPException(status_code=409, detail="Este email já está em uso.")
            raise HTTPException(status_code=400, detail="Erro de integridade na base de dados.")
        except Exception as e:
            await self.repo.db.rollback()
            print(f"Erro inesperado ao atualizar usuário: {e}")
            raise HTTPException(status_code=500, detail="Erro interno ao atualizar utilizador.")

    async def delete_usuario(self, usuario_id: int) -> bool:
        return await self.repo.delete_usuario(usuario_id)
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.models.usuario import Usuario
from app.schemas.token import TokenPayload
from app.repositories.usuario_repository import UsuarioRepository

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)

async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> Usuario:
    try:
        # CORREÇÃO AQUI: settings.ALGORITHM
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    # GARANTE que o repo está sendo criado corretamente
    repo = UsuarioRepository(db)
    
    # GARANTE que o tipo de dado é int
    user = await repo.get_by_id(user_id=int(token_data.sub))
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_active_user(
    current_user: Usuario = Depends(get_current_user),
) -> Usuario:
    if not current_user.ativo:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
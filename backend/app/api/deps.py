from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import get_db
from app.models.usuario import Usuario
from app.schemas.token import TokenPayload

# Define que o token deve vir no formato Bearer Token na URL /api/v1/login
# (Isso faz o cadeado aparecer no Swagger UI)
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login"
)

async def get_current_user(
    token: Annotated[str, Depends(reusable_oauth2)],
    db: AsyncSession = Depends(get_db)
) -> Usuario:
    """
    Valida o token JWT e retorna o usuário atual.
    Lança erro 401 se o token for inválido.
    Lança erro 404 se o usuário não for encontrado.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decodifica o token usando a chave secreta e o algoritmo configurados
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        
        # O 'sub' no token geralmente guarda o ID do usuário (como string)
        user_id_str: Optional[str] = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
            
        # Converte para int se o seu ID for inteiro, ou mantém string se for UUID
        # No seu caso, os IDs parecem ser inteiros (pelo create_table)
        try:
            user_id = int(user_id_str)
        except ValueError:
             raise credentials_exception
             
        token_data = TokenPayload(sub=user_id)
        
    except JWTError:
        raise credentials_exception

    # Busca o usuário no banco para garantir que ele existe e está ativo
    query = select(Usuario).where(Usuario.id == token_data.sub)
    result = await db.execute(query)
    user = result.scalars().first()

    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    if not user.ativo:
        raise HTTPException(status_code=400, detail="Usuário inativo")
        
    return user
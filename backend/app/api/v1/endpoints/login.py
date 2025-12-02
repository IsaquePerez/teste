# app/api/v1/endpoints/login.py
from datetime import timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db 
from app.models.usuario import Usuario
from app.core.security import verify_password, create_access_token # Importa a criação do token
from app.core.config import settings
from app.schemas.token import Token # Seu schema de resposta

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

# Rota alterada de "/login" para "/" (pois api.py já tem prefix="/login")
# URL Final: POST /api/v1/login/
@router.post("/", response_model=Token, summary="Login e Geração de Token")
async def login_access_token(
    data: LoginRequest, 
    db: AsyncSession = Depends(get_db)
):
    # 1. Busca usuário no banco
    query = select(Usuario).options(selectinload(Usuario.nivel_acesso)).where(Usuario.email == data.username)
    result = await db.execute(query)
    user = result.scalars().first()

    # 2. Validação de Segurança
    if not user or not verify_password(data.password, user.senha_hash):
         # Retornar sempre a mesma mensagem para não vazar se o email existe ou não
         raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    if not user.ativo:
         raise HTTPException(status_code=403, detail="Usuário inativo")

    # 3. Criação do Token JWT Profissional
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # O 'sub' (subject) geralmente é o ID ou Email (string)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.nivel_acesso.nome, "email": user.email},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.email,
        "nome": user.nome,          
        "role": user.nivel_acesso.nome
    }
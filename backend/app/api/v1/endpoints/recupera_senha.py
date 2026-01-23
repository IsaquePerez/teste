from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from passlib.context import CryptContext
from pydantic import BaseModel
from app.api.deps import get_db
from app.repositories.password_reset_repository import PasswordResetRepository
from app.repositories.usuario_repository import UsuarioRepository

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str

@router.get("/validate")
async def validate_token(token: str, db: AsyncSession = Depends(get_db)):
    reset_repo = PasswordResetRepository(db)
    reset_entry = await reset_repo.get_by_token(token)

    if not reset_entry or reset_entry.expira_em < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token inválido ou expirado.")
    
    return {"message": "Token válido"}

@router.post("/confirm")
async def reset_password_confirm(data: ResetPasswordSchema, db: AsyncSession = Depends(get_db)):
    reset_repo = PasswordResetRepository(db)
    user_repo = UsuarioRepository(db)

    reset_entry = await reset_repo.get_by_token(data.token)

    if not reset_entry or reset_entry.expira_em < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token inválido ou expirado.")
    
    user = await user_repo.get_usuario_by_id(reset_entry.id_usuario)
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    new_password_hash = pwd_context.hash(data.new_password)
    await user_repo.update_usuario(user.id, {"senha_hash": new_password_hash})
    await reset_repo.delete_token(reset_entry.id)
    
    return {"message": "Senha atualizada com sucesso!"}
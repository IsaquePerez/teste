from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.log_service import LogService
from app.schemas.log import LogResponse
from app.api.deps import get_current_active_user
from app.models.usuario import Usuario

router = APIRouter()

@router.get("/", response_model=List[LogResponse])
async def listar_logs(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    service = LogService(db)
    return await service.listar_todos()

@router.delete("/{id}", status_code=204)
async def deletar_log(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    if current_user.nivel_acesso.nome != 'admin':
        raise HTTPException(status_code=403, detail="Apenas admins podem excluir logs.")
    
    service = LogService(db)
    await service.excluir_log(id)
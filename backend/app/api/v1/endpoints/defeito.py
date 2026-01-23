from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import get_db
from app.services.defeito_service import DefeitoService
from app.schemas.defeito import DefeitoCreate, DefeitoResponse, DefeitoUpdate
from app.models.usuario import Usuario 
from app.api.deps import get_current_user

router = APIRouter()

def get_service(db: AsyncSession = Depends(get_db)) -> DefeitoService:
    return DefeitoService(db)

@router.post("/", response_model=DefeitoResponse, status_code=status.HTTP_201_CREATED)
async def criar_defeito(
    dados: DefeitoCreate, 
    service: DefeitoService = Depends(get_service)
):
    return await service.registrar_defeito(dados)

@router.get("/execucao/{execucao_id}", response_model=List[DefeitoResponse])
async def listar_defeitos_execucao(
    execucao_id: int, 
    service: DefeitoService = Depends(get_service)
):
    return await service.listar_por_execucao(execucao_id)

@router.get("/", response_model=List[DefeitoResponse])
async def listar_todos_defeitos(
    responsavel_id: Optional[int] = Query(None, description="Filtrar por ID do responsável"),
    current_user: Usuario = Depends(get_current_user),
    service: DefeitoService = Depends(get_service)
):
    return await service.listar_todos(current_user, filtro_responsavel_id=responsavel_id)

@router.put("/{id}", response_model=DefeitoResponse)
async def atualizar_defeito(
    id: int, 
    dados: DefeitoUpdate, 
    service: DefeitoService = Depends(get_service)
):
    defeito = await service.atualizar_defeito(id, dados)
    if not defeito:
        raise HTTPException(status_code=404, detail="Defeito não encontrado")
    return defeito

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_defeito(
    id: int, 
    service: DefeitoService = Depends(get_service)
):
    sucesso = await service.excluir_defeito(id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Defeito não encontrado")
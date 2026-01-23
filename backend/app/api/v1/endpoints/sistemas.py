from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence, Optional
from app.core.database import AsyncSessionLocal
from app.schemas import SistemaCreate, SistemaResponse, SistemaUpdate
from app.services.sistema_service import SistemaService

router = APIRouter()

async def get_db_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

def get_sistema_service(db: AsyncSession = Depends(get_db_session)) -> SistemaService:
    return SistemaService(db)

@router.post("/", response_model=SistemaResponse, status_code=status.HTTP_201_CREATED, summary="Criar um novo sistema")
async def create_sistema(
    sistema: SistemaCreate,
    service: SistemaService = Depends(get_sistema_service)
):
    return await service.create_sistema(sistema)

@router.get("/", response_model=Sequence[SistemaResponse], summary="Listar todos os sistemas")
async def get_sistemas(
    service: SistemaService = Depends(get_sistema_service)
):
    return await service.get_all_sistemas()

@router.get("/{sistema_id}", response_model=SistemaResponse, summary="Obter um sistema por ID")
async def get_sistema(
    sistema_id: int,
    service: SistemaService = Depends(get_sistema_service)
):
    db_sistema = await service.get_sistema_by_id(sistema_id)
    if db_sistema is None:
        raise HTTPException(status_code=404, detail="Sistema não encontrado")
    return db_sistema

@router.put("/{sistema_id}", response_model=SistemaResponse, summary="Atualizar um sistema")
async def update_sistema(
    sistema_id: int,
    sistema: SistemaUpdate,
    service: SistemaService = Depends(get_sistema_service)
):
    updated_sistema = await service.update_sistema(sistema_id, sistema)
    if not updated_sistema:
        raise HTTPException(status_code=404, detail="Sistema não encontrado")
    return updated_sistema

@router.delete("/{sistema_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Apagar um sistema")
async def delete_sistema(
    sistema_id: int,
    service: SistemaService = Depends(get_sistema_service)
):
    success = await service.delete_sistema(sistema_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sistema não encontrado")
    return
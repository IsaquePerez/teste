from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence
from .sistemas import get_db_session 
from app.schemas import ModuloCreate, ModuloResponse, ModuloUpdate
from app.services.modulo_service import ModuloService

router = APIRouter()

def get_modulo_service(db: AsyncSession = Depends(get_db_session)) -> ModuloService:
    return ModuloService(db)

@router.post("/", response_model=ModuloResponse, status_code=status.HTTP_201_CREATED, summary="Criar um novo módulo")
async def create_modulo(
    modulo: ModuloCreate,
    service: ModuloService = Depends(get_modulo_service)
):
    return await service.create_modulo(modulo)

@router.get("/", response_model=Sequence[ModuloResponse], summary="Listar todos os módulos")
async def get_modulos(
    service: ModuloService = Depends(get_modulo_service)
):
    return await service.get_all_modulos()

@router.get("/{modulo_id}", response_model=ModuloResponse, summary="Obter um módulo por ID")
async def get_modulo(
    modulo_id: int,
    service: ModuloService = Depends(get_modulo_service)
):
    db_modulo = await service.get_modulo_by_id(modulo_id)
    if db_modulo is None:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    return db_modulo

@router.put("/{modulo_id}", response_model=ModuloResponse, summary="Atualizar um módulo")
async def update_modulo(
    modulo_id: int,
    modulo: ModuloUpdate,
    service: ModuloService = Depends(get_modulo_service)
):
    updated_modulo = await service.update_modulo(modulo_id, modulo)
    if not updated_modulo:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    return updated_modulo

@router.delete("/{modulo_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Apagar um módulo")
async def delete_modulo(
    modulo_id: int,
    service: ModuloService = Depends(get_modulo_service)
):
    success = await service.delete_modulo(modulo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    return
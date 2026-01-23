from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.projeto_service import ProjetoService
from app.schemas.projeto import ProjetoCreate, ProjetoResponse, ProjetoUpdate

router = APIRouter()

def get_service(db: AsyncSession = Depends(get_db)) -> ProjetoService:
    return ProjetoService(db)

@router.post("/", response_model=ProjetoResponse, status_code=status.HTTP_201_CREATED)
async def create_projeto(
    projeto_in: ProjetoCreate,
    service: ProjetoService = Depends(get_service)
):
    return await service.create_projeto(projeto_in)

@router.get("/", response_model=List[ProjetoResponse])
async def get_projetos(
    service: ProjetoService = Depends(get_service)
):
    return await service.get_all_projetos()

@router.get("/{projeto_id}", response_model=ProjetoResponse)
async def get_projeto(
    projeto_id: int,
    service: ProjetoService = Depends(get_service)
):
    projeto = await service.get_projeto_by_id(projeto_id)
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return projeto

@router.put("/{projeto_id}", response_model=ProjetoResponse)
async def update_projeto(
    projeto_id: int,
    projeto_in: ProjetoUpdate,
    service: ProjetoService = Depends(get_service)
):
    projeto = await service.update_projeto(projeto_id, projeto_in)
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return projeto

@router.delete("/{projeto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_projeto(
    projeto_id: int,
    service: ProjetoService = Depends(get_service)
):
    success = await service.delete_projeto(projeto_id)
    if not success:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
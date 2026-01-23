from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence, Optional

from app.core.database import AsyncSessionLocal
from app.schemas.usuario import UsuarioCreate, UsuarioResponse, UsuarioUpdate
from app.services.usuario_service import UsuarioService

router = APIRouter()

async def get_db_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

def get_usuario_service(db: AsyncSession = Depends(get_db_session)) -> UsuarioService:
    return UsuarioService(db)

@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED, summary="Criar novo usuário")
async def create_usuario(
    usuario: UsuarioCreate,
    service: UsuarioService = Depends(get_usuario_service)
):
    return await service.create_usuario(usuario)

@router.get("/", response_model=Sequence[UsuarioResponse], summary="Listar todos usuários")
async def get_usuarios(
    ativo: Optional[bool] = None,
    service: UsuarioService = Depends(get_usuario_service)
):
    return await service.get_all_usuarios(ativo)

@router.get("/{usuario_id}", response_model=UsuarioResponse, summary="Obter usuário por ID")
async def get_usuario(
    usuario_id: int,
    service: UsuarioService = Depends(get_usuario_service)
):
    db_usuario = await service.get_usuario_by_id(usuario_id)
    if db_usuario is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return db_usuario

@router.put("/{usuario_id}", response_model=UsuarioResponse, summary="Atualizar usuário")
async def update_usuario(
    usuario_id: int,
    usuario: UsuarioUpdate,
    service: UsuarioService = Depends(get_usuario_service)
):
    updated_usuario = await service.update_usuario(usuario_id, usuario)
    if not updated_usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return updated_usuario

@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Apagar usuário")
async def delete_usuario(
    usuario_id: int,
    service: UsuarioService = Depends(get_usuario_service)
):
    success = await service.delete_usuario(usuario_id)
    if not success:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return
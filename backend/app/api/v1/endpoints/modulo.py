from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence, List

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.usuario import Usuario
from app.schemas.modulo import ModuloCreate, ModuloResponse, ModuloUpdate
from app.services.modulo_service import ModuloService
from app.services.log_service import LogService

router = APIRouter()

def get_modulo_service(db: AsyncSession = Depends(get_db)) -> ModuloService:
    return ModuloService(db)

@router.post("/", response_model=ModuloResponse, status_code=status.HTTP_201_CREATED, summary="Criar um novo módulo")
async def create_modulo(
    modulo: ModuloCreate,
    service: ModuloService = Depends(get_modulo_service),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    novo_modulo = await service.create_modulo(modulo)
    
    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="CRIAR",
        entidade="Modulo",
        entidade_id=novo_modulo.id,
        detalhes=f"Criou o módulo '{novo_modulo.nome}' (Sistema ID: {novo_modulo.sistema_id})"
    )
    
    return novo_modulo

@router.get("/", response_model=Sequence[ModuloResponse], summary="Listar todos os módulos")
async def get_modulos(
    service: ModuloService = Depends(get_modulo_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.get_all_modulos()

@router.get("/{modulo_id}", response_model=ModuloResponse, summary="Obter um módulo por ID")
async def get_modulo(
    modulo_id: int,
    service: ModuloService = Depends(get_modulo_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    db_modulo = await service.get_modulo_by_id(modulo_id)
    if db_modulo is None:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    return db_modulo

@router.put("/{modulo_id}", response_model=ModuloResponse, summary="Atualizar um módulo")
async def update_modulo(
    modulo_id: int,
    modulo: ModuloUpdate,
    service: ModuloService = Depends(get_modulo_service),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    updated_modulo = await service.update_modulo(modulo_id, modulo)
    if not updated_modulo:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    
    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="ATUALIZAR",
        entidade="Modulo",
        entidade_id=updated_modulo.id,
        detalhes=f"Atualizou o módulo '{updated_modulo.nome}'"
    )

    return updated_modulo

@router.delete("/{modulo_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Apagar um módulo")
async def delete_modulo(
    modulo_id: int,
    service: ModuloService = Depends(get_modulo_service),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    modulo_antigo = await service.get_modulo_by_id(modulo_id)
    nome_modulo = modulo_antigo.nome if modulo_antigo else str(modulo_id)

    success = await service.delete_modulo(modulo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    
    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="DELETAR",
        entidade="Modulo",
        entidade_id=modulo_id,
        detalhes=f"Apagou o módulo '{nome_modulo}'"
    )
    
    return
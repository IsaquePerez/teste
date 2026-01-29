from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence, Optional
from app.core.database import AsyncSessionLocal
from app.schemas import SistemaCreate, SistemaResponse, SistemaUpdate
from app.services.sistema_service import SistemaService
from app.services.log_service import LogService
from app.api.deps import get_current_active_user
from app.models.usuario import Usuario

router = APIRouter()

async def get_db_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

def get_sistema_service(db: AsyncSession = Depends(get_db_session)) -> SistemaService:
    return SistemaService(db)

@router.post("/", response_model=SistemaResponse, status_code=status.HTTP_201_CREATED, summary="Criar um novo sistema")
async def create_sistema(
    sistema: SistemaCreate,
    service: SistemaService = Depends(get_sistema_service),
    db: AsyncSession = Depends(get_db_session),
    current_user: Usuario = Depends(get_current_active_user)
):
    novo_sistema = await service.create_sistema(sistema)
    
    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="CRIAR",
        entidade="Sistema",
        entidade_id=novo_sistema.id,
        sistema_id=novo_sistema.id,
        detalhes=f"Criou o sistema '{novo_sistema.nome}'"
    )
    
    return novo_sistema

@router.get("/", response_model=Sequence[SistemaResponse], summary="Listar todos os sistemas")
async def get_sistemas(
    service: SistemaService = Depends(get_sistema_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.get_all_sistemas()

@router.get("/{sistema_id}", response_model=SistemaResponse, summary="Obter um sistema por ID")
async def get_sistema(
    sistema_id: int,
    service: SistemaService = Depends(get_sistema_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    db_sistema = await service.get_sistema_by_id(sistema_id)
    if db_sistema is None:
        raise HTTPException(status_code=404, detail="Sistema não encontrado")
    return db_sistema

@router.put("/{sistema_id}", response_model=SistemaResponse, summary="Atualizar um sistema")
async def update_sistema(
    sistema_id: int,
    sistema: SistemaUpdate,
    service: SistemaService = Depends(get_sistema_service),
    db: AsyncSession = Depends(get_db_session),
    current_user: Usuario = Depends(get_current_active_user)
):
    updated_sistema = await service.update_sistema(sistema_id, sistema)
    if not updated_sistema:
        raise HTTPException(status_code=404, detail="Sistema não encontrado")
    
    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="ATUALIZAR",
        entidade="Sistema",
        entidade_id=updated_sistema.id,
        sistema_id=updated_sistema.id,
        detalhes=f"Atualizou o sistema '{updated_sistema.nome}'"
    )

    return updated_sistema

@router.delete("/{sistema_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Apagar um sistema")
async def delete_sistema(
    sistema_id: int,
    service: SistemaService = Depends(get_sistema_service),
    db: AsyncSession = Depends(get_db_session),
    current_user: Usuario = Depends(get_current_active_user)
):
    sistema_antigo = await service.get_sistema_by_id(sistema_id)
    nome_sistema = sistema_antigo.nome if sistema_antigo else str(sistema_id)

    success = await service.delete_sistema(sistema_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sistema não encontrado")
    
    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="DELETAR",
        entidade="Sistema",
        entidade_id=sistema_id,
        sistema_id=sistema_id,
        detalhes=f"Apagou o sistema '{nome_sistema}'"
    )
    
    return
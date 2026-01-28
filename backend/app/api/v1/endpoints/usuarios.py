from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence, Optional

from app.core.database import AsyncSessionLocal
from app.schemas.usuario import UsuarioCreate, UsuarioResponse, UsuarioUpdate
from app.services.usuario_service import UsuarioService
from app.services.log_service import LogService 
from app.api.deps import get_current_active_user
from app.models.usuario import Usuario

router = APIRouter()

async def get_db_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

def get_usuario_service(db: AsyncSession = Depends(get_db_session)) -> UsuarioService:
    return UsuarioService(db)

def truncar_texto(texto: str, limite: int = 5) -> str:
    if not texto:
        return ""
    if len(texto) > limite:
        return texto[:limite] + "..."
    return texto

@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED, summary="Criar novo usuário")
async def create_usuario(
    usuario: UsuarioCreate,
    service: UsuarioService = Depends(get_usuario_service),
    db: AsyncSession = Depends(get_db_session),
    current_user: Usuario = Depends(get_current_active_user)
):
    novo_usuario = await service.create_usuario(usuario)
    
    nome_log = truncar_texto(novo_usuario.nome, 5)

    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="CRIAR",
        entidade="Usuario",
        entidade_id=novo_usuario.id,
        detalhes=f"Criou o usuário '{nome_log}' ({novo_usuario.username})"
    )
    
    return novo_usuario

@router.get("/", response_model=Sequence[UsuarioResponse], summary="Listar todos usuários")
async def get_usuarios(
    ativo: Optional[bool] = None,
    service: UsuarioService = Depends(get_usuario_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    return await service.get_all_usuarios(ativo)

@router.get("/{usuario_id}", response_model=UsuarioResponse, summary="Obter usuário por ID")
async def get_usuario(
    usuario_id: int,
    service: UsuarioService = Depends(get_usuario_service),
    current_user: Usuario = Depends(get_current_active_user)
):
    db_usuario = await service.get_usuario_by_id(usuario_id)
    if db_usuario is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return db_usuario

@router.put("/{usuario_id}", response_model=UsuarioResponse, summary="Atualizar usuário")
async def update_usuario(
    usuario_id: int,
    usuario: UsuarioUpdate,
    service: UsuarioService = Depends(get_usuario_service),
    db: AsyncSession = Depends(get_db_session),
    current_user: Usuario = Depends(get_current_active_user)
):
    updated_usuario = await service.update_usuario(usuario_id, usuario)
    if not updated_usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    nome_log = truncar_texto(updated_usuario.nome, 5)

    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="ATUALIZAR",
        entidade="Usuario",
        entidade_id=updated_usuario.id,
        detalhes=f"Atualizou o usuário '{nome_log}' ({updated_usuario.username})"
    )

    return updated_usuario

@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Apagar usuário")
async def delete_usuario(
    usuario_id: int,
    service: UsuarioService = Depends(get_usuario_service),
    db: AsyncSession = Depends(get_db_session),
    current_user: Usuario = Depends(get_current_active_user)
):
    usuario_alvo = await service.get_usuario_by_id(usuario_id)
    
    if not usuario_alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    nome_log = truncar_texto(usuario_alvo.nome, 5)
    username_log = usuario_alvo.username
    success = await service.delete_usuario(usuario_id)
    if not success:
        raise HTTPException(status_code=404, detail="Erro ao remover usuário")
    log_service = LogService(db)
    await log_service.registrar_acao(
        usuario_id=current_user.id,
        acao="DELETAR",
        entidade="Usuario",
        entidade_id=usuario_id,
        detalhes=f"Apagou o usuário '{nome_log}' ({username_log})"
    )
    
    return
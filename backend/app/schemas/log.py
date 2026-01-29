from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LogResponse(BaseModel):
    id: int
    usuario_nome: Optional[str] = None
    sistema_nome: Optional[str] = None
    sistema_id: Optional[int] = None
    acao: str
    entidade: str
    detalhes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LogCreate(BaseModel):
    usuario_id: int
    sistema_id: Optional[int] = None
    acao: str
    entidade: str
    entidade_id: Optional[int] = None
    detalhes: Optional[str] = None
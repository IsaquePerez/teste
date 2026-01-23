from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class ModuloBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ordem: Optional[int] = None
    ativo: bool = True
    sistema_id: int

class ModuloCreate(ModuloBase):
    pass

class ModuloUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    ordem: Optional[int] = None
    ativo: Optional[bool] = None
    sistema_id: Optional[int] = None

class ModuloResponse(ModuloBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
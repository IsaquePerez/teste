from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class SistemaBase(BaseModel):
    nome: str
    descricao: str | None = None

class SistemaCreate(SistemaBase):
    pass 

class SistemaUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None

class SistemaResponse(SistemaBase):
    id: int
    nome: str
    ativo: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
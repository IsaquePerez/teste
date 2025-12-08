from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.testing import StatusCicloEnum

class CicloTesteBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None
    status: StatusCicloEnum = StatusCicloEnum.planejado
    projeto_id: int

class CicloTesteCreate(CicloTesteBase):
    pass

class CicloTesteUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[StatusCicloEnum] = None
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None

class CicloTesteResponse(CicloTesteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_testes: int = 0
    testes_concluidos: int = 0

    model_config = ConfigDict(from_attributes=True)
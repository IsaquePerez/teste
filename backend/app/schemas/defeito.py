from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.testing import StatusDefeitoEnum, SeveridadeDefeitoEnum

class DefeitoBase(BaseModel):
    titulo: str
    descricao: str
    evidencias: Optional[str] = None
    severidade: SeveridadeDefeitoEnum = SeveridadeDefeitoEnum.medio
    status: StatusDefeitoEnum = StatusDefeitoEnum.aberto
    execucao_teste_id: int

class DefeitoCreate(DefeitoBase):
    pass

class DefeitoUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    evidencias: Optional[str] = None
    severidade: Optional[SeveridadeDefeitoEnum] = None
    status: Optional[StatusDefeitoEnum] = None

class DefeitoResponse(DefeitoBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional
from app.models.testing import PrioridadeEnum

# --- PASSO DO CASO DE TESTE ---
class PassoCasoTesteBase(BaseModel):
    ordem: int
    acao: str
    resultado_esperado: str

class PassoCasoTesteCreate(PassoCasoTesteBase):
    pass

class PassoCasoTesteResponse(PassoCasoTesteBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- CASO DE TESTE ---
class CasoTesteBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    pre_condicoes: Optional[str] = None
    criterios_aceitacao: Optional[str] = None
    prioridade: PrioridadeEnum = PrioridadeEnum.media
    projeto_id: int
    responsavel_id: Optional[int] = None

class CasoTesteCreate(CasoTesteBase):
    passos: List[PassoCasoTesteCreate] = []
    ciclo_id: Optional[int] = None 

class CasoTesteUpdate(BaseModel): 
    nome: Optional[str] = None
    descricao: Optional[str] = None
    pre_condicoes: Optional[str] = None
    criterios_aceitacao: Optional[str] = None
    prioridade: Optional[PrioridadeEnum] = None
    responsavel_id: Optional[int] = None

class CasoTesteResponse(CasoTesteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    passos: List[PassoCasoTesteResponse] = []
    model_config = ConfigDict(from_attributes=True)
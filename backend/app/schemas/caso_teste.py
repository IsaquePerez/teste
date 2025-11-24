from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional
# CORREÇÃO AQUI: Importar de 'testing' onde o Enum está definido
from app.models.testing import PrioridadeEnum

# --- PASSOS (Sub-recurso de Caso de Teste) ---
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
    prioridade: PrioridadeEnum = PrioridadeEnum.media
    projeto_id: int

class CasoTesteCreate(CasoTesteBase):
    # Agora recebemos uma lista de objetos de passos
    passos: List[PassoCasoTesteCreate] = []

class CasoTesteUpdate(BaseModel): 
    nome: Optional[str] = None
    descricao: Optional[str] = None
    prioridade: Optional[PrioridadeEnum] = None
    # Atualizar passos é complexo, geralmente se faz via endpoint específico
    # passos: Optional[List[PassoCasoTesteCreate]] = None 
    projeto_id: Optional[int] = None

class CasoTesteResponse(CasoTesteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Retorna os passos detalhados
    passos: List[PassoCasoTesteResponse] = []

    model_config = ConfigDict(from_attributes=True)
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from enum import Enum

# --- ENUMS (Adicione isso se não estiver importando do model) ---
class StatusCasoTesteEnum(str, Enum):
    rascunho = "rascunho"
    ativo = "ativo"
    obsoleto = "obsoleto"
    revisao = "revisao"

# --- AUXILIARES ---
class ProjetoSimple(BaseModel):
    id: int
    nome: str
    model_config = ConfigDict(from_attributes=True)

class UsuarioSimple(BaseModel):
    id: int
    nome: str
    username: str
    model_config = ConfigDict(from_attributes=True)

class CicloSimple(BaseModel):
    id: int
    nome: str
    model_config = ConfigDict(from_attributes=True)

class PassoCasoTesteBase(BaseModel):
    ordem: int
    acao: str
    resultado_esperado: str

class PassoCasoTesteCreate(PassoCasoTesteBase):
    pass

class PassoCasoTesteResponse(PassoCasoTesteBase):
    id: int
    caso_teste_id: int
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CasoTesteBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    pre_condicoes: Optional[str] = None
    criterios_aceitacao: Optional[str] = None
    prioridade: str = "media"
    # ADICIONADO AQUI PARA LEITURA/CRIAÇÃO PADRÃO
    status: Optional[StatusCasoTesteEnum] = StatusCasoTesteEnum.rascunho 

class CasoTesteCreate(CasoTesteBase):
    responsavel_id: Optional[int] = None
    ciclo_id: Optional[int] = None
    passos: List[PassoCasoTesteCreate] = []

class CasoTesteUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    pre_condicoes: Optional[str] = None
    criterios_aceitacao: Optional[str] = None
    prioridade: Optional[str] = None
    
    # --- OBRIGATÓRIO TER AQUI PARA A EDIÇÃO FUNCIONAR ---
    status: Optional[StatusCasoTesteEnum] = None 
    
    responsavel_id: Optional[int] = None
    ciclo_id: Optional[int] = None
    passos: Optional[List[dict]] = None 

class CasoTesteResponse(CasoTesteBase):
    id: int
    projeto_id: int
    responsavel_id: Optional[int] = None
    ciclo_id: Optional[int] = None 

    created_at: datetime
    updated_at: Optional[datetime] = None
    
    projeto: Optional[ProjetoSimple] = None
    responsavel: Optional[UsuarioSimple] = None
    ciclo: Optional[CicloSimple] = None 

    passos: List[PassoCasoTesteResponse] = [] 

    model_config = ConfigDict(from_attributes=True)
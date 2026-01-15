from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# --- AUXILIARES ---

# 1. NOVO SCHEMA PARA O PROJETO
class ProjetoSimple(BaseModel):
    id: int
    nome: str
    model_config = ConfigDict(from_attributes=True)

# Schema enxuto pra retornar dados de usuário
class UsuarioSimple(BaseModel):
    id: int
    nome: str
    username: str
    model_config = ConfigDict(from_attributes=True)

# Schema enxuto para o Ciclo
class CicloSimple(BaseModel):
    id: int
    nome: str
    model_config = ConfigDict(from_attributes=True)

# --- PASSOS (STEPS) ---

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

# --- CASO DE TESTE (HEADER) ---

class CasoTesteBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    pre_condicoes: Optional[str] = None
    criterios_aceitacao: Optional[str] = None
    prioridade: str = "media"

# Payload de criação
class CasoTesteCreate(CasoTesteBase):
    responsavel_id: Optional[int] = None
    ciclo_id: Optional[int] = None
    passos: List[PassoCasoTesteCreate] = []

# Payload de atualização
class CasoTesteUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    pre_condicoes: Optional[str] = None
    criterios_aceitacao: Optional[str] = None
    prioridade: Optional[str] = None
    responsavel_id: Optional[int] = None
    ciclo_id: Optional[int] = None
    passos: Optional[List[dict]] = None 

# Objeto completo devolvido pra tela
class CasoTesteResponse(CasoTesteBase):
    id: int
    projeto_id: int
    responsavel_id: Optional[int] = None
    
    # É importante manter o ID explícito também
    ciclo_id: Optional[int] = None 

    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # --- NESTING DOS RELACIONAMENTOS ---
    
    projeto: Optional[ProjetoSimple] = None
    
    responsavel: Optional[UsuarioSimple] = None
    ciclo: Optional[CicloSimple] = None 

    passos: List[PassoCasoTesteResponse] = [] 

    model_config = ConfigDict(from_attributes=True)
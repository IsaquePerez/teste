from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.models.testing import StatusExecucaoEnum, StatusPassoEnum
from .caso_teste import CasoTesteResponse, PassoCasoTesteResponse

# --- EXECUÇÃO DE PASSOS ---

class ExecucaoPassoBase(BaseModel):
    resultado_obtido: Optional[str] = None
    status: StatusPassoEnum = StatusPassoEnum.pendente
    evidencias: Optional[str] = None

class ExecucaoPassoUpdate(BaseModel):
    resultado_obtido: Optional[str] = None
    status: StatusPassoEnum
    evidencias: Optional[str] = None

class ExecucaoPassoResponse(ExecucaoPassoBase):
    id: int
    passo_caso_teste_id: int
    updated_at: Optional[datetime] = None
    
    # Incluímos o template do passo para o front saber o que testar ("Ação", "Resultado Esperado")
    passo_template: Optional[PassoCasoTesteResponse] = None 
    
    model_config = ConfigDict(from_attributes=True)

# --- EXECUÇÃO GERAL (HEADER) ---

class ExecucaoTesteBase(BaseModel):
    ciclo_teste_id: int
    caso_teste_id: int
    responsavel_id: Optional[int] = None
    status_geral: StatusExecucaoEnum = StatusExecucaoEnum.pendente

class ExecucaoTesteResponse(ExecucaoTesteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Dados aninhados para facilitar a tela de execução
    caso_teste: Optional[CasoTesteResponse] = None 
    passos_executados: List[ExecucaoPassoResponse] = [] 
    
    model_config = ConfigDict(from_attributes=True)
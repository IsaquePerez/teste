from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional, Union # <--- Adicionado Union

from app.schemas.caso_teste import CasoTesteResponse, UsuarioSimple, PassoCasoTesteResponse
from app.models.testing import StatusExecucaoEnum

class ExecucaoTesteBase(BaseModel):
    ciclo_teste_id: int
    caso_teste_id: int
    responsavel_id: int
    status_geral: str = "pendente"

class ExecucaoPassoBase(BaseModel):
    status: str 
    resultado_obtido: Optional[str] = None
    evidencias: Optional[str] = None

class ExecucaoTesteCreate(ExecucaoTesteBase):
    pass

class ExecucaoPassoUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore') # Ignora campos extra por segurança

    status: Optional[str] = None
    resultado_obtido: Optional[str] = None
    # ALTERAÇÃO: Aceita Lista ou String
    evidencias: Optional[Union[List[str], str]] = None 

class ExecucaoPassoResponse(ExecucaoPassoBase):
    id: int
    execucao_teste_id: int
    passo_caso_teste_id: int
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    passo_template: Optional[PassoCasoTesteResponse] = None     
    
    model_config = ConfigDict(from_attributes=True)

class ExecucaoTesteResponse(ExecucaoTesteBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    caso_teste: Optional[CasoTesteResponse] = None
    responsavel: Optional[UsuarioSimple] = None
    passos_executados: List[ExecucaoPassoResponse] = []

    model_config = ConfigDict(from_attributes=True)
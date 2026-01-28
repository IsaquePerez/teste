from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List, Union, Any
import json
from app.models.testing import StatusDefeitoEnum, SeveridadeDefeitoEnum
from .execucao_teste import ExecucaoTesteResponse

class DefeitoBase(BaseModel):
    model_config = ConfigDict(extra='ignore')

    titulo: str
    descricao: str
    evidencias: Optional[Union[List[str], str]] = [] 
    severidade: SeveridadeDefeitoEnum = SeveridadeDefeitoEnum.medio
    status: StatusDefeitoEnum = StatusDefeitoEnum.aberto
    execucao_teste_id: Optional[int] = None
    @field_validator('evidencias', mode='before')
    @classmethod
    def parse_evidencias_flex(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, list):
            return [str(item) for item in v if isinstance(item, (str, int))]
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
                return [v]
            except ValueError:
                if v.strip() == "": return []
                return [v]
        return []

    # --- CORREÇÃO DE SEVERIDADE ---
    @field_validator('severidade', mode='before')
    @classmethod
    def normalize_severidade(cls, v: Any):
        if isinstance(v, str):
            v = v.lower()
            mapa = {
                "médio": "medio", "medium": "medio",
                "crítico": "critico", "critico": "critico", "critical": "critico",
                "alto": "alto", "high": "alto",
                "baixo": "baixo", "low": "baixo", "baixo": "baixo"
            }
            return mapa.get(v, v)
        return v

class DefeitoCreate(DefeitoBase):
    logs_erro: Optional[str] = None
    pass

class DefeitoUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    evidencias: Optional[Union[List[str], str]] = None
    severidade: Optional[SeveridadeDefeitoEnum] = None
    status: Optional[StatusDefeitoEnum] = None
    
    @field_validator('evidencias', mode='before')
    @classmethod
    def parse_evidencias_update(cls, v):
        return DefeitoBase.parse_evidencias_flex(v)
        
    @field_validator('severidade', mode='before')
    @classmethod
    def normalize_sev_update(cls, v):
        return DefeitoBase.normalize_severidade(v)

class DefeitoResponse(DefeitoBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    execucao: Optional[ExecucaoTesteResponse] = None    
    caso_teste_nome: Optional[str] = None
    projeto_nome: Optional[str] = None
    responsavel_teste_nome: Optional[str] = None
    responsavel_projeto_nome: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
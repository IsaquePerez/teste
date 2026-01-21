from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List, Union, Any
import json
from app.models.testing import StatusDefeitoEnum, SeveridadeDefeitoEnum
from .execucao_teste import ExecucaoTesteResponse

class DefeitoBase(BaseModel):
    titulo: str
    descricao: str
    # Aceita Lista, mas o validador abaixo corrige se vier String
    evidencias: Optional[Union[List[str], str]] = [] 
    severidade: SeveridadeDefeitoEnum = SeveridadeDefeitoEnum.medio
    status: StatusDefeitoEnum = StatusDefeitoEnum.aberto
    execucao_teste_id: int 

    # --- VALIDADOR BLINDADO (Funciona para Input e Output) ---
    @field_validator('evidencias', mode='before')
    @classmethod
    def parse_evidencias_flex(cls, v: Any) -> List[str]:
        # Caso 1: Veio nulo
        if v is None:
            return []
        # Caso 2: Já é lista (comportamento ideal do JSON)
        if isinstance(v, list):
            return v
        # Caso 3: Veio como string (JSON stringified ou texto puro do banco)
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
                return [v] # Se não for lista, retorna como item único
            except ValueError:
                # Se não for JSON válido, assume que é uma URL única ou texto
                if v.strip() == "": return []
                return [v]
        return []

    # --- CORREÇÃO DE SEVERIDADE (Opcional, evita erro de Case/Acento) ---
    @field_validator('severidade', mode='before')
    @classmethod
    def normalize_severidade(cls, v: Any):
        if isinstance(v, str):
            # Mapeia erros comuns para o Enum correto
            mapa = {
                "médio": "medio", "MÉDIO": "medio", "Medium": "medio",
                "Crítico": "critico", "Critico": "critico", "Critical": "critico",
                "Alto": "alto", "High": "alto",
                "Baixo": "baixo", "Low": "baixo"
            }
            return mapa.get(v, v.lower()) # Tenta corrigir ou retorna minúsculo
        return v

class DefeitoCreate(DefeitoBase):
    logs_erro: Optional[str] = None
    pass

class DefeitoUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    evidencias: Optional[Union[List[str], str]] = None
    severidade: Optional[SeveridadeDefeitoEnum] = None
    status: Optional[StatusDefeitoEnum] = None
    
    # Reaplica os validadores na atualização também
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
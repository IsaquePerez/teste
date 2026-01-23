from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List, Union, Any
import json
from app.models.testing import StatusDefeitoEnum, SeveridadeDefeitoEnum
from .execucao_teste import ExecucaoTesteResponse

class DefeitoBase(BaseModel):
    # Permite que o frontend envie campos extras (como 'files') sem dar erro 422
    model_config = ConfigDict(extra='ignore')

    titulo: str
    descricao: str
    # MANTIDO HEAD: Suporte a múltiplas evidências e validação JSON
    evidencias: Optional[Union[List[str], str]] = [] 
    severidade: SeveridadeDefeitoEnum = SeveridadeDefeitoEnum.medio
    status: StatusDefeitoEnum = StatusDefeitoEnum.aberto
    
    # Opcional para não quebrar a validação se o front não mandar no corpo,
    # mas o backend precisa dele para ligar ao teste.
    execucao_teste_id: Optional[int] = None

    # --- VALIDADOR BLINDADO (Essencial para a galeria de imagens) ---
    @field_validator('evidencias', mode='before')
    @classmethod
    def parse_evidencias_flex(cls, v: Any) -> List[str]:
        # Caso 1: Veio nulo
        if v is None:
            return []
        # Caso 2: Já é lista (comportamento ideal do JSON)
        if isinstance(v, list):
            # Garante que é lista de strings
            return [str(item) for item in v if isinstance(item, (str, int))]
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

    # --- CORREÇÃO DE SEVERIDADE ---
    @field_validator('severidade', mode='before')
    @classmethod
    def normalize_severidade(cls, v: Any):
        if isinstance(v, str):
            # Normaliza tudo para minúsculo para bater com o Enum 'medio', 'baixo', etc.
            v = v.lower()
            # Mapeia erros comuns para o Enum correto
            mapa = {
                "médio": "medio", "medium": "medio",
                "crítico": "critico", "critico": "critico", "critical": "critico",
                "alto": "alto", "high": "alto",
                "baixo": "baixo", "low": "baixo", "bajo": "baixo"
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
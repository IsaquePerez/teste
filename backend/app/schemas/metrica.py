from pydantic import BaseModel
from typing import List, Optional

class MetricaKPI(BaseModel):
    label: str
    valor: int | float
    unidade: Optional[str] = None
    cor: Optional[str] = None

class MetricaProjeto(BaseModel):
    projeto_id: int
    total_casos: int
    casos_sucesso: int
    casos_falha: int
    taxa_cobertura: float
    taxa_sucesso: float
    kpis: List[MetricaKPI]
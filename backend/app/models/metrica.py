import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class TipoMetricaEnum(str, enum.Enum):
    cobertura = "cobertura"
    eficiencia = "eficiencia"
    defeitos = "defeitos"
    qualidade = "qualidade"
    produtividade = "produtividade"

class Metrica(Base):
    __tablename__ = "metricas"

    id = Column(Integer, primary_key=True, index=True)
    
    projeto_id = Column(Integer, ForeignKey("projetos.id"), nullable=False)
    ciclo_teste_id = Column(Integer, ForeignKey("ciclos_teste.id"), nullable=True)
    
    tipo_metrica = Column(Enum(TipoMetricaEnum, name='tipo_metrica_enum', create_type=False), nullable=False)    
    
    casos_reprovados = Column(Integer, nullable=False, default=0)
    casos_executados = Column(Integer, nullable=False, default=0)
    casos_aprovados = Column(Integer, nullable=False, default=0)
    
    tempo_medio_resolucao = Column(Integer)    
    data_medicao = Column(DateTime(timezone=True), server_default=func.now())
    nome_metrica = Column(String(100), nullable=False)
    valor_metrica = Column(Numeric(10, 2), nullable=False)
    unidade_medida = Column(String(50))
    descricao = Column(String(255))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projeto = relationship("Projeto", back_populates="metricas")
    ciclo = relationship("CicloTeste", back_populates="metricas")
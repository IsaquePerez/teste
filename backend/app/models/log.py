from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class LogSistema(Base):
    __tablename__ = "logs_sistema"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    sistema_id = Column(Integer, ForeignKey("sistemas.id"), nullable=True)
    acao = Column(String)
    entidade = Column(String)
    entidade_id = Column(Integer, nullable=True)
    detalhes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    usuario = relationship("Usuario")
    sistema = relationship("Sistema")
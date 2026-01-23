from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime, timedelta
from app.core.database import Base

class PasswordReset(Base):
    __tablename__ = "password_resets"
    
    id = Column(Integer, primary_key=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"))
    token = Column(String(255), unique=True, nullable=False)
    expira_em = Column(DateTime, nullable=False, default=lambda: datetime.utcnow() + timedelta(minutes=15))
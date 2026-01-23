import logging
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

def tratar_erro_integridade(e: IntegrityError, mensagens_personalizadas: dict[str, str] = None):
    error_msg = str(e.orig).lower() if e.orig else str(e).lower()
    
    if mensagens_personalizadas:
        for keyword, message in mensagens_personalizadas.items():
            if keyword.lower() in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=message
                )

    logger.error(f"Erro de Integridade não mapeado: {e}")
    
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Operação negada devido a conflito de dados (violação de integridade)."
    )
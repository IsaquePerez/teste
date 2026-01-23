import { Link, useNavigate } from 'react-router-dom';
import './styles.css';

export function NotFound() {
  const navegar = useNavigate();

  return (
    <div className="nao-encontrado-container">
      <div className="nao-encontrado-conteudo">
        <div className="codigo-erro">
          <span>4</span>
          <div className="fantasma">
            <div className="rosto">
              <div className="olhos-container">
                <div className="olho"></div>
                <div className="olho"></div>
              </div>
              <div className="boca"></div>
            </div>
          </div>
          <span>4</span>
        </div>
        
        <h1 className="titulo">Oops! Página não encontrada</h1>
        <p className="mensagem">
          Parece que você encontrou um caminho que não existe.<br />
          Não se preocupe, acontece com os melhores!
        </p>
        
        <div className="acoes">
          <Link to="/" className="botao-primario">
            Voltar para Home
          </Link>
          <button 
            className="botao-secundario" 
            onClick={() => navegar(-1)}
          >
            Voltar para página anterior
          </button>
        </div>
      </div>
    </div>
  );
};
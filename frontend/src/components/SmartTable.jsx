import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import './SmartTable.css'; // Vamos criar o CSS abaixo

export function SmartTable({ data, columns, title }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 1. Filtragem (Busca)
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  // 2. Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="smart-table-container">
      {/* Cabeçalho da Tabela */}
      <div className="table-header-controls">
        <h3 className="table-title">{title}</h3>
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="search-input"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="table-responsive">
        <table className="clean-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ width: col.width }}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((item, rowIdx) => (
                <tr key={item.id || rowIdx}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx}>
                      {col.render ? col.render(item) : item[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="empty-state">
                  Nenhum dado encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé (Paginação) */}
      <div className="table-footer">
        <span className="page-info">
          Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredData.length)} de {filteredData.length}
        </span>
        <div className="pagination-buttons">
          <button 
            disabled={currentPage === 1} 
            onClick={() => handlePageChange(currentPage - 1)}
            className="page-btn"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="current-page">{currentPage}</span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => handlePageChange(currentPage + 1)}
            className="page-btn"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
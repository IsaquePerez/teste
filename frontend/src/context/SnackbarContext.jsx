import React, { createContext, useContext, useState, useCallback } from 'react';


const SnackbarContext = createContext();

export function SnackbarProvider({ children }) {
  const [snackbars, setSnackbars] = useState([]);

  
  const removeSnackbar = useCallback((id) => {
    setSnackbars((prev) => prev.filter((snackbar) => snackbar.id !== id));
  }, []);

  
  const addSnackbar = useCallback((message, type = 'info') => {
    const id = Date.now(); 
    
    
    setSnackbars((prev) => [...prev, { id, message, type }]);

    
    setTimeout(() => {
      removeSnackbar(id);
    }, 3000);
  }, [removeSnackbar]);

  
  const success = (msg) => addSnackbar(msg, 'success');
  const error = (msg) => addSnackbar(msg, 'error');
  const warning = (msg) => addSnackbar(msg, 'warning');
  const info = (msg) => addSnackbar(msg, 'info');

  return (
    <SnackbarContext.Provider value={{ snackbars, success, error, warning, info, removeSnackbar }}>
      {children}
    </SnackbarContext.Provider>
  );
}

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar deve ser usado dentro de um SnackbarProvider');
  }
  return context;
};
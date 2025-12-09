/* ==========================================================================
   COMPONENTE: MODAL DE CONFIRMAÇÃO
   Substituto elegante para o window.confirm nativo.
   ========================================================================== */
export function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', // Fundo escuro transparente
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100, // Acima de tudo
      backdropFilter: 'blur(2px)'
    }} onClick={onClose}>
      
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        animation: 'fadeIn 0.2s ease-out'
      }} onClick={e => e.stopPropagation()}>
        
        <h3 style={{ margin: '0 0 10px 0', color: '#1E293B', fontSize: '1.2rem' }}>
          {title}
        </h3>
        
        <p style={{ margin: '0 0 24px 0', color: '#64748B', lineHeight: '1.5' }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={onClose}
            className="btn"
            style={{ backgroundColor: '#F1F5F9', color: '#475569' }}
          >
            {cancelText}
          </button>
          
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`btn ${isDanger ? 'danger' : 'primary'}`}
          >
            {confirmText}
          </button>
        </div>

      </div>
      
      {/* Pequena animação para o modal */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
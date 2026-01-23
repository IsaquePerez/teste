import React from 'react';
import ReactDOM from 'react-dom'; 
import './EvidenceGallery.css';

export function EvidenceGallery({ images, onClose }) {
  if (!images) return null;

  const imageList = Array.isArray(images) ? images : [images];

  return ReactDOM.createPortal(
    <div className="gallery-overlay" onClick={onClose}>
      <div className="gallery-content" onClick={e => e.stopPropagation()}>
        <button className="gallery-close" onClick={onClose}>&times;</button>
        
        <div className="gallery-track">
          {imageList.map((url, index) => (
            <div key={index} className="gallery-item">
              <img src={url} alt={`Evidência ${index + 1}`} className="gallery-img" />
              <span className="gallery-counter">{index + 1} / {imageList.length}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body 
  );
}
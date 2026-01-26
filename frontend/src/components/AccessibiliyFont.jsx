import { useEffect, useState } from 'react';

export function AccessibilityFont() {
  const [fontScale, setFontScale] = useState(1);

  const MIN_SCALE = 0.8;
  const MAX_SCALE = 1.5;

  useEffect(() => {
    const savedFontScale = localStorage.getItem('fontScale');
    if (savedFontScale) {
      const value = Number(savedFontScale);
      setFontScale(value);
      document.documentElement.style.setProperty('--font-scale', value);
    }
  }, []);

  function updateFontScale(value) {
    setFontScale(value);
    document.documentElement.style.setProperty('--font-scale', value);
    localStorage.setItem('fontScale', value);
  }

  function increaseFont() {
    if (fontScale < MAX_SCALE) {
      updateFontScale(Number((fontScale + 0.1).toFixed(1)));
    }
  }

  function decreaseFont() {
    if (fontScale > MIN_SCALE) {
      updateFontScale(Number((fontScale - 0.1).toFixed(1)));
    }
  }

  function resetFont() {
    updateFontScale(1);
  }

  return (
    <div
      className="accessibility-font-controls"
      style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
    >
      <button
        onClick={decreaseFont}
        disabled={fontScale <= MIN_SCALE}
        className="theme-toggle-btn"
        title="Diminuir fonte"
        aria-label="Diminuir fonte"
      >
        A-
      </button>

      <button
        onClick={resetFont}
        className="theme-toggle-btn"
        title="Fonte padrão"
        aria-label="Fonte padrão"
      >
        {Math.round(fontScale * 100)}%
      </button>

      <button
        onClick={increaseFont}
        disabled={fontScale >= MAX_SCALE}
        className="theme-toggle-btn"
        title="Aumentar fonte"
        aria-label="Aumentar fonte"
      >
        A+
      </button>
    </div>
  );
}

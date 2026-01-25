import { useState, useRef, useEffect } from 'react';
import './FieldInfoIcon.css';

/**
 * Informational icon for form fields. Shows a popover with description and optional "common" advice on click.
 * @param {string} description - What the field means; shown to first-time users.
 * @param {string} [common] - Common entries or typical values (e.g. "Usually 1–3%", "Often 30 days").
 */
const FieldInfoIcon = ({ description, common }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);

  return (
    <span className="field-info-wrap" ref={wrapRef}>
      <button
        type="button"
        className="field-info-icon"
        onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        aria-label="What does this mean?"
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="field-info-popover" role="tooltip">
          <p className="field-info-desc">{description}</p>
          {common && <p className="field-info-common"><strong>Common:</strong> {common}</p>}
        </div>
      )}
    </span>
  );
};

export default FieldInfoIcon;

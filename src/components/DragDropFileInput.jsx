import { useState, useRef } from 'react';
import './DragDropFileInput.css';

/**
 * Reusable drag-and-drop file input.
 * @param {object} props
 * @param {boolean} [props.multiple] - Allow multiple files
 * @param {string} [props.accept] - e.g. ".pdf,.jpg,.jpeg,.png" or "image/*"
 * @param {(File|File[]|null) => void} props.onChange - Single: (file) => {}; multiple: (files) => {}
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.uploading] - Show "Uploading..." state
 * @param {string} [props.label] - Optional label above zone
 * @param {string} [props.hint] - e.g. "PDF, JPG, or PNG. Max 10MB."
 * @param {string} [props.placeholder] - e.g. "Drop files here or click to browse"
 * @param {string} [props.className]
 */
const DragDropFileInput = ({
  multiple = false,
  accept,
  onChange,
  disabled = false,
  uploading = false,
  label,
  hint,
  placeholder = 'Drop files here or click to browse',
  className = '',
}) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const normalizeFiles = (files) => {
    const list = Array.from(files || []);
    return multiple ? list : list[0] || null;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (disabled || uploading) return;
    const raw = e.dataTransfer?.files;
    if (!raw?.length) return;
    const value = normalizeFiles(raw);
    onChange(value);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || uploading) return;
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleChange = (e) => {
    const raw = e.target.files;
    if (!raw?.length) return;
    const value = normalizeFiles(raw);
    onChange(value);
    e.target.value = '';
  };

  const handleClick = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  return (
    <div className={`drag-drop-file-input ${className}`}>
      {label && <label className="drag-drop-file-input__label">{label}</label>}
      <div
        role="button"
        tabIndex={0}
        className={`drag-drop-file-input__zone ${dragOver ? 'drag-over' : ''} ${disabled || uploading ? 'disabled' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || uploading}
          onChange={handleChange}
          className="drag-drop-file-input__input"
          aria-label={label || 'Choose files'}
        />
        {uploading ? (
          <span className="drag-drop-file-input__message">Uploading…</span>
        ) : (
          <span className="drag-drop-file-input__placeholder">{placeholder}</span>
        )}
      </div>
      {hint && <p className="drag-drop-file-input__hint">{hint}</p>}
    </div>
  );
};

export default DragDropFileInput;

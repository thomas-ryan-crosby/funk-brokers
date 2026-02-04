import { useEffect, useRef, useState } from 'react';
import { getPredictions } from '../services/mapboxGeocodeService';

const DEBOUNCE_MS = 300;

const CityStateAutocomplete = ({
  value,
  onCityChange,
  onCityStateSelect,
  placeholder = 'City or start typing',
  id,
  disabled,
  className,
  name = 'city',
}) => {
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const [predictions, setPredictions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const onInput = (e) => {
      const v = e.target.value;
      onCityChange?.(v);
      setShowDropdown(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const q = String(v || '').trim();
      if (!q || q.length < 2) {
        setPredictions([]);
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(() => {
        getPredictions(q, 'place,region')
          .then((list) => {
            setPredictions(list);
            setShowDropdown(true);
            setLoading(false);
          })
          .catch(() => {
            setPredictions([]);
            setLoading(false);
          });
      }, DEBOUNCE_MS);
    };

    const input = inputRef.current;
    input.addEventListener('input', onInput);
    input.addEventListener('focus', () => {
      if (predictions.length > 0) setShowDropdown(true);
    });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      input.removeEventListener('input', onInput);
    };
  }, [onCityChange, predictions.length]);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const select = (item) => {
    setShowDropdown(false);
    setPredictions([]);
    onCityChange?.(item.place_name || item.description || '');
    if (item.city || item.state) {
      onCityStateSelect?.({ city: item.city || '', state: item.state || '' });
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={value}
        onChange={(e) => onCityChange?.(e.target.value)}
        placeholder={placeholder}
        id={id}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />
      {showDropdown && (predictions.length > 0 || loading) && (
        <ul
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            margin: 0,
            padding: 0,
            listStyle: 'none',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 4,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            maxHeight: 200,
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {loading && predictions.length === 0 ? (
            <li style={{ padding: '8px 12px', color: '#666' }}>Loading...</li>
          ) : (
            predictions.map((p, idx) => (
              <li
                key={p.id || idx}
                role="option"
                tabIndex={0}
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                onMouseDown={(e) => { e.preventDefault(); select(p); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(p); } }}
              >
                {p.description || p.place_name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default CityStateAutocomplete;

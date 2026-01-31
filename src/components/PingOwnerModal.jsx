import { useMemo, useState } from 'react';
import './PingOwnerModal.css';

const REASONS = [
  { id: 'vendor', label: 'Vendor referral', hint: 'Who did the work or service?' },
  { id: 'materials', label: 'Material or product', hint: 'What brand or finish is this?' },
  { id: 'sale_interest', label: 'Interest in sale', hint: 'Are you open to a conversation about selling?' },
  { id: 'conversation', label: 'General conversation', hint: 'A quick, low-impact question.' },
  { id: 'neighborhood', label: 'Neighborhood question', hint: 'Local context or area details.' },
];

const PingOwnerModal = ({ open, propertyAddress, onClose, onSend, sending }) => {
  const [reasonType, setReasonType] = useState(REASONS[0].id);
  const [note, setNote] = useState('');

  const selected = useMemo(
    () => REASONS.find((r) => r.id === reasonType) || REASONS[0],
    [reasonType]
  );

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend?.({ reasonType, note: note.trim() });
  };

  return (
    <div className="ping-owner-overlay" onClick={onClose} role="presentation">
      <div className="ping-owner-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="ping-owner-title">
        <div className="ping-owner-header">
          <h2 id="ping-owner-title">Ping owner</h2>
          <button type="button" className="ping-owner-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <form className="ping-owner-body" onSubmit={handleSubmit}>
          <p className="ping-owner-address">{propertyAddress || 'Property'}</p>
          <p className="ping-owner-subtitle">Low‑impact request. The owner can ignore or reply later.</p>

          <div className="ping-owner-reasons">
            {REASONS.map((r) => (
              <label key={r.id} className={`ping-owner-reason ${reasonType === r.id ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="reasonType"
                  value={r.id}
                  checked={reasonType === r.id}
                  onChange={(e) => setReasonType(e.target.value)}
                />
                <span>
                  <strong>{r.label}</strong>
                  <em>{r.hint}</em>
                </span>
              </label>
            ))}
          </div>

          <label className="ping-owner-note">
            <span>Optional note</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Keep it short (optional)"
              maxLength={120}
              rows={3}
            />
            <span className="ping-owner-note-count">{note.length}/120</span>
          </label>

          <div className="ping-owner-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? 'Sending…' : `Send ${selected.label.toLowerCase()} ping`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PingOwnerModal;

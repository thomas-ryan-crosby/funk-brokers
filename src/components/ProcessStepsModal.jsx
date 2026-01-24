import { useEffect, useState } from 'react';
import './ProcessStepsModal.css';

/**
 * @param {Object} props
 * @param {Array<{ title: string, lead: string, body: Array<{ type: 'p', text: string }|{ type: 'ul', items: string[] }>, whyMatters: string, isDone?: boolean }>} props.steps
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {number} props.startIndex
 * @param {'sell'|'buy'} props.theme
 */
const ProcessStepsModal = ({ steps, isOpen, onClose, startIndex = 0, theme = 'sell' }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  useEffect(() => {
    if (isOpen) setCurrentIndex(Math.min(startIndex, steps.length - 1));
  }, [isOpen, startIndex, steps.length]);

  if (!isOpen) return null;

  const step = steps[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  const handlePrev = () => {
    if (!isFirst) setCurrentIndex((i) => i - 1);
  };

  const handleNext = () => {
    if (isLast) onClose();
    else setCurrentIndex((i) => i + 1);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={`process-steps-modal-overlay process-steps-modal--${theme}`} onClick={handleOverlayClick}>
      <div className="process-steps-modal" onClick={(e) => e.stopPropagation()}>
        <div className="process-steps-modal-header">
          <span className="process-steps-modal-badge">
            Step {currentIndex + 1} of {steps.length}
          </span>
          <button type="button" className="process-steps-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="process-steps-modal-body">
          <h2 className="process-steps-modal-title">{step.title}</h2>
          <p className="process-steps-modal-lead">{step.lead}</p>

          <div className="process-steps-modal-content">
            {step.body.map((block, i) =>
              block.type === 'p' ? (
                <p key={i}>{block.text}</p>
              ) : (
                <ul key={i}>
                  {block.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )
            )}
          </div>

          <div className={`process-steps-modal-why ${step.isDone ? 'process-steps-modal-why--done' : ''}`}>
            {step.isDone ? step.whyMatters : <><strong>Why this matters:</strong> {step.whyMatters}</>}
          </div>
        </div>

        <div className="process-steps-modal-footer">
          <button
            type="button"
            className="process-steps-modal-btn process-steps-modal-btn--prev"
            onClick={handlePrev}
            disabled={isFirst}
          >
            ← Previous
          </button>
          <span className="process-steps-modal-progress">
            {currentIndex + 1} / {steps.length}
          </span>
          <button
            type="button"
            className="process-steps-modal-btn process-steps-modal-btn--next"
            onClick={handleNext}
          >
            {isLast ? 'Done' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcessStepsModal;

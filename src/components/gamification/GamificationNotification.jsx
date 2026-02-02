import { GAMIFICATION_MESSAGES } from './messages';
import './GamificationNotification.css';

/**
 * Reusable gamification / milestone notification.
 * Use anywhere by passing a type from messages.js and optional onDismiss.
 * @param {object} props
 * @param {string} props.type - Key from GAMIFICATION_MESSAGES (e.g. 'loi-to-psa')
 * @param {() => void} [props.onDismiss] - Called when user dismisses; if omitted, no dismiss button
 */
function GamificationNotification({ type, onDismiss }) {
  const content = type && GAMIFICATION_MESSAGES[type];
  if (!content) return null;

  return (
    <div className="gamification-notification" role="status" aria-live="polite">
      <div className="gamification-notification-inner">
        <h3 className="gamification-notification-title">{content.title}</h3>
        <p className="gamification-notification-lead">{content.lead}</p>
        <p className="gamification-notification-body">{content.body}</p>
        {onDismiss && (
          <button
            type="button"
            className="gamification-notification-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            Got it
          </button>
        )}
      </div>
    </div>
  );
}

export default GamificationNotification;

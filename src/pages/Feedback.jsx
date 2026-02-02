import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createFeedback, getFeedbackList } from '../services/feedbackService';
import './Feedback.css';

const FEEDBACK_SECTIONS = [
  { value: '', label: '— Optional —' },
  { value: 'Browse Properties', label: 'Browse Properties' },
  { value: 'Dashboard', label: 'Dashboard' },
  { value: 'Feed', label: 'Feed' },
  { value: 'Profile', label: 'Profile' },
  { value: 'List Property', label: 'List Property' },
  { value: 'Property Detail', label: 'Property Detail' },
  { value: 'Submit Offer', label: 'Submit Offer' },
  { value: 'Messages', label: 'Messages' },
  { value: 'Feedback', label: 'Feedback' },
  { value: 'How it works', label: 'How it works' },
  { value: 'Other', label: 'Other' },
];

const Feedback = () => {
  const { user, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [body, setBody] = useState('');
  const [type, setType] = useState('feedback');
  const [section, setSection] = useState('');
  const [sectionExpanded, setSectionExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in?redirect=/feedback');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const items = await getFeedbackList(100);
      setList(items);
    } catch (err) {
      console.error('Failed to load feedback list', err);
      setList([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadList();
  }, [isAuthenticated, loadList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid || submitting) return;
    const trimmed = body.trim();
    if (!trimmed) {
      setError('Please enter your feedback.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await createFeedback({
        userId: user.uid,
        authorName: userProfile?.name || user?.displayName || null,
        body: trimmed,
        type,
        section: section.trim() || null,
      });
      setBody('');
      setType('feedback');
      setSection('');
      setSectionExpanded(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      await loadList();
    } catch (err) {
      console.error('Failed to submit feedback', err);
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToFeedbackList = () => {
    document.getElementById('feedback-list')?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDate = (v) => {
    if (!v) return '—';
    const d = v?.toDate ? v.toDate() : new Date(v);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const typeLabel = (t) => {
    switch (t) {
      case 'bug': return 'Bug report';
      case 'other': return 'Other';
      default: return 'Feedback';
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="feedback-page">
        <div className="feedback-container">
          <div className="feedback-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-page">
      <div className="feedback-container">
        <header className="feedback-header">
          <h1>Feedback & Bug Reports</h1>
          <p>Help us improve during beta. Submit your feedback and see what other testers are saying.</p>
        </header>

        <div className="feedback-layout">
          <main className="feedback-main">
            <section className="feedback-list-section" id="feedback-list">
              <h2>What others are saying</h2>
              {listLoading ? (
                <p className="feedback-list-loading">Loading feedback...</p>
              ) : list.length === 0 ? (
                <p className="feedback-list-empty">No feedback yet. Be the first to share!</p>
              ) : (
                <ul className="feedback-list">
                  {list.map((item) => (
                    <li key={item.id} className={`feedback-item feedback-item--${item.type || 'feedback'}`}>
                      <div className="feedback-item-meta">
                        <span className="feedback-item-type">{typeLabel(item.type)}</span>
                        <span className="feedback-item-date">{formatDate(item.createdAt)}</span>
                        {item.section && (
                          <span className="feedback-item-section">{item.section}</span>
                        )}
                        {item.authorName && (
                          <span className="feedback-item-author">{item.authorName}</span>
                        )}
                      </div>
                      <p className="feedback-item-body">{item.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </main>

          <aside className="feedback-widget">
            <div className="feedback-widget-inner">
              <p className="feedback-widget-disclaimer">
                <strong>Beta software.</strong> This product is in beta. Your feedback helps us improve. We read and act on every submission.
              </p>
              <form onSubmit={handleSubmit} className="feedback-widget-form">
                <label className="feedback-widget-label">
                  Your feedback
                </label>
                <textarea
                  className="feedback-widget-textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Share feedback, report a bug, or suggest an improvement..."
                  rows={4}
                  disabled={submitting}
                  aria-label="Feedback text"
                />
                <label className="feedback-widget-label">
                  Type
                </label>
                <select
                  className="feedback-widget-select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  disabled={submitting}
                  aria-label="Feedback type"
                >
                  <option value="feedback">Feedback / opinion</option>
                  <option value="bug">Bug report</option>
                  <option value="other">Other</option>
                </select>
                <div className="feedback-widget-section-optional">
                  <button
                    type="button"
                    className="feedback-widget-section-toggle"
                    onClick={() => setSectionExpanded((e) => !e)}
                    aria-expanded={sectionExpanded}
                    aria-controls="feedback-section-select"
                  >
                    {sectionExpanded ? '▼' : '▶'} Where on the site? (optional)
                  </button>
                  {sectionExpanded && (
                    <div id="feedback-section-select" className="feedback-widget-section-content">
                      <label className="feedback-widget-label">Section of website</label>
                      <select
                        className="feedback-widget-select"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        disabled={submitting}
                        aria-label="Section of website"
                      >
                        {FEEDBACK_SECTIONS.map((opt) => (
                          <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {error && <p className="feedback-widget-error" role="alert">{error}</p>}
                {submitted && <p className="feedback-widget-success">Thank you! Your feedback was submitted.</p>}
                <button
                  type="submit"
                  className="feedback-widget-submit btn btn-primary"
                  disabled={submitting || !body.trim()}
                >
                  {submitting ? 'Submitting...' : 'Submit feedback'}
                </button>
              </form>
              <button
                type="button"
                className="feedback-widget-view-link"
                onClick={scrollToFeedbackList}
              >
                View submitted feedback
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Feedback;

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTransactionById, updateStepComplete as updateStepCompleteService } from '../services/transactionService';
import { getPropertyById } from '../services/propertyService';
import './TransactionManager.css';

const toDate = (v) => {
  if (!v) return null;
  return v?.toDate ? v.toDate() : new Date(v);
};

const formatDate = (v) => {
  const d = toDate(v);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatCurrency = (n) =>
  n != null && Number.isFinite(n)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
    : '—';

function getDueStatus(step, now = new Date()) {
  const due = toDate(step.dueAt);
  if (!due || step.completed) return null;
  const ms = due.getTime() - now.getTime();
  const days = ms / (24 * 60 * 60 * 1000);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'due_soon';
  return 'ok';
}

const TransactionManager = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [transaction, setTransaction] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [togglingStepId, setTogglingStepId] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate(`/sign-in?redirect=${encodeURIComponent(`/transaction/${id}`)}`);
      return;
    }
    if (!user?.uid || !id) return;
    load();
  }, [id, isAuthenticated, authLoading, user?.uid, navigate]);

  const load = async () => {
    try {
      setLoading(true);
      const t = await getTransactionById(id);
      if (!t || !t.parties?.includes(user.uid)) {
        navigate('/dashboard');
        return;
      }
      setTransaction(t);
      if (t.propertyId) {
        const p = await getPropertyById(t.propertyId).catch(() => null);
        setProperty(p);
      } else {
        setProperty(null);
      }
    } catch (err) {
      console.error(err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStepToggle = async (stepId, completed) => {
    if (!transaction?.id) return;
    setTogglingStepId(stepId);
    try {
      await updateStepCompleteService(transaction.id, stepId, completed);
      const t = await getTransactionById(transaction.id);
      setTransaction(t);
    } catch (err) {
      console.error(err);
      alert('Failed to update. Please try again.');
    } finally {
      setTogglingStepId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="transaction-manager-page">
        <div className="loading-state">Loading transaction...</div>
      </div>
    );
  }

  if (!transaction) return null;

  const counterparty = transaction.buyerId === user.uid ? 'Seller' : (transaction.buyerName || 'Buyer');
  const propertyAddress = [property?.address, property?.city, property?.state].filter(Boolean).join(', ') || null;

  return (
    <div className="transaction-manager-page">
      <div className="transaction-manager-container">
        <div className="tm-header">
          <div>
            <h1>Transaction Manager</h1>
            <p className="tm-subtitle">Contractual steps per the accepted offer. Complete each by the due date.</p>
          </div>
          <Link to="/dashboard" className="btn btn-outline">Back to Dashboard</Link>
        </div>

        <div className="tm-deal-summary">
          <h2>Deal summary</h2>
          <div className="tm-summary-grid">
            <div>
              <span className="tm-label">Property</span>
              {propertyAddress ? (
                <Link to={`/property/${transaction.propertyId}`} className="tm-value tm-link">{propertyAddress}</Link>
              ) : (
                <Link to={`/property/${transaction.propertyId}`} className="tm-value tm-link">View property</Link>
              )}
            </div>
            <div>
              <span className="tm-label">With</span>
              <span className="tm-value">{counterparty}</span>
            </div>
            <div>
              <span className="tm-label">Offer</span>
              <span className="tm-value">{formatCurrency(transaction.offerAmount)}</span>
            </div>
            <div>
              <span className="tm-label">Earnest money</span>
              <span className="tm-value">{formatCurrency(transaction.earnestMoney)}</span>
            </div>
            <div>
              <span className="tm-label">Proposed closing</span>
              <span className="tm-value">{formatDate(transaction.proposedClosingDate)}</span>
            </div>
            <div>
              <span className="tm-label">Accepted</span>
              <span className="tm-value">{formatDate(transaction.acceptedAt)}</span>
            </div>
          </div>
        </div>

        <div className="tm-steps">
          <h2>Steps</h2>
          <div className="tm-steps-list">
            {(transaction.steps || []).map((step) => {
              const status = getDueStatus(step);
              const isToggling = togglingStepId === step.id;
              return (
                <div key={step.id} className={`tm-step-row ${step.completed ? 'tm-step-completed' : ''}`}>
                  <label className="tm-step-check">
                    <input
                      type="checkbox"
                      checked={!!step.completed}
                      disabled={isToggling}
                      onChange={(e) => handleStepToggle(step.id, e.target.checked)}
                    />
                    <span className="tm-step-title">{step.title}</span>
                  </label>
                  <div className="tm-step-meta">
                    <span className="tm-step-due">Due {formatDate(step.dueAt)}</span>
                    {step.completed && step.completedAt && (
                      <span className="tm-step-done">Done {formatDate(step.completedAt)}</span>
                    )}
                    {!step.completed && status === 'overdue' && (
                      <span className="tm-step-badge tm-step-overdue">Overdue</span>
                    )}
                    {!step.completed && status === 'due_soon' && (
                      <span className="tm-step-badge tm-step-due-soon">Due soon</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionManager;

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTransactionById, updateStepComplete as updateStepCompleteService, setAssignedVendor } from '../services/transactionService';
import { getPropertyById } from '../services/propertyService';
import { getVendorsByUser, VENDOR_TYPES } from '../services/vendorService';
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
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingStepId, setTogglingStepId] = useState(null);
  const [assignModalRole, setAssignModalRole] = useState(null);
  const [assignSelectedId, setAssignSelectedId] = useState('');

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
      const v = await getVendorsByUser(user.uid);
      setVendors(v);
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

  const handleRemoveVendor = async (role) => {
    if (!transaction?.id) return;
    try {
      await setAssignedVendor(transaction.id, role, null);
      await load();
    } catch (err) {
      console.error(err);
      alert('Failed to remove. Please try again.');
    }
  };

  const openAssignModal = (role) => {
    setAssignModalRole(role);
    setAssignSelectedId('');
  };

  const closeAssignModal = () => {
    setAssignModalRole(null);
    setAssignSelectedId('');
  };

  const handleAssignVendor = async () => {
    if (!transaction?.id || !assignModalRole || !assignSelectedId) return;
    try {
      await setAssignedVendor(transaction.id, assignModalRole, assignSelectedId);
      await load();
      closeAssignModal();
    } catch (err) {
      console.error(err);
      alert('Failed to assign. Please try again.');
    }
  };

  const vendorMap = Object.fromEntries((vendors || []).map((v) => [v.id, v]));

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

        <div className="tm-vendors">
          <h2>Vendors &amp; contacts</h2>
          {VENDOR_TYPES.map(({ id: role, label }) => {
            const assigned = (transaction.assignedVendors || []).find((a) => a.role === role);
            const vendor = assigned && vendorMap[assigned.vendorId];
            return (
              <div key={role} className="tm-vendor-row">
                <span className="tm-vendor-role">{label}</span>
                {vendor ? (
                  <div className="tm-vendor-assigned">
                    <span className="tm-vendor-name">{vendor.name}</span>
                    {vendor.company && <span className="tm-vendor-company">{vendor.company}</span>}
                    <span className="tm-vendor-contact">
                      {vendor.phone && <a href={`tel:${vendor.phone}`}>{vendor.phone}</a>}
                      {vendor.phone && vendor.email && ' · '}
                      {vendor.email && <a href={`mailto:${vendor.email}`}>{vendor.email}</a>}
                    </span>
                    <div className="tm-vendor-actions">
                      <button type="button" className="btn-link" onClick={() => openAssignModal(role)}>Change</button>
                      <button type="button" className="btn-link" onClick={() => handleRemoveVendor(role)}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="btn btn-outline tm-btn-sm" onClick={() => openAssignModal(role)}>Assign</button>
                )}
              </div>
            );
          })}
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

      {assignModalRole && (
        <div className="tm-modal-overlay" onClick={closeAssignModal}>
          <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="tm-modal-title">
              Assign {VENDOR_TYPES.find((t) => t.id === assignModalRole)?.label || assignModalRole}
            </h3>
            {vendors.length === 0 ? (
              <p className="tm-form-hint">
                You don&apos;t have any vendors yet. Add them in <Link to="/dashboard?tab=vendor-center">Vendor Center</Link> first.
              </p>
            ) : (
              <div className="tm-form-group">
                <label>Vendor</label>
                <select
                  className="tm-vendor-select"
                  value={assignSelectedId}
                  onChange={(e) => setAssignSelectedId(e.target.value)}
                >
                  <option value="">— Choose —</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}{v.company ? ` (${v.company})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="tm-modal-actions">
              <button type="button" className="btn btn-outline" onClick={closeAssignModal}>Cancel</button>
              {vendors.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAssignVendor}
                  disabled={!assignSelectedId}
                >
                  Assign
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionManager;

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTransactionById, updateStepComplete as updateStepCompleteService, setAssignedVendor } from '../services/transactionService';
import { getPropertyById } from '../services/propertyService';
import { getVendorsByUser, createVendor, updateVendor, deleteVendor, VENDOR_TYPES } from '../services/vendorService';
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
  const [assignNewForm, setAssignNewForm] = useState({ name: '', company: '', phone: '', email: '' });
  const [manageVendorsOpen, setManageVendorsOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [vendorForm, setVendorForm] = useState({ name: '', company: '', phone: '', email: '', type: 'other' });

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
    setAssignNewForm({ name: '', company: '', phone: '', email: '' });
  };

  const closeAssignModal = () => {
    setAssignModalRole(null);
    setAssignSelectedId('');
    setAssignNewForm({ name: '', company: '', phone: '', email: '' });
  };

  const handleAssignVendor = async () => {
    if (!transaction?.id || !assignModalRole) return;
    if (assignSelectedId === 'new') {
      if (!assignNewForm.name?.trim()) return;
      try {
        const newId = await createVendor(user.uid, { ...assignNewForm, type: assignModalRole });
        await setAssignedVendor(transaction.id, assignModalRole, newId);
        await load();
        closeAssignModal();
      } catch (err) {
        console.error(err);
        alert('Failed to add and assign. Please try again.');
      }
      return;
    }
    if (!assignSelectedId) return;
    try {
      await setAssignedVendor(transaction.id, assignModalRole, assignSelectedId);
      await load();
      closeAssignModal();
    } catch (err) {
      console.error(err);
      alert('Failed to assign. Please try again.');
    }
  };

  const handleManageSaveVendor = async () => {
    if (editingVendorId) {
      try {
        await updateVendor(editingVendorId, vendorForm);
        const v = await getVendorsByUser(user.uid);
        setVendors(v);
        setEditingVendorId(null);
        setVendorForm({ name: '', company: '', phone: '', email: '', type: 'other' });
      } catch (err) {
        console.error(err);
        alert('Failed to update vendor.');
      }
    } else {
      if (!vendorForm.name?.trim()) return;
      try {
        await createVendor(user.uid, vendorForm);
        const v = await getVendorsByUser(user.uid);
        setVendors(v);
        setVendorForm({ name: '', company: '', phone: '', email: '', type: 'other' });
      } catch (err) {
        console.error(err);
        alert('Failed to add vendor.');
      }
    }
  };

  const handleManageEdit = (v) => {
    setEditingVendorId(v.id);
    setVendorForm({
      name: v.name || '',
      company: v.company || '',
      phone: v.phone || '',
      email: v.email || '',
      type: v.type || 'other',
    });
  };

  const handleManageDelete = async (vendorId) => {
    if (!confirm('Delete this vendor? They will be removed from any transactions.')) return;
    try {
      await deleteVendor(vendorId);
      const v = await getVendorsByUser(user.uid);
      setVendors(v);
      if (editingVendorId === vendorId) {
        setEditingVendorId(null);
        setVendorForm({ name: '', company: '', phone: '', email: '', type: 'other' });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete vendor.');
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
          <p className="tm-manage-link">
            <button type="button" className="btn-link" onClick={() => setManageVendorsOpen(true)}>Manage my vendors</button>
          </p>
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
            <div className="tm-form-group">
              <label>Vendor</label>
              <select
                className="tm-vendor-select"
                value={assignSelectedId}
                onChange={(e) => setAssignSelectedId(e.target.value)}
              >
                <option value="">— Choose —</option>
                <option value="new">+ Add new vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}{v.company ? ` (${v.company})` : ''}</option>
                ))}
              </select>
            </div>
            {assignSelectedId === 'new' && (
              <>
                <div className="tm-form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={assignNewForm.name}
                    onChange={(e) => setAssignNewForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Contact name"
                  />
                </div>
                <div className="tm-form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={assignNewForm.company}
                    onChange={(e) => setAssignNewForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div className="tm-form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={assignNewForm.phone}
                    onChange={(e) => setAssignNewForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone"
                  />
                </div>
                <div className="tm-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={assignNewForm.email}
                    onChange={(e) => setAssignNewForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Email"
                  />
                </div>
              </>
            )}
            <div className="tm-modal-actions">
              <button type="button" className="btn btn-outline" onClick={closeAssignModal}>Cancel</button>
              {assignSelectedId === 'new' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAssignVendor}
                  disabled={!assignNewForm.name?.trim()}
                >
                  Add &amp; assign
                </button>
              ) : (
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

      {manageVendorsOpen && (
        <div className="tm-modal-overlay" onClick={() => setManageVendorsOpen(false)}>
          <div className="tm-modal tm-modal-wide" onClick={(e) => e.stopPropagation()}>
            <h3 className="tm-modal-title">Manage my vendors</h3>
            <div className="tm-manage-list">
              {vendors.map((v) => (
                <div key={v.id} className="tm-manage-row">
                  <div>
                    <strong>{v.name}</strong>
                    {v.company && <span> — {v.company}</span>}
                    <span className="tm-manage-type"> {VENDOR_TYPES.find((t) => t.id === v.type)?.label || v.type}</span>
                  </div>
                  <div className="tm-vendor-actions">
                    <button type="button" className="btn-link" onClick={() => handleManageEdit(v)}>Edit</button>
                    <button type="button" className="btn-link" onClick={() => handleManageDelete(v.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="tm-manage-form">
              <h4>{editingVendorId ? 'Edit vendor' : 'Add vendor'}</h4>
              <div className="tm-form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Contact name"
                />
              </div>
              <div className="tm-form-group">
                <label>Company</label>
                <input
                  type="text"
                  value={vendorForm.company}
                  onChange={(e) => setVendorForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="Company name"
                />
              </div>
              <div className="tm-form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={vendorForm.phone}
                  onChange={(e) => setVendorForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone"
                />
              </div>
              <div className="tm-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={vendorForm.email}
                  onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                />
              </div>
              <div className="tm-form-group">
                <label>Type</label>
                <select
                  value={vendorForm.type}
                  onChange={(e) => setVendorForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {VENDOR_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="tm-modal-actions">
                {editingVendorId && (
                  <button type="button" className="btn btn-outline" onClick={() => { setEditingVendorId(null); setVendorForm({ name: '', company: '', phone: '', email: '', type: 'other' }); }}>Cancel edit</button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleManageSaveVendor}
                  disabled={!vendorForm.name?.trim()}
                >
                  {editingVendorId ? 'Save' : 'Add vendor'}
                </button>
              </div>
            </div>
            <div className="tm-modal-actions tm-modal-actions-end">
              <button type="button" className="btn btn-outline" onClick={() => setManageVendorsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionManager;

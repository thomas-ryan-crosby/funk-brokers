import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertiesBySeller, getPropertyById, archiveProperty, restoreProperty, deletePropertyPermanently } from '../services/propertyService';
import { getUserFavoriteIds, removeFromFavorites } from '../services/favoritesService';
import { getAllProperties } from '../services/propertyService';
import { getSavedSearches, removeSavedSearch, getPurchaseProfile, setPurchaseProfile } from '../services/profileService';
import { getOffersByProperty, getOffersByBuyer, acceptOffer, rejectOffer, withdrawOffer, counterOffer } from '../services/offerService';
import { getTransactionsByUser, getTransactionByOfferId, createTransaction } from '../services/transactionService';
import { uploadFile } from '../services/storageService';
import PropertyCard from '../components/PropertyCard';
import CounterOfferModal from '../components/CounterOfferModal';
import './Dashboard.css';

const Dashboard = () => {
  const { user, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my-properties'); // 'my-properties' | 'favorites' | 'my-searches'
  const [myProperties, setMyProperties] = useState([]);
  const [favoriteProperties, setFavoriteProperties] = useState([]);
  const [mySearches, setMySearches] = useState([]);
  const [purchaseProfile, setPurchaseProfileState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingBuyingPower, setEditingBuyingPower] = useState(false);
  const [buyingPowerForm, setBuyingPowerForm] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [offersByProperty, setOffersByProperty] = useState({});
  const [sentOffers, setSentOffers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dealCenterActionOfferId, setDealCenterActionOfferId] = useState(null);
  const [counterOfferFor, setCounterOfferFor] = useState(null); // { offer, property } or null

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardData();
    }
  }, [isAuthenticated, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user's properties
      const properties = await getPropertiesBySeller(user.uid);
      setMyProperties(properties);

      // Load offers for each property (Deal Center – received)
      const offerArrays = await Promise.all(
        properties.map((p) => getOffersByProperty(p.id).catch(() => []))
      );
      const offersByPropertyMap = Object.fromEntries(properties.map((p, i) => [p.id, offerArrays[i] || []]));
      setOffersByProperty(offersByPropertyMap);

      // Load offers sent by user (Deal Center – sent) with property details
      const sent = await getOffersByBuyer(user.uid).catch(() => []);
      const sentWithProperty = await Promise.all(
        sent.map(async (o) => {
          let prop = null;
          try {
            prop = await getPropertyById(o.propertyId);
          } catch (_) {}
          return { offer: o, property: prop };
        })
      );
      setSentOffers(sentWithProperty);

      // Load favorite properties
      const favoriteIds = await getUserFavoriteIds(user.uid);
      if (favoriteIds.length > 0) {
        // Fetch all properties and filter by favorite IDs
        const allProperties = await getAllProperties();
        const favorites = allProperties.filter((p) => favoriteIds.includes(p.id));
        setFavoriteProperties(favorites);
      } else {
        setFavoriteProperties([]);
      }

      // Load saved searches
      const searches = await getSavedSearches(user.uid);
      setMySearches(searches);

      // Load purchase profile for verified-buyer status
      const profile = await getPurchaseProfile(user.uid);
      setPurchaseProfileState(profile);

      // Backfill: create transactions for accepted offers that predate Transaction Manager
      const parseDt = (v) => { if (!v) return null; const d = v?.toDate ? v.toDate() : new Date(v); return Number.isNaN(d?.getTime()) ? null : d; };
      for (const p of properties) {
        const list = offersByPropertyMap[p.id] || [];
        for (const o of list) {
          if (o.status !== 'accepted') continue;
          try {
            const ex = await getTransactionByOfferId(o.id);
            if (!ex) await createTransaction(o, p, { acceptedAt: parseDt(o.updatedAt) || parseDt(o.createdAt) });
          } catch (_) {}
        }
      }
      for (const { offer: o, property: p } of sentWithProperty) {
        if (o.status !== 'accepted') continue;
        try {
          const ex = await getTransactionByOfferId(o.id);
          if (!ex) await createTransaction(o, p || {}, { acceptedAt: parseDt(o.updatedAt) || parseDt(o.createdAt) });
        } catch (_) {}
      }

      // Load transactions (Transaction Manager)
      const tx = await getTransactionsByUser(user.uid).catch(() => []);
      setTransactions(tx);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (propertyId) => {
    try {
      await removeFromFavorites(user.uid, propertyId);
      setFavoriteProperties((prev) => prev.filter((p) => p.id !== propertyId));
    } catch (err) {
      console.error('Error removing favorite:', err);
      alert('Failed to remove favorite. Please try again.');
    }
  };

  const handleRemoveSearch = async (searchId) => {
    try {
      await removeSavedSearch(searchId);
      setMySearches((prev) => prev.filter((s) => s.id !== searchId));
    } catch (err) {
      console.error('Error removing search:', err);
      alert('Failed to remove search. Please try again.');
    }
  };

  const handleBrowseSearch = (filters) => {
    navigate('/browse', { state: { filters } });
  };

  const getStatusBadge = (p) => {
    if (p.archived) return <span className="status-badge status-archived">Archived</span>;
    const statusConfig = {
      active: { label: 'Active', class: 'status-active' },
      under_contract: { label: 'Under Contract', class: 'status-contract' },
      sold: { label: 'Sold', class: 'status-sold' },
      withdrawn: { label: 'Withdrawn', class: 'status-withdrawn' },
      draft: { label: 'Draft', class: 'status-draft' },
    };
    const status = p.status || 'active';
    const config = statusConfig[status] || { label: status, class: 'status-default' };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const activeList = myProperties.filter((p) => !p.archived);
  const archivedList = myProperties.filter((p) => p.archived);

  const handleArchive = async (propertyId) => {
    try {
      await archiveProperty(propertyId);
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to archive. Please try again.');
    }
  };

  const handleRestore = async (propertyId) => {
    try {
      await restoreProperty(propertyId);
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to restore. Please try again.');
    }
  };

  const handleDeletePermanently = async (propertyId) => {
    if (!window.confirm('Permanently delete this listing? This cannot be undone.')) return;
    try {
      await deletePropertyPermanently(propertyId);
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete. Please try again.');
    }
  };

  const formatCurrency = (n) =>
    n != null && Number.isFinite(n)
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
      : '—';

  const handleSaveBuyingPower = async () => {
    const parsed = buyingPowerForm.trim() === '' ? null : parseFloat(buyingPowerForm.replace(/,/g, ''));
    if (buyingPowerForm.trim() !== '' && !Number.isFinite(parsed)) {
      alert('Please enter a valid number for buying power.');
      return;
    }
    try {
      await setPurchaseProfile(user.uid, { buyingPower: parsed ?? null });
      setPurchaseProfileState((p) => (p ? { ...p, buyingPower: parsed ?? null } : null));
      setEditingBuyingPower(false);
      setBuyingPowerForm('');
    } catch (err) {
      console.error(err);
      alert('Failed to save. Please try again.');
    }
  };

  const handleReplaceDocument = async (field, file) => {
    if (!file) return;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File must be under 10MB.');
      return;
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      alert('File must be PDF, JPG, or PNG.');
      return;
    }
    setUploadingDoc(field);
    try {
      const ext = file.name.split('.').pop();
      const path = `buyer-verification/${user.uid}/${Date.now()}_${field}.${ext}`;
      const url = await uploadFile(file, path);
      const docs = { ...(purchaseProfile?.verificationDocuments || {}), [field]: url };
      await setPurchaseProfile(user.uid, { verificationDocuments: docs });
      setPurchaseProfileState((p) => (p ? { ...p, verificationDocuments: docs } : null));
    } catch (err) {
      console.error(err);
      alert('Failed to upload. Please try again.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const formatDate = (v) => {
    if (!v) return '—';
    const d = v?.toDate ? v.toDate() : new Date(v);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleAcceptOffer = async (offerId) => {
    if (!window.confirm('Accept this offer? The property will be marked Under Contract.')) return;
    setDealCenterActionOfferId(offerId);
    try {
      await acceptOffer(offerId);
      await loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to accept offer. Please try again.');
    } finally {
      setDealCenterActionOfferId(null);
    }
  };

  const handleRejectOffer = async (offerId) => {
    if (!window.confirm('Reject this offer? The buyer will no longer see it as pending.')) return;
    setDealCenterActionOfferId(offerId);
    try {
      await rejectOffer(offerId);
      await loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to reject offer. Please try again.');
    } finally {
      setDealCenterActionOfferId(null);
    }
  };

  const handleWithdrawOffer = async (offerId) => {
    if (!window.confirm('Withdraw this offer? The seller will no longer see it as pending.')) return;
    setDealCenterActionOfferId(offerId);
    try {
      await withdrawOffer(offerId);
      await loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to withdraw offer. Please try again.');
    } finally {
      setDealCenterActionOfferId(null);
    }
  };

  const handleCounterSubmit = async (formData) => {
    if (!counterOfferFor?.offer?.id) return;
    await counterOffer(counterOfferFor.offer.id, formData, { userId: user.uid });
    await loadDashboardData();
  };

  const getOfferStatusBadge = (status) => {
    const c = { pending: 'offer-pending', accepted: 'offer-accepted', rejected: 'offer-rejected', countered: 'offer-countered', withdrawn: 'offer-withdrawn' }[status || 'pending'] || 'offer-default';
    const l = (status || 'pending').replace(/_/g, ' ');
    return <span className={`offer-status-badge ${c}`}>{l}</span>;
  };

  if (authLoading || loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-state">Loading dashboard...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1>Welcome back, {userProfile?.name || user?.displayName || 'User'}!</h1>
            <p>Manage your properties and favorites</p>
          </div>
        </div>

        <div className="dashboard-process-ctas">
          <Link to="/create-search" className="btn btn-process btn-process-buy">
            Create a new search
          </Link>
          <Link to="/begin-sale" state={{ startFresh: true }} className="btn btn-process btn-process-sell">
            Add my property
          </Link>
          {purchaseProfile?.buyerVerified ? (
            <span className="dashboard-verified-badge">✓ Verified buyer</span>
          ) : (
            <Link to="/verify-buyer" className="btn btn-outline">
              Become a verified buyer
            </Link>
          )}
        </div>

        {error && <div className="dashboard-error">{error}</div>}

        <div className="dashboard-tabs">
          <button
            className={`tab ${activeTab === 'my-properties' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-properties')}
          >
            My Properties ({activeList.length})
          </button>
          <button
            className={`tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites ({favoriteProperties.length})
          </button>
          <button
            className={`tab ${activeTab === 'my-searches' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-searches')}
          >
            My Searches ({mySearches.length})
          </button>
          <button
            className={`tab ${activeTab === 'deal-center' ? 'active' : ''}`}
            onClick={() => setActiveTab('deal-center')}
          >
            Deal Center
          </button>
          <button
            className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions ({transactions.length})
          </button>
          {purchaseProfile?.buyerVerified && (
            <button
              className={`tab ${activeTab === 'buying-power' ? 'active' : ''}`}
              onClick={() => setActiveTab('buying-power')}
            >
              Buying Power
            </button>
          )}
        </div>

        <div className="dashboard-content">
          {activeTab === 'my-properties' && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>My Properties</h2>
                {activeList.length === 0 && archivedList.length === 0 && (
                  <p className="empty-message">
                    You haven't listed any properties yet.{' '}
                    <Link to="/begin-sale" state={{ startFresh: true }}>Add my property</Link>
                  </p>
                )}
              </div>

              {activeList.length > 0 && (
                <div className="properties-list">
                  {activeList.map((property) => (
                    <div key={property.id} className="property-item">
                      <PropertyCard property={property} embedded />
                      <div className="property-actions">
                        {getStatusBadge(property)}
                        <div className="action-buttons">
                          <Link to={`/property/${property.id}`} className="action-btn btn btn-secondary" title="View">View</Link>
                          {property.status === 'active' && (
                            <Link to={`/property/${property.id}/edit`} className="action-btn btn btn-outline" title="Edit">Edit</Link>
                          )}
                          {!property.verified && (
                            <Link to={`/property/${property.id}/get-verified`} className="action-btn btn btn-outline" title="Verify">Verify</Link>
                          )}
                          <button type="button" className="action-btn btn btn-outline" title="Archive" onClick={() => handleArchive(property.id)}>Arch</button>
                          <button type="button" className="action-btn btn btn-danger" title="Delete" onClick={() => handleDeletePermanently(property.id)}>Del</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {archivedList.length > 0 && (
                <div className="archived-section">
                  <h3>Archived ({archivedList.length})</h3>
                  <p className="form-hint">Archived listings are hidden from browse. Restore to make them visible again.</p>
                  <div className="properties-list">
                    {archivedList.map((property) => (
                      <div key={property.id} className="property-item property-item-archived">
                        <PropertyCard property={property} embedded />
                        <div className="property-actions">
                          {getStatusBadge(property)}
                          <div className="action-buttons">
                            <Link to={`/property/${property.id}`} className="action-btn btn btn-secondary" title="View">View</Link>
                            {!property.verified && (
                              <Link to={`/property/${property.id}/get-verified`} className="action-btn btn btn-outline" title="Verify">Verify</Link>
                            )}
                            <button type="button" className="action-btn btn btn-outline" title="Restore" onClick={() => handleRestore(property.id)}>Rest</button>
                            <button type="button" className="action-btn btn btn-danger" title="Delete" onClick={() => handleDeletePermanently(property.id)}>Del</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>Favorite Properties</h2>
                {favoriteProperties.length === 0 && (
                  <p className="empty-message">
                    You haven't favorited any properties yet.{' '}
                    <Link to="/browse">Browse properties</Link> to find your favorites.
                  </p>
                )}
              </div>

              {favoriteProperties.length > 0 && (
                <div className="properties-list">
                  {favoriteProperties.map((property) => (
                    <div key={property.id} className="property-item">
                      <PropertyCard property={property} embedded />
                      <div className="property-actions">
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="action-btn btn btn-outline"
                            title="Remove"
                            onClick={(e) => {
                              e.preventDefault();
                              handleRemoveFavorite(property.id);
                            }}
                          >
                            Rmv
                          </button>
                          <Link to={`/property/${property.id}`} className="action-btn btn btn-primary" title="View">View</Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'my-searches' && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>My Searches</h2>
                {mySearches.length === 0 && (
                  <p className="empty-message">
                    <Link to="/create-search">Create a new search</Link> and click Browse to save it here.
                  </p>
                )}
              </div>

              {mySearches.length > 0 && (
                <div className="searches-list">
                  {mySearches.map((s) => (
                    <div key={s.id} className="search-item">
                      <div className="search-item-main">
                        <span className="search-item-name">{s.name || 'My search'}</span>
                        {s.createdAt && (
                          <span className="search-item-date">
                            Saved {s.createdAt instanceof Date ? s.createdAt.toLocaleDateString() : new Date(s.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="search-item-actions">
                        <button
                          type="button"
                          className="btn btn-small btn-primary"
                          onClick={() => handleBrowseSearch(s.filters || {})}
                        >
                          Browse
                        </button>
                        <button
                          type="button"
                          className="btn btn-small btn-outline"
                          onClick={() => handleRemoveSearch(s.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'deal-center' && (
            <div className="dashboard-section deal-center-section">
              <div className="section-header">
                <h2>Deal Center</h2>
                <p className="form-hint">Offers on your listings and offers you&apos;ve sent. Accept, reject, counter, or withdraw as needed.</p>
              </div>

              <h3 className="deal-subsection-title">Offers on your listings</h3>
              {activeList.length === 0 ? (
                <p className="empty-message">
                  You don&apos;t have any active listings.{' '}
                  <Link to="/begin-sale" state={{ startFresh: true }}>Add my property</Link> to list a property and receive offers.
                </p>
              ) : (
                <div className="deal-center-list">
                  {activeList.map((property) => {
                    const offers = offersByProperty[property.id] || [];
                    return (
                      <div key={property.id} className="deal-property-block">
                        <div className="deal-property-header">
                          <Link to={`/property/${property.id}`} className="deal-property-title">
                            {[property.address, property.city, property.state].filter(Boolean).join(', ') || 'Property'} — {formatCurrency(property.price)}
                          </Link>
                          <Link to={`/property/${property.id}`} className="btn btn-outline btn-small">
                            View
                          </Link>
                        </div>
                        {offers.length === 0 ? (
                          <p className="deal-no-offers">No offers yet.</p>
                        ) : (
                          <div className="deal-offers">
                            {offers.map((offer) => (
                              <div key={offer.id} className="deal-offer-row">
                                <div className="deal-offer-main">
                                  <span className="deal-offer-buyer">{offer.buyerName || 'Buyer'}</span>
                                  <span className="deal-offer-amount">{formatCurrency(offer.offerAmount)}</span>
                                  <span className="deal-offer-meta">
                                    {['Earnest ' + formatCurrency(offer.earnestMoney), 'Closing ' + formatDate(offer.proposedClosingDate), (offer.financingType || '').replace(/-/g, ' ')].filter(Boolean).join(' · ')}
                                  </span>
                                  <span className="deal-offer-received">Received {formatDate(offer.createdAt)}</span>
                                </div>
                                <div className="deal-offer-actions">
                                  {getOfferStatusBadge(offer.status)}
                                  {offer.status === 'pending' && (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-small"
                                        disabled={dealCenterActionOfferId != null}
                                        onClick={() => handleAcceptOffer(offer.id)}
                                      >
                                        Accept
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-outline btn-small"
                                        disabled={dealCenterActionOfferId != null}
                                        onClick={() => setCounterOfferFor({ offer, property })}
                                      >
                                        Counter
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-outline btn-small"
                                        disabled={dealCenterActionOfferId != null}
                                        onClick={() => handleRejectOffer(offer.id)}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <h3 className="deal-subsection-title">Offers you&apos;ve sent</h3>
              {sentOffers.length === 0 ? (
                <p className="empty-message">
                  You haven&apos;t sent any offers yet.{' '}
                  <Link to="/browse">Browse properties</Link> to submit an offer.
                </p>
              ) : (
                <div className="deal-sent-list">
                  {sentOffers.map(({ offer, property }) => (
                    <div key={offer.id} className="deal-offer-row">
                      <div className="deal-offer-main">
                        <Link to={`/property/${offer.propertyId}`} className="deal-offer-property">
                          {[property?.address, property?.city, property?.state].filter(Boolean).join(', ') || 'Property'}
                        </Link>
                        <span className="deal-offer-amount">{formatCurrency(offer.offerAmount)}</span>
                        <span className="deal-offer-meta">
                          {['Earnest ' + formatCurrency(offer.earnestMoney), 'Closing ' + formatDate(offer.proposedClosingDate), (offer.financingType || '').replace(/-/g, ' ')].filter(Boolean).join(' · ')}
                        </span>
                        <span className="deal-offer-received">Sent {formatDate(offer.createdAt)}</span>
                      </div>
                      <div className="deal-offer-actions">
                        {getOfferStatusBadge(offer.status)}
                        {offer.status === 'pending' && !offer.createdBy && (
                          <button
                            type="button"
                            className="btn btn-outline btn-small"
                            disabled={dealCenterActionOfferId != null}
                            onClick={() => handleWithdrawOffer(offer.id)}
                          >
                            Withdraw
                          </button>
                        )}
                        {offer.status === 'pending' && offer.createdBy && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-small"
                              disabled={dealCenterActionOfferId != null}
                              onClick={() => handleAcceptOffer(offer.id)}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-small"
                              disabled={dealCenterActionOfferId != null}
                              onClick={() => setCounterOfferFor({ offer, property: property || null })}
                            >
                              Counter
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="dashboard-section transactions-section">
              <div className="section-header">
                <h2>Transaction Manager</h2>
                <p className="form-hint">Contractual steps for deals under contract. Complete each step by the due date.</p>
              </div>
              {transactions.length === 0 ? (
                <p className="empty-message">
                  You don&apos;t have any transactions yet. When an offer is accepted, it will appear here with steps like earnest money, inspections, and closing.
                </p>
              ) : (
                <div className="transactions-list">
                  {transactions.map((t) => {
                    const counterparty = t.buyerId === user.uid ? 'Seller' : (t.buyerName || 'Buyer');
                    return (
                      <div key={t.id} className="transaction-card">
                        <div className="transaction-card-main">
                          <Link to={`/transaction/${t.id}`} className="transaction-card-title">
                            Deal · {formatCurrency(t.offerAmount)} · With {counterparty}
                          </Link>
                          <span className="transaction-card-meta">
                            Accepted {formatDate(t.acceptedAt)} · <Link to={`/property/${t.propertyId}`}>View property</Link>
                          </span>
                        </div>
                        <Link to={`/transaction/${t.id}`} className="btn btn-primary btn-small">Manage</Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'buying-power' && purchaseProfile?.buyerVerified && (
            <div className="dashboard-section buying-power-section">
              <div className="section-header">
                <h2>Buying Power</h2>
                <p className="form-hint">Your verified buying power and the documents that support it. You can update these at any time.</p>
              </div>

              <div className="buying-power-card">
                <h3>Buying power</h3>
                {editingBuyingPower ? (
                  <div className="buying-power-edit">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 500000"
                      value={buyingPowerForm}
                      onChange={(e) => setBuyingPowerForm(e.target.value)}
                      className="buying-power-input"
                    />
                    <div className="buying-power-edit-actions">
                      <button type="button" className="btn btn-primary" onClick={handleSaveBuyingPower}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                          setEditingBuyingPower(false);
                          setBuyingPowerForm('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="buying-power-display">
                    <span className="buying-power-amount">{formatCurrency(purchaseProfile?.buyingPower)}</span>
                    <button type="button" className="btn btn-outline btn-small" onClick={() => { setEditingBuyingPower(true); setBuyingPowerForm(purchaseProfile?.buyingPower != null ? String(purchaseProfile.buyingPower) : ''); }}>
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <div className="buying-power-docs">
                <h3>Supporting documents</h3>
                {[
                  { key: 'proofOfFunds', label: 'Proof of Funds' },
                  { key: 'preApprovalLetter', label: 'Pre-Approval Letter' },
                  { key: 'bankLetter', label: 'Bank Letter' },
                  { key: 'governmentId', label: 'Government ID' },
                ].map(({ key, label }) => {
                  const url = purchaseProfile?.verificationDocuments?.[key];
                  const isUploading = uploadingDoc === key;
                  return (
                    <div key={key} className="doc-row">
                      <div className="doc-row-label">{label}</div>
                      <div className="doc-row-actions">
                        {url && (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="doc-link">
                            View
                          </a>
                        )}
                        <label className="btn btn-outline btn-small doc-replace-btn">
                          {isUploading ? 'Uploading…' : 'Replace'}
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            disabled={!!uploadingDoc}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleReplaceDocument(key, f);
                              e.target.value = '';
                            }}
                            hidden
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {counterOfferFor && (
        <CounterOfferModal
          offer={counterOfferFor.offer}
          property={counterOfferFor.property}
          onClose={() => setCounterOfferFor(null)}
          onSubmit={handleCounterSubmit}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

export default Dashboard;

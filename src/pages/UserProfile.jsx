import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUserProfile } from '../services/authService';
import { getPurchaseProfile, getSavedSearches } from '../services/profileService';
import { getPropertiesBySeller } from '../services/propertyService';
import './UserProfile.css';

const formatDate = (value) => {
  if (!value) return '—';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCurrency = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

const getDisplayName = (profile) => {
  if (!profile) return 'User';
  if (profile.anonymousProfile) return profile.publicUsername || 'Anonymous';
  return profile.publicUsername || profile.name || 'User';
};

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [purchaseProfile, setPurchaseProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        setError('');
        const [userProfile, buyerProfile, sellerProperties, searches] = await Promise.all([
          getUserProfile(userId),
          getPurchaseProfile(userId),
          getPropertiesBySeller(userId),
          getSavedSearches(userId),
        ]);
        setProfile(userProfile);
        setPurchaseProfile(buyerProfile);
        setProperties(sellerProperties || []);
        setSavedSearches(searches || []);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Unable to load profile details right now.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const activity = useMemo(() => {
    const entries = [];
    if (purchaseProfile?.buyerVerifiedAt) {
      entries.push({
        label: 'Verified buyer profile',
        date: purchaseProfile.buyerVerifiedAt,
      });
    }
    if (purchaseProfile?.updatedAt) {
      entries.push({
        label: 'Updated buying profile',
        date: purchaseProfile.updatedAt,
      });
    }
    properties.forEach((p) => {
      entries.push({
        label: `Added property: ${p.address || 'Property'}`,
        date: p.createdAt,
      });
    });
    savedSearches.forEach((s) => {
      entries.push({
        label: `Saved search: ${s.name || 'Search'}`,
        date: s.createdAt,
      });
    });
    return entries
      .map((e) => ({
        ...e,
        sortDate: e.date?.toDate ? e.date.toDate() : new Date(e.date || 0),
      }))
      .filter((e) => !Number.isNaN(e.sortDate.getTime()))
      .sort((a, b) => b.sortDate - a.sortDate)
      .slice(0, 6);
  }, [properties, savedSearches, purchaseProfile]);

  if (loading) {
    return (
      <div className="user-profile-page">
        <div className="user-profile-container">
          <p className="user-profile-loading">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-profile-page">
        <div className="user-profile-container">
          <p className="user-profile-error">{error}</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName(profile);

  return (
    <div className="user-profile-page">
      <div className="user-profile-container">
        <header className="user-profile-header">
          <div className="user-profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
          <div>
            <h1>{displayName}</h1>
            <p className="user-profile-subtitle">Public profile overview</p>
          </div>
        </header>

        <div className="user-profile-grid">
          <section className="user-profile-card">
            <h2>Buying power</h2>
            <p className="user-profile-value">{formatCurrency(purchaseProfile?.buyingPower)}</p>
            <p className="user-profile-hint">
              {purchaseProfile?.buyerVerified
                ? 'Verified buyer profile'
                : 'Buying power not verified yet.'}
            </p>
          </section>

          <section className="user-profile-card">
            <h2>Recent activity</h2>
            {activity.length === 0 ? (
              <p className="user-profile-hint">No recent activity shared yet.</p>
            ) : (
              <ul className="user-profile-activity">
                {activity.map((entry, idx) => (
                  <li key={`${entry.label}-${idx}`}>
                    <span>{entry.label}</span>
                    <span className="user-profile-date">{formatDate(entry.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="user-profile-section">
          <h2>Listed properties</h2>
          {properties.length === 0 ? (
            <p className="user-profile-hint">No properties shared yet.</p>
          ) : (
            <div className="user-profile-list">
              {properties.slice(0, 6).map((p) => (
                <div key={p.id} className="user-profile-list-item">
                  <div>
                    <div className="user-profile-list-title">{p.address || 'Property'}</div>
                    <div className="user-profile-list-meta">
                      Added {formatDate(p.createdAt)} · {p.availableForSale !== false ? 'Listed' : 'Not listed'}
                    </div>
                  </div>
                  <button type="button" className="btn btn-outline btn-small" onClick={() => navigate(`/property/${p.id}`)}>
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="user-profile-footer">
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertiesBySeller, getPropertyById, archiveProperty, restoreProperty, deletePropertyPermanently } from '../services/propertyService';
import { getUserFavoriteIds, removeFromFavorites, getFavoritesForProperty } from '../services/favoritesService';
import { getAllProperties } from '../services/propertyService';
import { getSavedSearches, removeSavedSearch, getPurchaseProfile, setPurchaseProfile } from '../services/profileService';
import { addComment, createPost, deletePost, getCommentsForPost, getPostsByAuthor, getPostsForProperties } from '../services/postService';
import { getOffersByProperty, getOffersByBuyer, acceptOffer, rejectOffer, withdrawOffer, counterOffer } from '../services/offerService';
import { getTransactionsByUser, getTransactionByOfferId, createTransaction } from '../services/transactionService';
import { getVendorsByUser, createVendor, updateVendor, deleteVendor, addVendorContact, updateVendorContact, removeVendorContact, VENDOR_TYPES } from '../services/vendorService';
import { updateUserProfile, getUserProfile } from '../services/authService';
import { uploadFile } from '../services/storageService';
import { deleteField } from 'firebase/firestore';
import { getVerifiedBuyerScore, getListingTier, getListingTierLabel, getListingTierProgress, meetsVerifiedBuyerCriteria } from '../utils/verificationScores';
import PropertyCard from '../components/PropertyCard';
import Logo from '../components/Logo';
import CounterOfferModal from '../components/CounterOfferModal';
import ViewOfferModal from '../components/ViewOfferModal';
import DragDropFileInput from '../components/DragDropFileInput';
import AddressAutocomplete from '../components/AddressAutocomplete';
import './Dashboard.css';

function getExpiryMs(offer) {
  const raw = offer?.offerExpirationDate;
  if (!raw) return null;
  const d = raw?.toDate ? raw.toDate() : new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const t = (offer?.offerExpirationTime || '').trim();
  if (t) {
    const m = t.match(/(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?/i);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const ampm = (m[3] || '').toLowerCase();
      if (/p\.?m\.?/.test(ampm) && h < 12) h += 12;
      if (/a\.?m\.?/.test(ampm) && h === 12) h = 0;
      d.setHours(h, min, 0, 0);
    } else {
      d.setHours(23, 59, 59, 999);
    }
  } else {
    d.setHours(23, 59, 59, 999);
  }
  return d.getTime();
}

function formatCountdown(expiryMs, now) {
  if (expiryMs == null) return null;
  const diff = expiryMs - now;
  if (diff <= 0) return { text: 'Expired', expired: true };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return { text: `${d}d ${h}h ${m}m`, expired: false };
  if (h > 0) return { text: `${h}h ${m}m`, expired: false };
  if (m > 0) return { text: `${m}m`, expired: false };
  return { text: '< 1 min', expired: false };
}

function getPublicName(profile) {
  if (!profile) return 'Someone';
  if (profile.anonymousProfile) return profile.publicUsername || 'Anonymous';
  return profile.publicUsername || profile.name || 'Someone';
}

const Dashboard = () => {
  const { user, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my-profile'); // 'my-profile' | 'favorites' | 'my-searches'
  const [myProperties, setMyProperties] = useState([]);
  const [favoriteProperties, setFavoriteProperties] = useState([]);
  const [mySearches, setMySearches] = useState([]);
  const [purchaseProfile, setPurchaseProfileState] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [allPropertiesCache, setAllPropertiesCache] = useState([]);
  const [activityTab, setActivityTab] = useState('received'); // 'received' | 'mine'
  const [myPosts, setMyPosts] = useState([]);
  const [receivedPosts, setReceivedPosts] = useState([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postStage, setPostStage] = useState('type'); // 'type' | 'compose'
  const [postType, setPostType] = useState('tweet'); // 'tweet' | 'poll' | 'instagram'
  const [postBody, setPostBody] = useState('');
  const [postPropertyId, setPostPropertyId] = useState('');
  const [postAddress, setPostAddress] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postImageUploading, setPostImageUploading] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [postHashtags, setPostHashtags] = useState('');
  const [postUserTags, setPostUserTags] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentsOpen, setCommentsOpen] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingBuyingPower, setEditingBuyingPower] = useState(false);
  const [buyingPowerForm, setBuyingPowerForm] = useState('');
  const [editingBuyerInfo, setEditingBuyerInfo] = useState(false);
  const [buyerInfoForm, setBuyerInfoForm] = useState({ name: '', email: '' });
  const [editingPublicUsername, setEditingPublicUsername] = useState(false);
  const [publicUsernameForm, setPublicUsernameForm] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [offersByProperty, setOffersByProperty] = useState({});
  const [sentOffers, setSentOffers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dealCenterActionOfferId, setDealCenterActionOfferId] = useState(null);
  const [dealCenterSubTab, setDealCenterSubTab] = useState('received'); // 'received' | 'sent'
  const [counterOfferFor, setCounterOfferFor] = useState(null); // { offer, property } or null
  const [viewOfferFor, setViewOfferFor] = useState(null); // { offer, property } or null
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const [vendors, setVendors] = useState([]);
  const [vendorForm, setVendorForm] = useState({ vendorName: '', type: 'other', customType: '', website: '', phone: '', email: '', address: '', notes: '' });
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '' });
  const [expandedVendorId, setExpandedVendorId] = useState(null);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [vendorTypeFilter, setVendorTypeFilter] = useState('all');
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactModalVendorId, setContactModalVendorId] = useState(null);
  const [viewingVendorId, setViewingVendorId] = useState(null);

  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    const t = setInterval(() => setCountdownNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardData();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'vendor-center') setActiveTab('vendor-center');
  }, [location.search]);

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

      // Build activity feed (recent likes on your properties)
      const propertiesForActivity = properties.slice(0, 10);
      const favoriteActivityArrays = await Promise.all(
        propertiesForActivity.map(async (p) => {
          const favorites = await getFavoritesForProperty(p.id).catch(() => []);
          return favorites.map((fav) => ({
            type: 'favorite',
            propertyId: p.id,
            propertyAddress: p.address || 'Property',
            userName: getPublicName(fav.userProfile),
            createdAt: fav.createdAt,
          }));
        })
      );
      const favoriteActivity = favoriteActivityArrays.flat();
      favoriteActivity.sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return bDate - aDate;
      });
      setActivityFeed(favoriteActivity.slice(0, 10));

      // Load posts for activity tabs
      const [mine, received] = await Promise.all([
        getPostsByAuthor(user.uid),
        getPostsForProperties(properties.map((p) => p.id)),
      ]);
      setMyPosts(mine || []);
      setReceivedPosts((received || []).filter((p) => p.authorId !== user.uid));

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
      let allProperties = [];
      if (favoriteIds.length > 0) {
        // Fetch all properties and filter by favorite IDs
        allProperties = await getAllProperties();
        setAllPropertiesCache(allProperties);
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

      // Load vendors (Vendor Center)
      const v = await getVendorsByUser(user.uid).catch(() => []);
      setVendors(v);
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

  const resetPostForm = () => {
    setPostType('tweet');
    setPostBody('');
    setPostPropertyId('');
    setPostAddress('');
    setPostImageUrl('');
    setPostImageUploading(false);
    setPollOptions(['', '']);
    setPostHashtags('');
    setPostUserTags('');
    setPostStage('type');
  };

  const openPostModal = () => {
    setShowPostModal(true);
    setPostStage('type');
  };

  const closePostModal = () => {
    setShowPostModal(false);
    resetPostForm();
  };

  const parseTagList = (value, prefix) => {
    return (value || '')
      .split(/[,\s]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => (token.startsWith(prefix) ? token.slice(1) : token))
      .filter(Boolean);
  };

  const formatAddress = (property) => {
    const parts = [property.address, property.city, property.state, property.zipCode].filter(Boolean);
    return parts.join(', ');
  };

  const normalizeAddress = (value) => {
    const base = String(value ?? '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const replacements = [
      ['north', 'n'],
      ['south', 's'],
      ['east', 'e'],
      ['west', 'w'],
      ['street', 'st'],
      ['st', 'st'],
      ['avenue', 'ave'],
      ['ave', 'ave'],
      ['road', 'rd'],
      ['rd', 'rd'],
      ['drive', 'dr'],
      ['dr', 'dr'],
      ['boulevard', 'blvd'],
      ['blvd', 'blvd'],
      ['place', 'pl'],
      ['pl', 'pl'],
      ['lane', 'ln'],
      ['ln', 'ln'],
      ['court', 'ct'],
      ['ct', 'ct'],
      ['circle', 'cir'],
      ['cir', 'cir'],
      ['parkway', 'pkwy'],
      ['pkwy', 'pkwy'],
      ['terrace', 'ter'],
      ['ter', 'ter'],
    ];
    return replacements.reduce((acc, [from, to]) => {
      return acc.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
    }, base);
  };

  const handlePostAddressChange = (value) => {
    const nextValue = typeof value === 'string' ? value : '';
    setPostAddress(nextValue);
    const normalized = normalizeAddress(nextValue);
    if (!normalized) {
      setPostPropertyId('');
      return;
    }
    const match = allPropertiesCache.find((p) => {
      const prop = normalizeAddress(formatAddress(p));
      return prop === normalized || prop.includes(normalized) || normalized.includes(prop);
    });
    if (match) {
      setPostPropertyId(match.id);
    }
  };

  const resolvePropertyMatch = async (addressText) => {
    const normalized = normalizeAddress(addressText);
    if (!normalized) return null;
    let propertiesToMatch = allPropertiesCache;
    if (!propertiesToMatch || propertiesToMatch.length === 0) {
      try {
        propertiesToMatch = await getAllProperties();
        setAllPropertiesCache(propertiesToMatch);
      } catch (_) {
        propertiesToMatch = myProperties;
      }
    }
    return (
      propertiesToMatch.find((p) => {
        const prop = normalizeAddress(formatAddress(p));
        return prop === normalized || prop.includes(normalized) || normalized.includes(prop);
      }) ||
      myProperties.find((p) => {
        const prop = normalizeAddress(formatAddress(p));
        return prop === normalized || prop.includes(normalized) || normalized.includes(prop);
      }) ||
      null
    );
  };

  const handlePostAddressSelect = async (parsed) => {
    const fullAddress = [parsed?.address, parsed?.city, parsed?.state, parsed?.zipCode]
      .filter(Boolean)
      .join(', ');
    const addressText = fullAddress || parsed?.address || '';
    if (addressText) {
      setPostAddress(addressText);
    }
    const normalized = normalizeAddress(addressText);
    if (!normalized) {
      setPostPropertyId('');
      return;
    }
    let propertiesToMatch = allPropertiesCache;
    if (!propertiesToMatch || propertiesToMatch.length === 0) {
      try {
        propertiesToMatch = await getAllProperties();
        setAllPropertiesCache(propertiesToMatch);
      } catch (_) {
        propertiesToMatch = myProperties;
      }
    }
    const match = propertiesToMatch.find((p) => {
      const prop = normalizeAddress(formatAddress(p));
      return prop === normalized || prop.includes(normalized) || normalized.includes(prop);
    }) || myProperties.find((p) => {
      const prop = normalizeAddress(formatAddress(p));
      return prop === normalized || prop.includes(normalized) || normalized.includes(prop);
    });
    console.info('[PostAddressSelect]', {
      addressText,
      normalized,
      matchedPropertyId: match?.id || null,
      matchedAddress: match ? formatAddress(match) : null,
    });
    setPostPropertyId(match?.id || '');
  };

  const handleUploadPostImage = async (file) => {
    if (!file || !user?.uid) return;
    try {
      setPostImageUploading(true);
      const safeName = file.name.replace(/\s+/g, '-');
      const url = await uploadFile(file, `posts/${user.uid}/${Date.now()}_${safeName}`);
      setPostImageUrl(url);
    } catch (err) {
      console.error('Failed to upload post image', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setPostImageUploading(false);
    }
  };

  const handlePostSubmit = async () => {
    if (!postBody.trim()) return;
    if (posting) return;
    if (postType === 'poll') {
      const filled = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (filled.length < 2) {
        alert('Please add at least two poll options.');
        return;
      }
    }
    try {
      setPosting(true);
      const property =
        myProperties.find((p) => p.id === postPropertyId) ||
        (postPropertyId ? null : await resolvePropertyMatch(postAddress));
      const addressText = (postAddress || '').trim();
      const linkedAddress = property ? formatAddress(property) : addressText || null;
      const hashtags = parseTagList(postHashtags, '#');
      const userTags = parseTagList(postUserTags, '@');
      console.info('[CreatePost]', {
        postType,
        postPropertyId,
        resolvedPropertyId: property?.id || null,
        linkedAddress,
        hashtags,
        userTags,
      });
      await createPost({
        authorId: user.uid,
        authorName: userProfile?.publicUsername || userProfile?.name || user?.displayName || 'User',
        type: postType,
        body: postBody.trim(),
        propertyId: property?.id || null,
        propertyAddress: linkedAddress,
        imageUrl: postType === 'instagram' ? postImageUrl.trim() || null : null,
        pollOptions: postType === 'poll' ? pollOptions.map((o) => o.trim()).filter(Boolean) : [],
        hashtags,
        userTags,
      });
      closePostModal();
      const [mine, received] = await Promise.all([
        getPostsByAuthor(user.uid),
        getPostsForProperties(myProperties.map((p) => p.id)),
      ]);
      setMyPosts(mine || []);
      setReceivedPosts((received || []).filter((p) => p.authorId !== user.uid));
    } catch (err) {
      console.error('Failed to create post', err);
      alert('Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!postId || posting) return;
    if (!window.confirm('Delete this post?')) return;
    try {
      await deletePost(postId);
      const [mine, received] = await Promise.all([
        getPostsByAuthor(user.uid),
        getPostsForProperties(myProperties.map((p) => p.id)),
      ]);
      setMyPosts(mine || []);
      setReceivedPosts((received || []).filter((p) => p.authorId !== user.uid));
    } catch (err) {
      console.error('Failed to delete post', err);
      alert('Failed to delete post. Please try again.');
    }
  };

  const toggleComments = async (postId) => {
    const isOpen = !!commentsOpen[postId];
    if (isOpen) {
      setCommentsOpen((prev) => ({ ...prev, [postId]: false }));
      return;
    }
    setCommentsOpen((prev) => ({ ...prev, [postId]: true }));
    if (!commentsByPost[postId]) {
      try {
        setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
        const list = await getCommentsForPost(postId);
        setCommentsByPost((prev) => ({ ...prev, [postId]: list }));
      } catch (err) {
        console.error('Failed to load comments', err);
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleCommentChange = (postId, value) => {
    setCommentDrafts((prev) => ({ ...prev, [postId]: value }));
  };

  const handleCommentSubmit = async (postId) => {
    const body = (commentDrafts[postId] || '').trim();
    if (!body) return;
    try {
      await addComment(postId, {
        authorId: user.uid,
        authorName: userProfile?.publicUsername || userProfile?.name || user?.displayName || 'User',
        body,
      });
      const list = await getCommentsForPost(postId);
      setCommentsByPost((prev) => ({ ...prev, [postId]: list }));
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Failed to add comment', err);
      alert('Failed to add comment. Please try again.');
    }
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

  const computeBuyingPowerValidation = (buyingPower, amounts = {}) => {
    const values = Object.values(amounts)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (buyingPower == null || buyingPower === '') {
      return { status: 'pending', message: 'Enter buying power to validate.' };
    }
    if (!values.length) {
      return { status: 'pending', message: 'Upload a document to validate buying power.' };
    }
    const maxAmount = Math.max(...values);
    if (Number(buyingPower) <= maxAmount) {
      return { status: 'validated', message: `Validated against document amount ${formatCurrency(maxAmount)}.` };
    }
    return { status: 'not_approved', message: 'Not approved - please review with support team.' };
  };

  const buyingPowerValidation = computeBuyingPowerValidation(
    purchaseProfile?.buyingPower ?? null,
    purchaseProfile?.verificationDocumentAmounts || {}
  );

  const overallVerificationStatus = (() => {
    if (buyingPowerValidation.status === 'validated' && isGovernmentIdVerified) return 'verified';
    if (buyingPowerValidation.status === 'not_approved') return 'not_approved';
    return 'pending';
  })();

  const normalizeDate = (value) => {
    if (!value) return null;
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return value;
    const altMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (!altMatch) return null;
    const month = altMatch[1].padStart(2, '0');
    const day = altMatch[2].padStart(2, '0');
    return `${altMatch[3]}-${month}-${day}`;
  };

  const normalizeName = (value) =>
    (value || '').toLowerCase().replace(/[^a-z]/g, '');

  const isGovernmentIdVerified = (() => {
    const extractedName = normalizeName(userProfile?.governmentIdExtractedName);
    const profileName = normalizeName(userProfile?.name || user?.displayName);
    const extractedDob = normalizeDate(userProfile?.governmentIdExtractedDob);
    const profileDob = normalizeDate(userProfile?.dob);
    if (!extractedName || !extractedDob || !profileName || !profileDob) return false;
    return extractedName === profileName && extractedDob === profileDob;
  })();

  const handleSaveBuyingPower = async () => {
    const parsed = buyingPowerForm.trim() === '' ? null : parseFloat(buyingPowerForm.replace(/,/g, ''));
    if (buyingPowerForm.trim() !== '' && !Number.isFinite(parsed)) {
      alert('Please enter a valid number for buying power.');
      return;
    }
    try {
      const validation = computeBuyingPowerValidation(parsed ?? null, purchaseProfile?.verificationDocumentAmounts || {});
      await setPurchaseProfile(user.uid, {
        buyingPower: parsed ?? null,
        buyingPowerValidationStatus: validation.status,
        buyingPowerValidationMessage: validation.message,
      });
      setPurchaseProfileState((p) => (p ? {
        ...p,
        buyingPower: parsed ?? null,
        buyingPowerValidationStatus: validation.status,
        buyingPowerValidationMessage: validation.message,
      } : null));
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
    const amountEligible = ['proofOfFunds', 'preApprovalLetter', 'bankLetter'];
    setUploadingDoc(field);
    try {
      const ext = file.name.split('.').pop();
      const path = `buyer-verification/${user.uid}/${Date.now()}_${field}.${ext}`;
      const url = await uploadFile(file, path);
      const docs = { ...(purchaseProfile?.verificationDocuments || {}), [field]: url };
      const amounts = { ...(purchaseProfile?.verificationDocumentAmounts || {}) };
      if (amountEligible.includes(field) && file.type === 'application/pdf') {
        const { extractPdfAmount } = await import('../utils/pdfAmount');
        const extracted = await extractPdfAmount(file);
        if (extracted != null) {
          amounts[field] = extracted;
        } else {
          delete amounts[field];
        }
      }
      const validation = computeBuyingPowerValidation(purchaseProfile?.buyingPower ?? null, amounts);
      const updates = {
        verificationDocuments: docs,
        buyingPowerValidationStatus: validation.status,
        buyingPowerValidationMessage: validation.message,
      };
      if (amountEligible.includes(field)) {
        updates.verificationDocumentAmounts = amounts;
      }
      await setPurchaseProfile(user.uid, updates);
      setPurchaseProfileState((p) => {
        if (!p) return p;
        return {
          ...p,
          verificationDocuments: docs,
          verificationDocumentAmounts: amounts,
          buyingPowerValidationStatus: validation.status,
          buyingPowerValidationMessage: validation.message,
        };
      });
    } catch (err) {
      console.error(err);
      alert('Failed to upload. Please try again.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleRemoveDocument = async (key) => {
    if (!window.confirm(`Remove ${key === 'proofOfFunds' ? 'Proof of Funds' : key === 'preApprovalLetter' ? 'Pre-Approval Letter' : key === 'bankLetter' ? 'Bank Letter' : 'Government ID'}?`)) return;
    const docs = { ...(purchaseProfile?.verificationDocuments || {}) };
    delete docs[key];
    const nextProfile = { ...purchaseProfile, verificationDocuments: docs };
    const stillVerified = meetsVerifiedBuyerCriteria(nextProfile);
    const amounts = { ...(purchaseProfile?.verificationDocumentAmounts || {}) };
    delete amounts[key];
    const validation = computeBuyingPowerValidation(purchaseProfile?.buyingPower ?? null, amounts);
    const updates = {
      verificationDocuments: docs,
      verificationDocumentAmounts: amounts,
      buyingPowerValidationStatus: validation.status,
      buyingPowerValidationMessage: validation.message,
    };
    if (!stillVerified) {
      updates.buyerVerified = false;
      updates.buyerVerifiedAt = deleteField();
    }
    try {
      await setPurchaseProfile(user.uid, updates);
      setPurchaseProfileState((p) => {
        if (!p) return p;
        const next = { ...p, verificationDocuments: docs };
        next.verificationDocumentAmounts = amounts;
        next.buyingPowerValidationStatus = validation.status;
        next.buyingPowerValidationMessage = validation.message;
        if (!stillVerified) {
          next.buyerVerified = false;
          next.buyerVerifiedAt = null;
        }
        return next;
      });
    } catch (err) {
      console.error(err);
      alert('Failed to remove. Please try again.');
    }
  };

  const handleRemoveBuyingPower = async () => {
    if (!window.confirm('Remove your buying power amount? You can add it again later.')) return;
    try {
      await setPurchaseProfile(user.uid, { buyingPower: null });
      setPurchaseProfileState((p) => (p ? { ...p, buyingPower: null } : null));
      setEditingBuyingPower(false);
      setBuyingPowerForm('');
    } catch (err) {
      console.error(err);
      alert('Failed to remove. Please try again.');
    }
  };

  const handleRemoveBuyerInfo = async () => {
    if (!window.confirm('Remove your buyer name and email? You may need to provide them again to submit offers.')) return;
    const updates = { buyerInfo: {}, buyerVerified: false, buyerVerifiedAt: deleteField() };
    try {
      await setPurchaseProfile(user.uid, updates);
      setPurchaseProfileState((p) => (p ? { ...p, buyerInfo: {}, buyerVerified: false, buyerVerifiedAt: null } : null));
      setEditingBuyerInfo(false);
      setBuyerInfoForm({ name: '', email: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to remove. Please try again.');
    }
  };

  const handleSaveBuyerInfo = async () => {
    const name = (buyerInfoForm.name || '').trim();
    const email = (buyerInfoForm.email || '').trim();
    const next = name || email ? { name: name || null, email: email || null } : {};
    try {
      await setPurchaseProfile(user.uid, { buyerInfo: next });
      setPurchaseProfileState((p) => (p ? { ...p, buyerInfo: next } : null));
      setEditingBuyerInfo(false);
      setBuyerInfoForm({ name: '', email: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to save. Please try again.');
    }
  };

  const handleSavePublicUsername = async () => {
    const username = (publicUsernameForm || '').trim() || null;
    try {
      await updateUserProfile(user.uid, { publicUsername: username });
      // Reload user profile
      const profile = await getUserProfile(user.uid);
      // Update AuthContext would require a refresh, but we can at least update local state
      // For now, just show success - the profile will update on next page load
      setEditingPublicUsername(false);
      setPublicUsernameForm('');
      alert('Public username saved. Changes will appear after page refresh.');
    } catch (err) {
      console.error(err);
      alert('Failed to save. Please try again.');
    }
  };

  const handleVendorSave = async () => {
    if (!vendorForm.vendorName?.trim()) return;
    if (vendorForm.type === 'other' && !vendorForm.customType?.trim()) {
      alert('Please enter a custom vendor type.');
      return;
    }
    try {
      if (editingVendorId) {
        await updateVendor(editingVendorId, vendorForm);
        setEditingVendorId(null);
      } else {
        await createVendor(user.uid, { ...vendorForm, contacts: [] });
      }
      const v = await getVendorsByUser(user.uid);
      setVendors(v);
      setVendorForm({ vendorName: '', type: 'other', customType: '', website: '', phone: '', email: '', address: '', notes: '' });
      setShowVendorModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save vendor. Please try again.');
    }
  };

  const handleVendorEdit = (v) => {
    setEditingVendorId(v.id);
    setVendorForm({
      vendorName: v.vendorName || '',
      type: v.type || 'other',
      customType: v.customType || '',
      website: v.website || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      notes: v.notes || '',
    });
    setShowVendorModal(true);
  };

  const handleNewVendor = () => {
    setEditingVendorId(null);
    setVendorForm({ vendorName: '', type: 'other', website: '', phone: '', email: '', address: '', notes: '' });
    setShowVendorModal(true);
  };

  const handleNewContact = (vendorId) => {
    setContactModalVendorId(vendorId);
    setEditingContactId(null);
    setContactForm({ name: '', phone: '', email: '' });
    setShowContactModal(true);
  };

  const handleEditContact = (vendorId, contact) => {
    setContactModalVendorId(vendorId);
    setEditingContactId(contact.id);
    setContactForm({ name: contact.name || '', phone: contact.phone || '', email: contact.email || '' });
    setShowContactModal(true);
  };

  const handleContactSaveModal = async () => {
    if (!contactForm.name?.trim() || !contactModalVendorId) return;
    try {
      if (editingContactId) {
        await updateVendorContact(contactModalVendorId, editingContactId, contactForm);
        setEditingContactId(null);
      } else {
        await addVendorContact(contactModalVendorId, contactForm);
      }
      const v = await getVendorsByUser(user.uid);
      setVendors(v);
      setContactForm({ name: '', phone: '', email: '' });
      setContactModalVendorId(null);
      setShowContactModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save contact. Please try again.');
    }
  };

  const handleVendorDelete = async (vendorId) => {
    if (!window.confirm('Delete this vendor? They will be removed from any transactions.')) return;
    try {
      await deleteVendor(vendorId);
      const v = await getVendorsByUser(user.uid);
      setVendors(v);
      if (editingVendorId === vendorId) {
        setEditingVendorId(null);
        setVendorForm({ vendorName: '', type: 'other', customType: '', website: '', phone: '', email: '', address: '', notes: '' });
      }
      if (expandedVendorId === vendorId) {
        setExpandedVendorId(null);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete vendor. Please try again.');
    }
  };

  // Filtered vendors based on search and type filter
  const filteredVendors = useMemo(() => {
    let filtered = vendors;
    if (vendorSearchQuery.trim()) {
      const query = vendorSearchQuery.toLowerCase();
      filtered = filtered.filter((v) => 
        (v.vendorName || '').toLowerCase().includes(query) ||
        (v.contacts || []).some((c) => 
          (c.name || '').toLowerCase().includes(query) ||
          (c.email || '').toLowerCase().includes(query) ||
          (c.phone || '').includes(query)
        )
      );
    }
    if (vendorTypeFilter !== 'all') {
      filtered = filtered.filter((v) => v.type === vendorTypeFilter);
    }
    return filtered;
  }, [vendors, vendorSearchQuery, vendorTypeFilter]);

  const handleContactDelete = async (vendorId, contactId) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await removeVendorContact(vendorId, contactId);
      const v = await getVendorsByUser(user.uid);
      setVendors(v);
      if (editingContactId === contactId) {
        setEditingContactId(null);
        setContactForm({ name: '', phone: '', email: '' });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete contact. Please try again.');
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

  /** True when the offer has an expiration and it has passed; treat like rejected (view only). */
  const isOfferExpired = (o) => {
    const ms = getExpiryMs(o);
    return ms != null && ms <= countdownNow;
  };

  const getOfferStatusBadge = (status, offer) => {
    const expired = status === 'pending' && offer && isOfferExpired(offer);
    const c = expired ? 'offer-expired' : { pending: 'offer-pending', accepted: 'offer-accepted', rejected: 'offer-rejected', countered: 'offer-countered', withdrawn: 'offer-withdrawn' }[status || 'pending'] || 'offer-default';
    const l = expired ? 'Expired' : (status || 'pending').replace(/_/g, ' ');
    return <span className={`offer-status-badge ${c}`}>{l}</span>;
  };

  /** True if the current user sent this offer or counter; they can only View or Rescind, not Counter/Accept/Reject. */
  const iSentThisOffer = (o) => o?.createdBy === user?.uid;

  /** Event badges for Deal Center: "You have received an offer", "You have received a counter", "You sent an offer", "You sent a counter" */
  /** Each row = one offer/contract. Badge describes what THIS offer is from the user's POV. */
  const getOfferEventBadge = (offer, { isReceived }) => {
    if (!offer || !user?.uid) return null;
    const uid = user.uid;
    // Seller / offers on your listings (each row is one offer document)
    if (isReceived) {
      // This row is the counter we wrote (we created it)
      if (offer.counterToOfferId && offer.createdBy === uid) return { label: 'You sent a counter', type: 'sent-counter' };
      // This row is the buyer's counter to our counter
      if (offer.counterToOfferId && offer.createdBy !== uid) return { label: 'You have received a counter', type: 'received-counter' };
      // counteredByOfferId = we received this offer and countered it; the counter is a different row. This row = received offer.
      if (offer.counteredByOfferId) return { label: 'You have received an offer', type: 'received-offer' };
      return { label: 'You have received an offer', type: 'received-offer' };
    }
    // Buyer / offers you've sent (each row is one offer document)
    if (offer.counterToOfferId && offer.createdBy === uid) return { label: 'You sent a counter', type: 'sent-counter' };
    if (offer.counteredByOfferId) return { label: 'You have received a counter', type: 'received-counter' };
    return { label: 'You sent an offer', type: 'sent-offer' };
  };

  const sentByProperty = useMemo(() => {
    const byId = {};
    for (const { offer, property } of sentOffers) {
      const id = offer.propertyId;
      if (!id) continue;
      if (!byId[id]) byId[id] = { propertyId: id, property: null, items: [] };
      if (property) byId[id].property = byId[id].property || property;
      byId[id].items.push({ offer, property });
    }
    return Object.values(byId).sort((a, b) => {
      const latest = (g) => Math.max(0, ...g.items.map(({ offer: o }) => {
        const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
        return d.getTime();
      }));
      return latest(b) - latest(a);
    });
  }, [sentOffers]);

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
          <div className="dashboard-brand">
            <Logo variant="symbol" alt="OpenTo" />
            <div>
              <h1>Welcome back, {userProfile?.name || user?.displayName || 'User'}!</h1>
              <p>Manage your profile, properties, and activity</p>
            </div>
          </div>
        </div>

        <div className="dashboard-scores-and-ctas">
          <div className="dashboard-buyer-status">
            {getVerifiedBuyerScore(purchaseProfile).score >= 100 ? (
              <>
                <span className="dashboard-buyer-status-badge">✓ Verified buyer</span>
                <span className="dashboard-buyer-status-score">100%</span>
              </>
            ) : (
              <>
                <span className="dashboard-buyer-status-label">Verified buyer</span>
                <span className="dashboard-buyer-status-value">
                  {getVerifiedBuyerScore(purchaseProfile).score}%
                </span>
                <Link to="/verify-buyer" className="dashboard-buyer-status-link">
                  {getVerifiedBuyerScore(purchaseProfile).score === 0 ? 'Become a verified buyer' : 'Complete verification'}
                </Link>
              </>
            )}
          </div>
          <div className="dashboard-process-ctas">
            <Link to="/create-search" className="btn btn-process btn-process-buy">
              Create a new search
            </Link>
            <Link to="/begin-sale" state={{ startFresh: true }} className="btn btn-process btn-process-sell">
              Add my property
            </Link>
          </div>
        </div>

        {error && <div className="dashboard-error">{error}</div>}

        <div className="dashboard-tabs">
          <button
            className={`tab ${activeTab === 'my-profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-profile')}
          >
            My Profile
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
          <button
            className={`tab ${activeTab === 'vendor-center' ? 'active' : ''}`}
            onClick={() => setActiveTab('vendor-center')}
          >
            Vendor Center
          </button>
        </div>

        <div className="dashboard-content">
          {activeTab === 'my-profile' && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>My Properties</h2>
                {activeList.length === 0 && archivedList.length === 0 && (
                  <p className="empty-message">
                    Claim a property from the <Link to="/browse">map</Link> or{' '}
                    <Link to="/begin-sale" state={{ startFresh: true }}>list a new property</Link>.
                  </p>
                )}
              </div>

              {activeList.length > 0 && (
                <div className="properties-list">
                  {activeList.map((property) => {
                    const tierProgress = getListingTierProgress(property);
                    const showTierNudge = tierProgress.nextTier && tierProgress.percentage < 100;
                    return (
                      <div key={property.id} className="property-item">
                        <PropertyCard property={property} embedded listingTier={getListingTier(property)} />
                        {showTierNudge && (
                          <div className="property-tier-nudge">
                            <span className="property-tier-nudge-text">
                              Add more info to reach <strong>{tierProgress.nextTier}</strong>
                              {tierProgress.missingItems?.length > 0 && (
                                <span className="property-tier-nudge-hint"> — e.g. {tierProgress.missingItems.slice(0, 2).join(', ')}</span>
                              )}
                            </span>
                            {(() => {
                              // Determine the best route based on current tier and next tier
                              const needsDocuments = tierProgress.tier === 'verified' || tierProgress.tier === 'enhanced' || tierProgress.tier === 'premium';
                              const advanceUrl = needsDocuments 
                                ? `/property/${property.id}/get-verified`
                                : `/property/${property.id}/edit`;
                              return (
                                <Link to={advanceUrl} className="property-tier-nudge-link">Add info</Link>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {archivedList.length > 0 && (
                <div className="archived-section">
                  <h3>Archived ({archivedList.length})</h3>
                  <p className="form-hint">Archived listings are hidden from browse. Restore to make them visible again.</p>
                  <div className="properties-list">
                    {archivedList.map((property) => (
                      <div key={property.id} className="property-item property-item-archived">
                        <PropertyCard property={property} embedded listingTier={getListingTier(property)} />
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
                      <PropertyCard property={property} embedded listingTier={getListingTier(property)} />
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
                <p className="form-hint">If you received an offer or counter, you can accept, reject, or counter. If you sent it, you can only view or rescind.</p>
              </div>

              <div className="deal-center-subtabs">
                <button
                  type="button"
                  className={`deal-center-subtab ${dealCenterSubTab === 'received' ? 'active' : ''}`}
                  onClick={() => setDealCenterSubTab('received')}
                >
                  Deals on your properties
                </button>
                <button
                  type="button"
                  className={`deal-center-subtab ${dealCenterSubTab === 'sent' ? 'active' : ''}`}
                  onClick={() => setDealCenterSubTab('sent')}
                >
                  Offers sent
                </button>
              </div>

              {dealCenterSubTab === 'received' && (
                <>
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
                            {offers.map((offer) => {
                              const evt = getOfferEventBadge(offer, { isReceived: true });
                              return (
                              <div key={offer.id} className="deal-offer-row">
                                <div className="deal-offer-main">
                                  {evt && (
                                    <span className={`offer-event-badge offer-event-badge--${evt.type}`}>{evt.label}</span>
                                  )}
                                  <span className="deal-offer-buyer">{offer.buyerName || 'Buyer'}</span>
                                  <span className="deal-offer-amount">{formatCurrency(offer.offerAmount)}</span>
                                  <span className="deal-offer-meta">
                                    {['Earnest ' + formatCurrency(offer.earnestMoney), 'Closing ' + formatDate(offer.proposedClosingDate), (offer.financingType || '').replace(/-/g, ' ')].filter(Boolean).join(' · ')}
                                  </span>
                                  <span className="deal-offer-received">Received {formatDate(offer.createdAt)}</span>
                                </div>
                                {(() => {
                                  const ms = getExpiryMs(offer);
                                  if (ms == null) return null;
                                  const c = formatCountdown(ms, countdownNow);
                                  const byStr = formatDate(offer.offerExpirationDate) + (offer.offerExpirationTime ? ` ${offer.offerExpirationTime}` : '');
                                  return (
                                    <div className="deal-offer-expiry">
                                      <span className={`deal-offer-expiry-countdown ${c.expired ? 'deal-offer-expiry--expired' : ''}`}>{c.text}</span>
                                      <span className="deal-offer-expiry-by">{c.expired ? 'Was ' : 'By '}{byStr}</span>
                                    </div>
                                  );
                                })()}
                                <div className="deal-offer-actions">
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-small"
                                    onClick={() => setViewOfferFor({ offer, property })}
                                  >
                                    View Offer
                                  </button>
                                  {offer.buyerId && (
                                    <Link
                                      to={`/messages?to=${encodeURIComponent(offer.buyerId)}&propertyId=${encodeURIComponent(offer.propertyId || property?.id || '')}`}
                                      state={{ otherUserName: offer.buyerName || 'Buyer', propertyAddress: [property?.address, property?.city, property?.state].filter(Boolean).join(', ') || null }}
                                      className="btn btn-outline btn-small"
                                    >
                                      Message
                                    </Link>
                                  )}
                                  {getOfferStatusBadge(offer.status, offer)}
                                  {offer.status === 'pending' && !isOfferExpired(offer) && iSentThisOffer(offer) && (
                                    <button
                                      type="button"
                                      className="btn btn-outline btn-small"
                                      disabled={dealCenterActionOfferId != null}
                                      onClick={() => handleWithdrawOffer(offer.id)}
                                    >
                                      Rescind
                                    </button>
                                  )}
                                  {offer.status === 'pending' && !isOfferExpired(offer) && !iSentThisOffer(offer) && (
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
                            );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
                </>
              )}

              {dealCenterSubTab === 'sent' && (
              <>
              {sentOffers.length === 0 ? (
                <p className="empty-message">
                  You haven&apos;t sent any offers yet.{' '}
                  <Link to="/browse">Browse properties</Link> to submit an offer.
                </p>
              ) : (
                <div className="deal-center-list">
                  {sentByProperty.map(({ propertyId, property, items }) => (
                    <div key={propertyId} className="deal-property-block">
                      <div className="deal-property-header">
                        <Link to={`/property/${propertyId}`} className="deal-property-title">
                          {[property?.address, property?.city, property?.state].filter(Boolean).join(', ') || 'Property'}
                          {property?.price != null ? ` — ${formatCurrency(property.price)}` : ''}
                        </Link>
                        <Link to={`/property/${propertyId}`} className="btn btn-outline btn-small">
                          View
                        </Link>
                      </div>
                      <div className="deal-offers">
                        {items.map(({ offer, property: prop }) => {
                          const evt = getOfferEventBadge(offer, { isReceived: false });
                          return (
                            <div key={offer.id} className="deal-offer-row">
                              <div className="deal-offer-main">
                                {evt && (
                                  <span className={`offer-event-badge offer-event-badge--${evt.type}`}>{evt.label}</span>
                                )}
                                <span className="deal-offer-amount">{formatCurrency(offer.offerAmount)}</span>
                                <span className="deal-offer-meta">
                                  {['Earnest ' + formatCurrency(offer.earnestMoney), 'Closing ' + formatDate(offer.proposedClosingDate), (offer.financingType || '').replace(/-/g, ' ')].filter(Boolean).join(' · ')}
                                </span>
                                <span className="deal-offer-received">Sent {formatDate(offer.createdAt)}</span>
                              </div>
                              {(() => {
                                const ms = getExpiryMs(offer);
                                if (ms == null) return null;
                                const c = formatCountdown(ms, countdownNow);
                                const byStr = formatDate(offer.offerExpirationDate) + (offer.offerExpirationTime ? ` ${offer.offerExpirationTime}` : '');
                                return (
                                  <div className="deal-offer-expiry">
                                    <span className={`deal-offer-expiry-countdown ${c.expired ? 'deal-offer-expiry--expired' : ''}`}>{c.text}</span>
                                    <span className="deal-offer-expiry-by">{c.expired ? 'Was ' : 'By '}{byStr}</span>
                                  </div>
                                );
                              })()}
                              <div className="deal-offer-actions">
                                <button
                                  type="button"
                                  className="btn btn-outline btn-small"
                                  onClick={() => setViewOfferFor({ offer, property: prop || null })}
                                >
                                  View Offer
                                </button>
                                {prop?.sellerId && (
                                  <Link
                                    to={`/messages?to=${encodeURIComponent(prop.sellerId)}&propertyId=${encodeURIComponent(offer.propertyId || propertyId || '')}`}
                                    state={{ otherUserName: prop?.sellerName || 'Seller', propertyAddress: [prop?.address, prop?.city, prop?.state].filter(Boolean).join(', ') || null }}
                                    className="btn btn-outline btn-small"
                                  >
                                    Message
                                  </Link>
                                )}
                                {getOfferStatusBadge(offer.status, offer)}
                                {offer.status === 'pending' && !isOfferExpired(offer) && iSentThisOffer(offer) && (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-small"
                                    disabled={dealCenterActionOfferId != null}
                                    onClick={() => handleWithdrawOffer(offer.id)}
                                  >
                                    Rescind
                                  </button>
                                )}
                                {offer.status === 'pending' && !isOfferExpired(offer) && !iSentThisOffer(offer) && (
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
                                      onClick={() => setCounterOfferFor({ offer, property: prop || null })}
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
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </>
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

          {activeTab === 'my-profile' && (
            <div className="dashboard-section buying-power-section">
              <div className="section-header">
                <h2>Buying Power</h2>
                <p className="form-hint">Your verified buying power and the documents that support it. You can update these at any time.</p>
              </div>

              <div className="buying-power-overall">
                <span>Overall verification</span>
                <span className={`buying-power-overall-pill ${overallVerificationStatus}`}>
                  {overallVerificationStatus === 'verified'
                    ? 'Verified'
                    : overallVerificationStatus === 'not_approved'
                      ? 'Not approved'
                      : 'Pending'}
                </span>
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
                  </div>
                ) : (
                  <div className="buying-power-display">
                    <div>
                      <span className="buying-power-amount">{formatCurrency(purchaseProfile?.buyingPower)}</span>
                      <div className="buying-power-validation">
                        <span className={`buying-power-validation-pill ${buyingPowerValidation.status}`}>
                          {buyingPowerValidation.status === 'validated'
                            ? 'Validated'
                            : buyingPowerValidation.status === 'not_approved'
                              ? 'Not approved'
                              : 'Pending'}
                        </span>
                        <span className="buying-power-validation-note">
                          {buyingPowerValidation.message}
                        </span>
                      </div>
                    </div>
                    <div className="buying-power-actions">
                      <button type="button" className="btn btn-outline btn-small" onClick={() => { setEditingBuyingPower(true); setBuyingPowerForm(purchaseProfile?.buyingPower != null ? String(purchaseProfile.buyingPower) : ''); }}>
                        Edit
                      </button>
                    </div>
                  </div>
                )}

                <div className="buying-power-docs">
                  <h4>Supporting documents</h4>
                  {!editingBuyingPower && (
                    <p className="form-hint">Edit buying power to add or replace documents.</p>
                  )}
                  {[
                    { key: 'proofOfFunds', label: 'Proof of Funds' },
                    { key: 'preApprovalLetter', label: 'Pre-Approval Letter' },
                    { key: 'bankLetter', label: 'Bank Letter' },
                  ].map(({ key, label }) => {
                    const url = purchaseProfile?.verificationDocuments?.[key];
                    const amount = purchaseProfile?.verificationDocumentAmounts?.[key];
                    const isUploading = uploadingDoc === key;
                    return (
                      <div key={key} className="doc-row">
                        <div className="doc-row-label">
                          {label}
                          {amount != null && `: Amount - ${formatCurrency(amount)}`}
                        </div>
                        <div className="doc-row-actions">
                          {url && (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="doc-link">
                              View
                            </a>
                          )}
                          {editingBuyingPower && (
                            <>
                              <div className="doc-drag-drop-wrap">
                                <DragDropFileInput
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(f) => { if (f) handleReplaceDocument(key, f); }}
                                  disabled={!!uploadingDoc}
                                  uploading={isUploading}
                                  placeholder={url ? 'Drop to replace' : 'Drop or click to add'}
                                  className="dashboard-doc-upload"
                                />
                              </div>
                              {url && (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-small doc-remove-btn"
                                  onClick={() => handleRemoveDocument(key)}
                                >
                                  Remove
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="buying-power-id-status">
                  <span>Government ID</span>
                  <span className={`buying-power-id-pill ${isGovernmentIdVerified ? 'is-verified' : 'is-unverified'}`}>
                    {isGovernmentIdVerified ? 'Verified' : 'Not verified'}
                  </span>
                </div>

                <div className="buying-power-funding">
                  <div>
                    <p className="form-hint">Funding account</p>
                    <p className="buying-power-funding-name">
                      {userProfile?.bankName || 'Not linked yet'}
                    </p>
                  </div>
                </div>

                {editingBuyingPower && (
                  <div className="buying-power-edit-actions">
                    <button type="button" className="btn btn-primary" onClick={handleSaveBuyingPower}>
                      Save changes
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
                )}
              </div>
            </div>
          )}

          {activeTab === 'my-profile' && (
            <div className="dashboard-section activity-section">
              <div className="section-header">
                <h2>Activity Feed</h2>
                <p className="form-hint">Recent likes and activity around your properties.</p>
              </div>
              <div className="activity-header-actions">
                <button type="button" className="btn btn-primary btn-small" onClick={openPostModal}>
                  New Post
                </button>
              </div>
              <div className="activity-tabs">
                <button
                  type="button"
                  className={`activity-tab ${activityTab === 'received' ? 'active' : ''}`}
                  onClick={() => setActivityTab('received')}
                >
                  Received activity
                </button>
                <button
                  type="button"
                  className={`activity-tab ${activityTab === 'mine' ? 'active' : ''}`}
                  onClick={() => setActivityTab('mine')}
                >
                  My activity
                </button>
              </div>

              {activityTab === 'received' && (
                <>
                  {activityFeed.length === 0 && receivedPosts.length === 0 ? (
                    <p className="empty-message">No recent activity yet.</p>
                  ) : (
                    <div className="activity-list">
                      {activityFeed.map((entry, idx) => (
                        <div key={`${entry.propertyId}-${entry.createdAt}-${idx}`} className="activity-item">
                          <div className="activity-item-title">
                            {entry.userName} liked {entry.propertyAddress}
                          </div>
                          <div className="activity-item-meta">{formatDate(entry.createdAt)}</div>
                        </div>
                      ))}
                      {receivedPosts.map((post) => (
                        <div key={post.id} className="activity-item activity-item--post">
                          <div className="activity-item-header">
                            <div className="activity-avatar">{(post.authorName || 'U').charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="activity-item-title">{post.authorName || 'Someone'}</div>
                              {post.propertyAddress && (
                                <div className="activity-item-meta">
                                  About{' '}
                                  {post.propertyId ? (
                                    <Link to={`/property/${post.propertyId}`} className="activity-item-link">
                                      {post.propertyAddress}
                                    </Link>
                                  ) : (
                                    post.propertyAddress
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="activity-item-date">{formatDate(post.createdAt)}</div>
                          </div>
                          <div className="activity-item-body">{post.body}</div>
                          {(post.hashtags?.length || post.userTags?.length) && (
                            <div className="activity-item-tags">
                              {post.hashtags?.map((tag) => (
                                <span key={`${post.id}-hash-${tag}`} className="activity-tag">#{tag}</span>
                              ))}
                              {post.userTags?.map((tag) => (
                                <span key={`${post.id}-user-${tag}`} className="activity-tag">@{tag}</span>
                              ))}
                            </div>
                          )}
                          {post.imageUrl && (
                            <div className="activity-item-media">
                              <img src={post.imageUrl} alt="Post media" />
                            </div>
                          )}
                          {post.pollOptions && post.pollOptions.length > 0 && (
                            <div className="activity-item-poll">
                              {post.pollOptions.map((opt, idx) => (
                                <div key={`${post.id}-opt-${idx}`} className="activity-item-poll-option">
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="activity-item-actions">
                            <button type="button" onClick={() => toggleComments(post.id)}>
                              Comment
                            </button>
                          </div>
                          {commentsOpen[post.id] && (
                            <div className="activity-comments">
                              {commentsLoading[post.id] ? (
                                <p className="activity-comment-empty">Loading comments...</p>
                              ) : (commentsByPost[post.id] || []).length === 0 ? (
                                <p className="activity-comment-empty">No comments yet.</p>
                              ) : (
                                <div className="activity-comment-list">
                                  {(commentsByPost[post.id] || []).map((c) => (
                                    <div key={c.id} className="activity-comment">
                                      <strong>{c.authorName || 'Someone'}</strong> {c.body}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="activity-comment-form">
                                <input
                                  type="text"
                                  value={commentDrafts[post.id] || ''}
                                  onChange={(e) => handleCommentChange(post.id, e.target.value)}
                                  placeholder="Write a comment..."
                                />
                                <button type="button" onClick={() => handleCommentSubmit(post.id)}>
                                  Send
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activityTab === 'mine' && (
                <>
                  {myPosts.length === 0 ? (
                    <p className="empty-message">You have not posted yet.</p>
                  ) : (
                    <div className="activity-list">
                      {myPosts.map((post) => (
                        <div key={post.id} className="activity-item activity-item--post">
                          <div className="activity-item-header">
                            <div className="activity-avatar">{(userProfile?.name || user?.displayName || 'U').charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="activity-item-title">You posted</div>
                              {post.propertyAddress && (
                                <div className="activity-item-meta">
                                  About{' '}
                                  {post.propertyId ? (
                                    <Link to={`/property/${post.propertyId}`} className="activity-item-link">
                                      {post.propertyAddress}
                                    </Link>
                                  ) : (
                                    post.propertyAddress
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="activity-item-date">{formatDate(post.createdAt)}</div>
                          </div>
                          <div className="activity-item-body">{post.body}</div>
                          {(post.hashtags?.length || post.userTags?.length) && (
                            <div className="activity-item-tags">
                              {post.hashtags?.map((tag) => (
                                <span key={`${post.id}-hash-${tag}`} className="activity-tag">#{tag}</span>
                              ))}
                              {post.userTags?.map((tag) => (
                                <span key={`${post.id}-user-${tag}`} className="activity-tag">@{tag}</span>
                              ))}
                            </div>
                          )}
                          {post.imageUrl && (
                            <div className="activity-item-media">
                              <img src={post.imageUrl} alt="Post media" />
                            </div>
                          )}
                          {post.pollOptions && post.pollOptions.length > 0 && (
                            <div className="activity-item-poll">
                              {post.pollOptions.map((opt, idx) => (
                                <div key={`${post.id}-opt-${idx}`} className="activity-item-poll-option">
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="activity-item-actions">
                            <button type="button" onClick={() => toggleComments(post.id)}>
                              Comment
                            </button>
                            <button type="button" className="activity-item-delete" onClick={() => handleDeletePost(post.id)}>
                              Delete
                            </button>
                          </div>
                          {commentsOpen[post.id] && (
                            <div className="activity-comments">
                              {commentsLoading[post.id] ? (
                                <p className="activity-comment-empty">Loading comments...</p>
                              ) : (commentsByPost[post.id] || []).length === 0 ? (
                                <p className="activity-comment-empty">No comments yet.</p>
                              ) : (
                                <div className="activity-comment-list">
                                  {(commentsByPost[post.id] || []).map((c) => (
                                    <div key={c.id} className="activity-comment">
                                      <strong>{c.authorName || 'Someone'}</strong> {c.body}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="activity-comment-form">
                                <input
                                  type="text"
                                  value={commentDrafts[post.id] || ''}
                                  onChange={(e) => handleCommentChange(post.id, e.target.value)}
                                  placeholder="Write a comment..."
                                />
                                <button type="button" onClick={() => handleCommentSubmit(post.id)}>
                                  Send
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'vendor-center' && (
            <div className="dashboard-section vendor-center-section">
              <div className="vendor-center-header">
                <div>
                  <h2>Vendor Center</h2>
                  <p className="vendor-center-subtitle">Manage vendors and contacts for your deals. Assign them to transactions from the deal page.</p>
                </div>
                <button type="button" className="btn btn-primary vendor-center-add-btn" onClick={handleNewVendor}>
                  + Add Vendor
                </button>
              </div>

              <div className="vendor-center-filters">
                <div className="vendor-center-search">
                  <input
                    type="text"
                    placeholder="Search vendors or contacts..."
                    value={vendorSearchQuery}
                    onChange={(e) => setVendorSearchQuery(e.target.value)}
                    className="vendor-center-search-input"
                  />
                </div>
                <select
                  value={vendorTypeFilter}
                  onChange={(e) => setVendorTypeFilter(e.target.value)}
                  className="vendor-center-type-filter"
                >
                  <option value="all">All Types</option>
                  {VENDOR_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              {filteredVendors.length === 0 ? (
                <div className="vendor-center-empty">
                  <div className="vendor-center-empty-icon">📋</div>
                  <h3>{vendors.length === 0 ? 'No vendors yet' : 'No vendors match your search'}</h3>
                  <p>{vendors.length === 0 ? 'Add your first vendor to get started managing your deal contacts.' : 'Try adjusting your search or filter.'}</p>
                  {vendors.length === 0 && (
                    <button type="button" className="btn btn-primary" onClick={handleNewVendor}>
                      Add Your First Vendor
                    </button>
                  )}
                </div>
              ) : (
                <div className="vendor-center-table-wrapper">
                  <table className="vendor-center-table">
                    <thead>
                      <tr>
                        <th className="vendor-table-col-name">Vendor Name</th>
                        <th className="vendor-table-col-type">Type</th>
                        <th className="vendor-table-col-website">Website</th>
                        <th className="vendor-table-col-phone">Phone</th>
                        <th className="vendor-table-col-email">Email</th>
                        <th className="vendor-table-col-address">Address</th>
                        <th className="vendor-table-col-contacts">Contacts</th>
                        <th className="vendor-table-col-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVendors.map((v) => (
                        <>
                          <tr key={v.id} className="vendor-table-row">
                            <td className="vendor-table-col-name">
                              <strong className="vendor-table-name">{v.vendorName || 'Unnamed vendor'}</strong>
                            </td>
                            <td className="vendor-table-col-type">
                              <span className={`vendor-table-type-badge vendor-table-type-badge--${v.type}`}>
                                {v.type === 'other' && v.customType ? v.customType : (VENDOR_TYPES.find((t) => t.id === v.type)?.label || v.type)}
                              </span>
                            </td>
                            <td className="vendor-table-col-website">
                              {v.website ? (
                                <a href={v.website.startsWith('http') ? v.website : `https://${v.website}`} target="_blank" rel="noopener noreferrer" className="vendor-table-link">
                                  {v.website}
                                </a>
                              ) : (
                                <span className="vendor-table-empty">—</span>
                              )}
                            </td>
                            <td className="vendor-table-col-phone">
                              {v.phone ? (
                                <a href={`tel:${v.phone}`} className="vendor-table-link">
                                  {v.phone}
                                </a>
                              ) : (
                                <span className="vendor-table-empty">—</span>
                              )}
                            </td>
                            <td className="vendor-table-col-email">
                              {v.email ? (
                                <a href={`mailto:${v.email}`} className="vendor-table-link">
                                  {v.email}
                                </a>
                              ) : (
                                <span className="vendor-table-empty">—</span>
                              )}
                            </td>
                            <td className="vendor-table-col-address">
                              {v.address ? (
                                <span className="vendor-table-address">{v.address}</span>
                              ) : (
                                <span className="vendor-table-empty">—</span>
                              )}
                            </td>
                            <td className="vendor-table-col-contacts">
                              <div className="vendor-table-contacts-cell">
                                <span className="vendor-table-contacts-count">
                                  {v.contacts && v.contacts.length > 0 ? (
                                    <>
                                      {v.contacts.length} {v.contacts.length === 1 ? 'contact' : 'contacts'}
                                    </>
                                  ) : (
                                    'No contacts'
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="vendor-table-col-actions">
                              <div className="vendor-table-actions">
                                <button
                                  type="button"
                                  className="vendor-table-action-btn"
                                  onClick={() => {
                                    if (expandedVendorId === v.id) {
                                      setExpandedVendorId(null);
                                      setViewingVendorId(null);
                                    } else {
                                      setExpandedVendorId(v.id);
                                      setViewingVendorId(v.id);
                                    }
                                  }}
                                  title="View vendor details"
                                >
                                  {expandedVendorId === v.id ? '▼ Hide' : '▶ View'}
                                </button>
                                <button
                                  type="button"
                                  className="vendor-table-action-btn"
                                  onClick={() => handleVendorEdit(v)}
                                  title="Edit vendor"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="vendor-table-action-btn vendor-table-action-btn--danger"
                                  onClick={() => handleVendorDelete(v.id)}
                                  title="Delete vendor"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedVendorId === v.id && (
                            <tr key={`${v.id}-expanded`} className="vendor-table-row-expanded">
                              <td colSpan="8" className="vendor-table-expanded-cell">
                                <div className="vendor-table-expanded-content">
                                  <div className="vendor-table-contacts-section">
                                    <div className="vendor-table-contacts-header">
                                      <h4>Contacts</h4>
                                      <button
                                        type="button"
                                        className="btn btn-outline btn-small"
                                        onClick={() => handleNewContact(v.id)}
                                      >
                                        + Add Contact
                                      </button>
                                    </div>
                                    {v.contacts && v.contacts.length > 0 ? (
                                      <table className="vendor-table-contacts-table">
                                        <thead>
                                          <tr>
                                            <th>Name</th>
                                            <th>Phone</th>
                                            <th>Email</th>
                                            <th>Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {v.contacts.map((contact) => (
                                            <tr key={contact.id}>
                                              <td><strong>{contact.name}</strong></td>
                                              <td>
                                                {contact.phone ? (
                                                  <a href={`tel:${contact.phone}`} className="vendor-table-contact-link">
                                                    {contact.phone}
                                                  </a>
                                                ) : (
                                                  <span className="vendor-table-empty">—</span>
                                                )}
                                              </td>
                                              <td>
                                                {contact.email ? (
                                                  <a href={`mailto:${contact.email}`} className="vendor-table-contact-link">
                                                    {contact.email}
                                                  </a>
                                                ) : (
                                                  <span className="vendor-table-empty">—</span>
                                                )}
                                              </td>
                                              <td>
                                                <div className="vendor-table-contact-actions">
                                                  <button
                                                    type="button"
                                                    className="vendor-table-contact-action"
                                                    onClick={() => handleEditContact(v.id, contact)}
                                                    title="Edit contact"
                                                  >
                                                    Edit
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="vendor-table-contact-action vendor-table-contact-action--danger"
                                                    onClick={() => handleContactDelete(v.id, contact.id)}
                                                    title="Delete contact"
                                                  >
                                                    Delete
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <div className="vendor-table-contacts-empty">
                                        <p>No contacts yet. Add your first contact to get started.</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

      {viewOfferFor && (
        <ViewOfferModal
          offer={viewOfferFor.offer}
          property={viewOfferFor.property}
          onClose={() => setViewOfferFor(null)}
          formatCurrency={formatCurrency}
        />
      )}

      {showVendorModal && (
        <div className="modal-overlay" onClick={() => { setShowVendorModal(false); setEditingVendorId(null); setVendorForm({ vendorName: '', type: 'other', website: '', phone: '', email: '', address: '', notes: '' }); }}>
          <div className="modal-content vendor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingVendorId ? 'Edit Vendor' : 'Add Vendor'}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => { setShowVendorModal(false); setEditingVendorId(null); setVendorForm({ vendorName: '', type: 'other', website: '', phone: '', email: '', address: '', notes: '' }); }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Vendor Name *</label>
                <input
                  type="text"
                  placeholder="e.g. ABC Title Company"
                  value={vendorForm.vendorName}
                  onChange={(e) => setVendorForm((f) => ({ ...f, vendorName: e.target.value }))}
                  className="form-input"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Vendor Type *</label>
                <select
                  value={vendorForm.type}
                  onChange={(e) => setVendorForm((f) => ({ ...f, type: e.target.value, customType: e.target.value !== 'other' ? '' : f.customType }))}
                  className="form-input"
                >
                  {VENDOR_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              {vendorForm.type === 'other' && (
                <div className="form-group">
                  <label>Custom Type *</label>
                  <input
                    type="text"
                    placeholder="Enter vendor type (e.g. Insurance, Appraisal, etc.)"
                    value={vendorForm.customType}
                    onChange={(e) => setVendorForm((f) => ({ ...f, customType: e.target.value }))}
                    className="form-input"
                  />
                </div>
              )}
              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={vendorForm.website}
                  onChange={(e) => setVendorForm((f) => ({ ...f, website: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={vendorForm.phone}
                  onChange={(e) => setVendorForm((f) => ({ ...f, phone: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="vendor@example.com"
                  value={vendorForm.email}
                  onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  placeholder="123 Main St, City, State ZIP"
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm((f) => ({ ...f, address: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  placeholder="Additional notes about this vendor..."
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm((f) => ({ ...f, notes: e.target.value }))}
                  className="form-input"
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setShowVendorModal(false); setEditingVendorId(null); setVendorForm({ vendorName: '', type: 'other', website: '', phone: '', email: '', address: '', notes: '' }); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleVendorSave}
                disabled={!vendorForm.vendorName?.trim()}
              >
                {editingVendorId ? 'Save Changes' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContactModal && (
        <div className="modal-overlay" onClick={() => { setShowContactModal(false); setContactModalVendorId(null); setEditingContactId(null); setContactForm({ name: '', phone: '', email: '' }); }}>
          <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingContactId ? 'Edit Contact' : 'Add Contact'}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => { setShowContactModal(false); setContactModalVendorId(null); setEditingContactId(null); setContactForm({ name: '', phone: '', email: '' }); }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  placeholder="Contact name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                  className="form-input"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="contact@example.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setShowContactModal(false); setContactModalVendorId(null); setEditingContactId(null); setContactForm({ name: '', phone: '', email: '' }); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleContactSaveModal}
                disabled={!contactForm.name?.trim()}
              >
                {editingContactId ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showPostModal && (
        <div className="post-modal-overlay" onClick={closePostModal}>
          <div className="post-modal" onClick={(e) => e.stopPropagation()}>
            <div className="post-modal-header">
              <h3>Create Post</h3>
              <button type="button" className="post-modal-close" onClick={closePostModal}>×</button>
            </div>
            {postStage === 'type' && (
              <div className="post-modal-body">
                <p className="post-modal-hint">Choose a post style.</p>
                <div className="post-type-wheel" role="tablist" aria-label="Post type">
                  {[
                    { id: 'tweet', label: 'Tweet' },
                    { id: 'instagram', label: 'Instagram' },
                    { id: 'poll', label: 'Poll' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      role="tab"
                      aria-selected={postType === type.id}
                      className={`post-type-pill ${postType === type.id ? 'active' : ''}`}
                      onClick={() => setPostType(type.id)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                <div className="post-modal-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setPostStage('compose')}>
                    Continue
                  </button>
                </div>
              </div>
            )}
            {postStage === 'compose' && (
              <div className="post-modal-body">
                <div className="activity-composer-row">
                  <label>
                    Address (optional)
                    <AddressAutocomplete
                      value={postAddress}
                      onAddressChange={handlePostAddressChange}
                      onAddressSelect={handlePostAddressSelect}
                      placeholder="123 Main St, City"
                      inputProps={{ 'aria-label': 'Post address' }}
                    />
                  </label>
                </div>
                <textarea
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  placeholder="Ask a question, share an update, or start a conversation..."
                  rows={4}
                />
                <div className="activity-composer-row">
                  <label>
                    Hashtags
                    <input
                      type="text"
                      value={postHashtags}
                      onChange={(e) => setPostHashtags(e.target.value)}
                      placeholder="#renovation #kitchen"
                    />
                  </label>
                  <label>
                    Tag users
                    <input
                      type="text"
                      value={postUserTags}
                      onChange={(e) => setPostUserTags(e.target.value)}
                      placeholder="@alex, @chris"
                    />
                  </label>
                </div>
                {postType === 'instagram' && (
                  <div className="post-media-upload">
                    <DragDropFileInput
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={(f) => { if (f) handleUploadPostImage(f); }}
                      disabled={postImageUploading}
                      uploading={postImageUploading}
                      placeholder={postImageUrl ? 'Drop to replace image' : 'Drop or click to upload image'}
                      className="dashboard-doc-upload"
                    />
                    {postImageUrl && (
                      <div className="post-media-preview">
                        <img src={postImageUrl} alt="Post" />
                        <button type="button" className="btn btn-outline btn-small" onClick={() => setPostImageUrl('')}>
                          Remove image
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {postType === 'poll' && (
                  <div className="poll-options">
                    {pollOptions.map((opt, idx) => (
                      <input
                        key={`poll-${idx}`}
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[idx] = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder={`Option ${idx + 1}`}
                      />
                    ))}
                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      onClick={() => setPollOptions([...pollOptions, ''])}
                    >
                      + Add option
                    </button>
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        onClick={() => setPollOptions(pollOptions.slice(0, -1))}
                      >
                        Remove last option
                      </button>
                    )}
                  </div>
                )}
                <div className="post-modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setPostStage('type')}>
                    Back
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handlePostSubmit} disabled={posting || !postBody.trim()}>
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

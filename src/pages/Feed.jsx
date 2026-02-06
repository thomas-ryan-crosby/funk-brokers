import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { searchUsers } from '../services/authService';
import { getPropertiesBySeller } from '../services/propertyService';
import { getPostsByAuthor, addComment, createPost, deletePost, getCommentsForPost, setPostCommentCount } from '../services/postService';
import { getFollowing, getFollowers, followUser, unfollowUser } from '../services/followService';
import { getLikedPostIds, likePost, unlikePost } from '../services/likeService';
import { fetchPropertiesForBrowse } from '../data/firestoreLayer';
import { uploadFile } from '../services/storageService';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { getPredictions as getMapboxPredictions } from '../services/mapboxGeocodeService';
import { getForYouPosts, getFollowingPosts } from '../services/socialApiService';
import metrics from '../utils/metrics';
import './Feed.css';

function formatDateShort(v) {
  if (!v) return '—';
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAddress(property) {
  const parts = [property?.address, property?.city, property?.state, property?.zipCode].filter(Boolean);
  return parts.join(', ');
}

/** US state full name -> abbreviation (lowercase) for address matching */
const STATE_TO_ABBR = {
  alabama: 'al', alaska: 'ak', arizona: 'az', arkansas: 'ar', california: 'ca',
  colorado: 'co', connecticut: 'ct', delaware: 'de', florida: 'fl', georgia: 'ga',
  hawaii: 'hi', idaho: 'id', illinois: 'il', indiana: 'in', iowa: 'ia',
  kansas: 'ks', kentucky: 'ky', louisiana: 'la', maine: 'me', maryland: 'md',
  massachusetts: 'ma', michigan: 'mi', minnesota: 'mn', mississippi: 'ms',
  missouri: 'mo', montana: 'mt', nebraska: 'ne', nevada: 'nv', 'new hampshire': 'nh',
  'new jersey': 'nj', 'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc',
  'north dakota': 'nd', ohio: 'oh', oklahoma: 'ok', oregon: 'or', pennsylvania: 'pa',
  'rhode island': 'ri', 'south carolina': 'sc', 'south dakota': 'sd', tennessee: 'tn',
  texas: 'tx', utah: 'ut', vermont: 'vt', virginia: 'va', washington: 'wa',
  'west virginia': 'wv', wisconsin: 'wi', wyoming: 'wy', 'district of columbia': 'dc',
};

function normalizeAddress(value) {
  let base = String(value ?? '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  Object.entries(STATE_TO_ABBR).forEach(([name, abbr]) => {
    base = base.replace(new RegExp(`\\b${name.replace(/\s/g, '\\s+')}\\b`, 'g'), abbr);
  });
  base = base.replace(/\bunited states\b/g, '').replace(/\s+/g, ' ').trim();
  const replacements = [
    ['north', 'n'], ['south', 's'], ['east', 'e'], ['west', 'w'],
    ['street', 'st'], ['avenue', 'ave'], ['road', 'rd'], ['drive', 'dr'],
    ['boulevard', 'blvd'], ['place', 'pl'], ['lane', 'ln'], ['court', 'ct'],
    ['circle', 'cir'], ['parkway', 'pkwy'], ['terrace', 'ter'],
  ];
  return replacements.reduce((acc, [from, to]) => acc.replace(new RegExp(`\\b${from}\\b`, 'g'), to), base);
}

function parseTagList(value, prefix) {
  return (value || '').split(/[,\s]+/).map((t) => t.trim()).filter(Boolean)
    .map((t) => (t.startsWith(prefix) ? t.slice(1) : t)).filter(Boolean);
}

/** Extract #hashtags, @mentions, ^property from post body. Trims property to address-only (drops trailing " is ..." etc.). */
function parseBodyTags(body) {
  const text = String(body || '').trim();
  const hashtags = [];
  const userTags = [];
  let propertyText = null;
  const hashMatches = text.matchAll(/#([a-zA-Z0-9_]+)/g);
  for (const m of hashMatches) hashtags.push(m[1]);
  const atMatches = text.matchAll(/@([a-zA-Z0-9_]+)/g);
  for (const m of atMatches) userTags.push(m[1]);
  const caretMatch = text.match(/\^([^#@\n]+)/);
  if (caretMatch) {
    propertyText = caretMatch[1].trim()
      .replace(/\s+is\s+.+$/i, '')  // "15 X St ... is awesome!" -> address only
      .replace(/\s+-\s+.+$/, '')    // trailing " - comment"
      .trim();
  }
  return { hashtags: [...new Set(hashtags)], userTags: [...new Set(userTags)], propertyText };
}

function toHandle(name) {
  if (!name) return 'user';
  return String(name).replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '') || 'user';
}

const FEED_VIEW_HOME = 'home';
const FEED_VIEW_PROFILE = 'profile';
const FEED_TAB_FOR_YOU = 'for-you';
const FEED_TAB_FOLLOWING = 'following';

const Feed = () => {
  const { user, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const [feedView, setFeedView] = useState(FEED_VIEW_HOME);
  const [feedTab, setFeedTab] = useState(FEED_TAB_FOR_YOU);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myProperties, setMyProperties] = useState([]);
  const [allPropertiesCache, setAllPropertiesCache] = useState([]);
  const [forYouPosts, setForYouPosts] = useState([]);
  const [followingPosts, setFollowingPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [followerIds, setFollowerIds] = useState([]);

  const [showPostModal, setShowPostModal] = useState(false);
  const [postBody, setPostBody] = useState('');
  const [postPropertyId, setPostPropertyId] = useState('');
  const [postAddress, setPostAddress] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postImageUploading, setPostImageUploading] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [posting, setPosting] = useState(false);
  const postImageInputRef = useRef(null);
  const composerTextareaRef = useRef(null);
  const [composerCursorPosition, setComposerCursorPosition] = useState(0);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSelectedIndex, setAddressSelectedIndex] = useState(0);
  const [addressTagJustCompleted, setAddressTagJustCompleted] = useState(false);
  const composerBackdropRef = useRef(null);

  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentsOpen, setCommentsOpen] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});
  const [followLoading, setFollowLoading] = useState({});
  const [likedPostIds, setLikedPostIds] = useState([]);
  const [likeCountByPost, setLikeCountByPost] = useState({});
  const [likeLoading, setLikeLoading] = useState({});
  const allPropertiesLoadRef = useRef(null);

  const textBeforeCursor = postBody.slice(0, composerCursorPosition);
  const lastAt = textBeforeCursor.lastIndexOf('@');
  const lastCaret = textBeforeCursor.lastIndexOf('^');
  const mentionQuerySegment = lastAt >= 0 && (lastCaret < 0 || lastAt > lastCaret)
    ? textBeforeCursor.slice(lastAt + 1)
    : '';
  const mentionQuery = mentionQuerySegment.includes(' ') || mentionQuerySegment.includes('\n') ? '' : mentionQuerySegment;
  const addressInlineSegment = lastCaret >= 0 && (lastAt < 0 || lastCaret > lastAt)
    ? textBeforeCursor.slice(lastCaret + 1)
    : '';
  const addressInlineQuery =
    addressInlineSegment.includes('\n') ? '' : addressInlineSegment.replace(/\s+$/, '');
  const showMentionDropdown = Boolean(mentionQuery);
  const showAddressInline = Boolean(addressInlineQuery) && !addressInlineSegment.endsWith(' ') && !addressTagJustCompleted;

  useEffect(() => {
    if (!mentionQuery || mentionQuery.length < 2) {
      setMentionSuggestions([]);
      setMentionSelectedIndex(0);
      return;
    }
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      setMentionLoading(true);
      searchUsers(mentionQuery)
        .then((list) => {
          if (!cancelled) {
            setMentionSuggestions(list);
            setMentionSelectedIndex(0);
          }
        })
        .finally(() => { if (!cancelled) setMentionLoading(false); });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [mentionQuery]);

  useEffect(() => {
    if (!addressInlineQuery) {
      setAddressSuggestions([]);
      setAddressSelectedIndex(0);
      return;
    }
    let cancelled = false;
    setAddressLoading(true);
    getMapboxPredictions(addressInlineQuery)
      .then((list) => {
        if (cancelled) return;
        setAddressLoading(false);
        setAddressSuggestions(list.map((p) => ({ description: p.description || p.place_name, place_name: p.place_name, center: p.center })));
        setAddressSelectedIndex(0);
      })
      .catch(() => {
        if (!cancelled) setAddressLoading(false);
        setAddressSuggestions([]);
      });
    return () => { cancelled = true; };
  }, [addressInlineQuery]);

  const insertMention = useCallback((handle) => {
    const before = postBody.slice(0, lastAt);
    const after = postBody.slice(composerCursorPosition);
    const newBody = before + '@' + handle + ' ' + after;
    setPostBody(newBody);
    setMentionSuggestions([]);
    const newCursor = lastAt + 1 + handle.length + 1;
    setComposerCursorPosition(newCursor);
    setTimeout(() => {
      if (composerTextareaRef.current) {
        composerTextareaRef.current.focus();
        composerTextareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  }, [postBody, composerCursorPosition, lastAt]);

  const insertAddress = useCallback((formattedAddress) => {
    const before = postBody.slice(0, lastCaret + 1);
    const after = postBody.slice(composerCursorPosition);
    const text = (formattedAddress || '').trim();
    const newBody = before + text + ' ' + after;
    setPostBody(newBody);
    setAddressSuggestions([]);
    setAddressTagJustCompleted(true);
    const newCursor = lastCaret + 1 + text.length + 1;
    setComposerCursorPosition(newCursor);
    setTimeout(() => {
      if (composerTextareaRef.current) {
        composerTextareaRef.current.focus();
        composerTextareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  }, [postBody, composerCursorPosition, lastCaret]);

  const handleAddressSelect = useCallback((suggestion) => {
    const formatted = suggestion.place_name || suggestion.description || '';
    insertAddress(formatted);
  }, [insertAddress]);

  const loadFollowingIds = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const ids = await getFollowing(user.uid);
      setFollowingIds(ids);
    } catch (err) {
      console.error('Failed to load following', err);
    }
  }, [user?.uid]);

  const loadForYou = useCallback(async () => {
    try {
      const list = await getForYouPosts(50);
      setForYouPosts(list);
    } catch (err) {
      console.error('Failed to load For You feed', err);
      setForYouPosts([]);
    }
  }, []);

  const loadFollowing = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const list = await getFollowingPosts(user.uid, 50);
      setFollowingPosts(list);
    } catch (err) {
      console.error('Failed to load Following feed', err);
      setFollowingPosts([]);
    }
  }, [user?.uid]);

  const loadProfilePosts = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const list = await getPostsByAuthor(user.uid);
      setMyPosts(list || []);
    } catch (err) {
      console.error('Failed to load profile posts', err);
      setMyPosts([]);
    }
  }, [user?.uid]);

  const loadFeedData = useCallback(async () => {
    if (!user?.uid) return;
    const startMs = Date.now();
    try {
      setLoading(true);
      setError(null);
      const [properties, ids, followers, likedIds] = await Promise.all([
        getPropertiesBySeller(user.uid),
        getFollowing(user.uid),
        getFollowers(user.uid),
        getLikedPostIds(user.uid),
      ]);
      setMyProperties(properties);
      setFollowingIds(ids);
      setFollowerIds(followers);
      setLikedPostIds(likedIds);

      const [forYou, following, profile] = await Promise.all([
        getForYouPosts(50),
        getFollowingPosts(user.uid, 50),
        getPostsByAuthor(user.uid),
      ]);
      setForYouPosts(forYou);
      setFollowingPosts(following);
      setMyPosts(profile || []);
    } catch (err) {
      console.error('Failed to load feed', err);
      setError('Unable to load feed.');
    } finally {
      setLoading(false);
      metrics.recordLatency('feed', Date.now() - startMs);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return;
    loadFeedData();
  }, [isAuthenticated, user?.uid, loadFeedData]);

  const refreshCurrentView = useCallback(async () => {
    if (!user?.uid) return;
    await loadFeedData();
  }, [loadFeedData]);

  const loadAllPropertiesCache = useCallback(async () => {
    if (allPropertiesCache?.length) return allPropertiesCache;
    if (allPropertiesLoadRef.current) return allPropertiesLoadRef.current;
    const promise = fetchPropertiesForBrowse({})
      .then((list) => {
        setAllPropertiesCache(list);
        return list;
      })
      .catch(() => {
        return myProperties;
      })
      .finally(() => {
        allPropertiesLoadRef.current = null;
      });
    allPropertiesLoadRef.current = promise;
    return promise;
  }, [allPropertiesCache, myProperties]);

  const resolvePropertyMatch = async (addressText) => {
    const normalized = normalizeAddress(addressText);
    if (!normalized) return null;
    const propertiesToMatch = await loadAllPropertiesCache();
    return propertiesToMatch.find((p) => {
      const prop = normalizeAddress(formatAddress(p));
      return prop === normalized || prop.includes(normalized) || normalized.includes(prop);
    }) || myProperties.find((p) => {
      const prop = normalizeAddress(formatAddress(p));
      return prop === normalized || prop.includes(normalized) || normalized.includes(prop);
    }) || null;
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
    if (match) setPostPropertyId(match.id);
  };

  const handlePostAddressSelect = async (parsed) => {
    const fullAddress = [parsed?.address, parsed?.city, parsed?.state, parsed?.zipCode].filter(Boolean).join(', ');
    const addressText = fullAddress || parsed?.address || '';
    if (addressText) setPostAddress(addressText);
    const normalized = normalizeAddress(addressText);
    if (!normalized) {
      setPostPropertyId('');
      return;
    }
    const propertiesToMatch = await loadAllPropertiesCache();
    const match = propertiesToMatch.find((p) => {
      const prop = normalizeAddress(formatAddress(p));
      return prop === normalized || prop.includes(normalized) || normalized.includes(prop);
    }) || myProperties.find((p) => {
      const prop = normalizeAddress(formatAddress(p));
      return prop === normalized || prop.includes(normalized) || normalized.includes(prop);
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

  const resetPostForm = () => {
    setPostBody('');
    setPostPropertyId('');
    setPostAddress('');
    setPostImageUrl('');
    setPostImageUploading(false);
    setShowPoll(false);
    setShowAddress(false);
    setPollOptions(['', '']);
    setComposerCursorPosition(0);
    setMentionSuggestions([]);
    setMentionSelectedIndex(0);
    setAddressSuggestions([]);
    setAddressSelectedIndex(0);
  };

  const openPostModal = () => {
    setShowPostModal(true);
  };

  const closePostModal = () => {
    setShowPostModal(false);
    resetPostForm();
  };

  const handlePostSubmit = async () => {
    if (!postBody.trim()) return;
    if (posting) return;
    const { hashtags, userTags, propertyText } = parseBodyTags(postBody);
    const addressText = (propertyText || postAddress || '').trim();
    if (showPoll) {
      const filled = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (filled.length < 2) {
        alert('Please add at least two poll options.');
        return;
      }
    }
    try {
      setPosting(true);
      const property = postPropertyId ? myProperties.find((p) => p.id === postPropertyId) : (addressText ? await resolvePropertyMatch(addressText) : null);
      const linkedAddress = property ? formatAddress(property) : addressText || null;
      await createPost({
        authorId: user.uid,
        authorName: userProfile?.publicUsername || userProfile?.name || user?.displayName || 'User',
        type: showPoll ? 'poll' : 'tweet',
        body: postBody.trim(),
        propertyId: property?.id || null,
        propertyAddress: linkedAddress,
        imageUrl: postImageUrl.trim() || null,
        pollOptions: showPoll ? pollOptions.map((o) => o.trim()).filter(Boolean) : [],
        hashtags,
        userTags,
      });
      closePostModal();
      await refreshCurrentView();
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
      await refreshCurrentView();
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
        setPostCommentCount(postId, list.length).catch(() => {});
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

  const handleFollow = async (authorId) => {
    if (!user?.uid || authorId === user.uid) return;
    setFollowLoading((prev) => ({ ...prev, [authorId]: true }));
    try {
      await followUser(user.uid, authorId);
      setFollowingIds((prev) => (prev.includes(authorId) ? prev : [...prev, authorId]));
      if (feedTab === FEED_TAB_FOLLOWING) await loadFollowing();
    } catch (err) {
      console.error('Failed to follow', err);
      alert('Failed to follow. Please try again.');
    } finally {
      setFollowLoading((prev) => ({ ...prev, [authorId]: false }));
    }
  };

  const handleUnfollow = async (authorId) => {
    if (!user?.uid) return;
    setFollowLoading((prev) => ({ ...prev, [authorId]: true }));
    try {
      await unfollowUser(user.uid, authorId);
      setFollowingIds((prev) => prev.filter((id) => id !== authorId));
      if (feedTab === FEED_TAB_FOLLOWING) await loadFollowing();
    } catch (err) {
      console.error('Failed to unfollow', err);
      alert('Failed to unfollow. Please try again.');
    } finally {
      setFollowLoading((prev) => ({ ...prev, [authorId]: false }));
    }
  };

  const handleLike = async (postId) => {
    if (!user?.uid) return;
    const liked = likedPostIds.includes(postId);
    setLikeLoading((prev) => ({ ...prev, [postId]: true }));
    const currentPostsList = feedView === FEED_VIEW_PROFILE ? myPosts : feedTab === FEED_TAB_FOR_YOU ? forYouPosts : followingPosts;
    const post = currentPostsList.find((p) => p.id === postId);
    const prevCount = likeCountByPost[postId] ?? post?.likeCount ?? 0;
    try {
      if (liked) {
        await unlikePost(postId, user.uid);
        setLikedPostIds((prev) => prev.filter((id) => id !== postId));
        setLikeCountByPost((prev) => ({ ...prev, [postId]: prevCount - 1 }));
      } else {
        await likePost(postId, user.uid);
        setLikedPostIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
        setLikeCountByPost((prev) => ({ ...prev, [postId]: prevCount + 1 }));
      }
    } catch (err) {
      console.error('Failed to like/unlike', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLikeLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  /** Build highlighted HTML mirroring postBody with @mentions and ^property tags styled */
  const buildHighlightedText = useCallback((text) => {
    // Escape HTML, then wrap @mentions and ^property in highlight spans
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n$/g, '\n\n'); // trailing newline needs extra for height match
    return escaped
      .replace(/@([a-zA-Z0-9_]+)/g, '<span class="feed-composer-highlight">@$1</span>')
      .replace(/\^([^\n@#]+?)(?=\s*[@#\n]|$)/g, '<span class="feed-composer-highlight">^$1</span>')
      .replace(/#([a-zA-Z0-9_]+)/g, '<span class="feed-composer-highlight-hash">#$1</span>');
  }, []);

  const handleComposerScroll = useCallback(() => {
    if (composerTextareaRef.current && composerBackdropRef.current) {
      composerBackdropRef.current.scrollTop = composerTextareaRef.current.scrollTop;
      composerBackdropRef.current.scrollLeft = composerTextareaRef.current.scrollLeft;
    }
  }, []);

  const currentPosts = feedView === FEED_VIEW_PROFILE
    ? myPosts
    : feedTab === FEED_TAB_FOR_YOU
      ? forYouPosts
      : followingPosts;

  if (authLoading || !isAuthenticated) {
    return (
      <div className="feed-page">
        <div className="feed-layout">
          <aside className="feed-sidebar" aria-hidden />
          <main className="feed-main">
            <div className="feed-main-inner">
              <div className="feed-loading">Loading...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <div className="feed-layout">
        <aside className="feed-sidebar">
          <nav className="feed-sidebar-nav" aria-label="Feed navigation">
            <button
              type="button"
              className={`feed-sidebar-link ${feedView === FEED_VIEW_HOME ? 'active' : ''}`}
              onClick={() => setFeedView(FEED_VIEW_HOME)}
            >
              Feed Home
            </button>
            <button
              type="button"
              className={`feed-sidebar-link ${feedView === FEED_VIEW_PROFILE ? 'active' : ''}`}
              onClick={() => setFeedView(FEED_VIEW_PROFILE)}
            >
              Profile
            </button>
          </nav>
        </aside>
        <main className="feed-main">
          <div className="feed-main-inner">
          {feedView === FEED_VIEW_HOME && (
            <>
              <header className="feed-header">
                <h1>Feed</h1>
                <p className="feed-subtitle">All posts on the platform. Follow users to see them in Following.</p>
                <div className="feed-header-actions">
                  <button type="button" className="btn btn-primary" onClick={openPostModal}>
                    New Post
                  </button>
                </div>
              </header>
              <div className="feed-tabs">
                <button
                  type="button"
                  className={`feed-tab ${feedTab === FEED_TAB_FOR_YOU ? 'active' : ''}`}
                  onClick={() => setFeedTab(FEED_TAB_FOR_YOU)}
                >
                  For You
                </button>
                <button
                  type="button"
                  className={`feed-tab ${feedTab === FEED_TAB_FOLLOWING ? 'active' : ''}`}
                  onClick={() => setFeedTab(FEED_TAB_FOLLOWING)}
                >
                  Following
                </button>
              </div>
            </>
          )}
          {feedView === FEED_VIEW_PROFILE && (
            <header className="feed-header">
              <div className="feed-profile-header">
                <div className="feed-profile-avatar" aria-hidden>
                  {(userProfile?.name || user?.displayName || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="feed-profile-info">
                  <h1>{userProfile?.publicUsername || userProfile?.name || user?.displayName || 'User'}</h1>
                  <div className="feed-profile-stats">
                    <span className="feed-profile-stat"><strong>{followerIds.length}</strong> followers</span>
                    <span className="feed-profile-stat"><strong>{followingIds.length}</strong> following</span>
                  </div>
                </div>
              </div>
              <p className="feed-subtitle">Posts you have posted.</p>
              <div className="feed-header-actions">
                <button type="button" className="btn btn-primary" onClick={openPostModal}>
                  New Post
                </button>
              </div>
            </header>
          )}

          {error && <div className="feed-alert feed-alert-error">{error}</div>}

          {loading ? (
            <div className="feed-loading">Loading...</div>
          ) : currentPosts.length === 0 ? (
            <p className="feed-empty">
              {feedView === FEED_VIEW_PROFILE
                ? 'You have not posted yet.'
                : feedTab === FEED_TAB_FOLLOWING
                  ? 'Follow users to see their posts here.'
                  : 'No posts yet.'}
            </p>
          ) : (
            <div className="feed-list">
              {currentPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isOwn={post.authorId === user?.uid}
                  currentUserId={user?.uid}
                  currentUserName={userProfile?.name || user?.displayName}
                  formatDateShort={formatDateShort}
                  toHandle={toHandle}
                  followingIds={followingIds}
                  followLoading={followLoading}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  likedPostIds={likedPostIds}
                  likeCountByPost={likeCountByPost}
                  onLike={handleLike}
                  likeLoading={likeLoading}
                  commentsOpen={commentsOpen}
                  commentsByPost={commentsByPost}
                  commentsLoading={commentsLoading}
                  commentDrafts={commentDrafts}
                  onToggleComments={toggleComments}
                  onCommentChange={handleCommentChange}
                  onCommentSubmit={handleCommentSubmit}
                  onDelete={handleDeletePost}
                />
              ))}
            </div>
          )}
          </div>
        </main>
      </div>

      {showPostModal && (
        <div className="feed-post-modal-overlay" onClick={closePostModal}>
          <div className="feed-post-modal feed-composer-single" onClick={(e) => e.stopPropagation()}>
            <div className="feed-post-modal-header">
              <button type="button" className="feed-post-modal-close" onClick={closePostModal} aria-label="Close">×</button>
            </div>
            <div
              className="feed-composer-body"
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer?.files?.[0];
                if (f && /^image\//.test(f.type)) handleUploadPostImage(f);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                type="file"
                ref={postImageInputRef}
                accept=".png,.jpg,.jpeg,.webp,.gif,image/*"
                className="feed-composer-file-input-hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadPostImage(f);
                  e.target.value = '';
                }}
                aria-hidden
              />
              <div className="feed-composer-row-main">
                <div className="feed-composer-avatar" aria-hidden>
                  {(userProfile?.name || user?.displayName || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="feed-composer-input-wrap">
                  <div
                    ref={composerBackdropRef}
                    className="feed-composer-backdrop"
                    aria-hidden
                    dangerouslySetInnerHTML={{ __html: buildHighlightedText(postBody) }}
                  />
                  <textarea
                    ref={composerTextareaRef}
                    className="feed-composer-textarea feed-composer-textarea--highlighted"
                    value={postBody}
                    onChange={(e) => {
                      const next = e.target.value;
                      setPostBody(next);
                      setComposerCursorPosition(e.target.selectionStart ?? 0);
                      if ((next.match(/\^/g) || []).length > (postBody.match(/\^/g) || []).length) setAddressTagJustCompleted(false);
                    }}
                    onSelect={(e) => setComposerCursorPosition(e.target.selectionStart ?? 0)}
                    onScroll={handleComposerScroll}
                    onKeyDown={(e) => {
                      if (showMentionDropdown && mentionSuggestions.length > 0) {
                        if (e.key === 'Escape') {
                          setMentionSuggestions([]);
                          return;
                        }
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setMentionSelectedIndex((i) => Math.min(i + 1, mentionSuggestions.length - 1));
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setMentionSelectedIndex((i) => Math.max(0, i - 1));
                          return;
                        }
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const u = mentionSuggestions[mentionSelectedIndex];
                          if (u) insertMention(u.publicUsername || toHandle(u.name) || 'user');
                          return;
                        }
                      }
                      if (showAddressInline && addressSuggestions.length > 0) {
                        if (e.key === 'Escape') {
                          setAddressSuggestions([]);
                          return;
                        }
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setAddressSelectedIndex((i) => Math.min(i + 1, addressSuggestions.length - 1));
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setAddressSelectedIndex((i) => Math.max(0, i - 1));
                          return;
                        }
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const a = addressSuggestions[addressSelectedIndex];
                          if (a) handleAddressSelect(a);
                          return;
                        }
                      }
                    }}
                    placeholder="What's happening?"
                    rows={3}
                    autoFocus
                  />
                  {showMentionDropdown && (
                    <div className="feed-composer-mention-dropdown" role="listbox">
                      {mentionLoading ? (
                        <div className="feed-composer-mention-item feed-composer-mention-loading">Searching...</div>
                      ) : mentionSuggestions.length === 0 ? (
                        <div className="feed-composer-mention-item feed-composer-mention-empty">No users found</div>
                      ) : (
                        mentionSuggestions.map((u, idx) => (
                          <button
                            key={u.id}
                            type="button"
                            className={`feed-composer-mention-item ${idx === mentionSelectedIndex ? 'selected' : ''}`}
                            role="option"
                            aria-selected={idx === mentionSelectedIndex}
                            onClick={() => insertMention(u.publicUsername || toHandle(u.name) || 'user')}
                          >
                            <span className="feed-composer-mention-handle">@{u.publicUsername || toHandle(u.name) || 'user'}</span>
                            {u.name && <span className="feed-composer-mention-name">{u.name}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {showAddressInline && (
                    <div className="feed-composer-mention-dropdown" role="listbox" aria-label="Address suggestions">
                      {addressLoading ? (
                        <div className="feed-composer-mention-item feed-composer-mention-loading">Searching addresses...</div>
                      ) : addressSuggestions.length === 0 ? (
                        <div className="feed-composer-mention-item feed-composer-mention-empty">Type an address to search</div>
                      ) : (
                        addressSuggestions.map((a, idx) => (
                          <button
                            key={a.id || a.description || idx}
                            type="button"
                            className={`feed-composer-mention-item ${idx === addressSelectedIndex ? 'selected' : ''}`}
                            role="option"
                            aria-selected={idx === addressSelectedIndex}
                            onClick={() => handleAddressSelect(a)}
                          >
                            <span className="feed-composer-address-suggestion">^ {a.description}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {postImageUrl && (
                    <div className="feed-composer-image-preview">
                      <img src={postImageUrl} alt="Post" />
                      <button type="button" className="feed-composer-remove-image" onClick={() => setPostImageUrl('')} aria-label="Remove image">×</button>
                    </div>
                  )}
                  {showPoll && (
                    <div className="feed-composer-poll-wrap">
                      {pollOptions.map((opt, idx) => (
                        <input
                          key={`poll-${idx}`}
                          type="text"
                          className="feed-composer-poll-input"
                          value={opt}
                          onChange={(e) => {
                            const next = [...pollOptions];
                            next[idx] = e.target.value;
                            setPollOptions(next);
                          }}
                          placeholder={`Option ${idx + 1}`}
                        />
                      ))}
                      <div className="feed-composer-poll-actions">
                        <button type="button" className="feed-composer-poll-add" onClick={() => setPollOptions([...pollOptions, ''])}>+ Add option</button>
                        {pollOptions.length > 2 && (
                          <button type="button" className="feed-composer-poll-remove" onClick={() => setPollOptions(pollOptions.slice(0, -1))}>Remove last</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="feed-composer-actions-row">
                <div className="feed-composer-icons">
                  <button
                    type="button"
                    className="feed-composer-icon-btn"
                    title="Add photo"
                    onClick={() => postImageInputRef.current?.click()}
                    disabled={postImageUploading}
                  >
                    <span className="feed-composer-icon" aria-hidden>{postImageUploading ? '…' : '🖼'}</span>
                  </button>
                  <button
                    type="button"
                    className={`feed-composer-icon-btn ${showPoll ? 'active' : ''}`}
                    onClick={() => setShowPoll((p) => !p)}
                    title="Add poll"
                    aria-pressed={showPoll}
                  >
                    <span className="feed-composer-icon" aria-hidden>📊</span>
                  </button>
                  <button
                    type="button"
                    className={`feed-composer-icon-btn ${showAddress ? 'active' : ''}`}
                    onClick={() => setShowAddress((s) => !s)}
                    title="Add location"
                    aria-pressed={showAddress}
                  >
                    <span className="feed-composer-icon" aria-hidden>📍</span>
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-primary feed-composer-post-btn"
                  onClick={handlePostSubmit}
                  disabled={posting || !postBody.trim()}
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
              {showAddress && (
                <div className="feed-composer-address-row">
                  <AddressAutocomplete
                    value={postAddress}
                    onAddressChange={handlePostAddressChange}
                    onAddressSelect={handlePostAddressSelect}
                    placeholder="Address (optional)"
                    inputProps={{ 'aria-label': 'Post address' }}
                  />
                </div>
              )}
              <p className="feed-composer-hint">Use # for hashtags, @ for users, ^ for property (e.g. ^123 Main St)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function PostCard({
  post,
  isOwn,
  currentUserId,
  currentUserName,
  formatDateShort,
  toHandle,
  followingIds,
  followLoading,
  onFollow,
  onUnfollow,
  likedPostIds,
  likeCountByPost,
  onLike,
  likeLoading,
  commentsOpen,
  commentsByPost,
  commentsLoading,
  commentDrafts,
  onToggleComments,
  onCommentChange,
  onCommentSubmit,
  onDelete,
}) {
  const displayName = isOwn ? (currentUserName || 'You') : (post.authorName || 'Someone');
  const handleStr = isOwn ? toHandle(currentUserName) : toHandle(post.authorName);
  const commentCount = (commentsByPost[post.id] !== undefined ? (commentsByPost[post.id] || []).length : post.commentCount) ?? 0;
  const likeCount = likeCountByPost[post.id] ?? post.likeCount ?? 0;
  const isLiked = likedPostIds.includes(post.id);
  const isFollowing = !isOwn && currentUserId && followingIds.includes(post.authorId);
  const authorId = post.authorId;

  return (
    <article className="feed-card feed-card--post">
      <div className="feed-card-header">
        <div className="feed-card-avatar" aria-hidden>
          {(displayName || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="feed-card-meta">
          <span className="feed-card-name">{displayName}</span>
          <span className="feed-card-handle">@{handleStr}</span>
          {post.propertyAddress && (
            <span className="feed-card-context">
              About{' '}
              {post.propertyId ? (
                <Link to={`/property/${post.propertyId}`} className="feed-card-link">{post.propertyAddress}</Link>
              ) : (
                post.propertyAddress
              )}
            </span>
          )}
          <span className="feed-card-date">{formatDateShort(post.createdAt)}</span>
        </div>
        <div className="feed-card-actions-top">
          {!isOwn && authorId && (
            <button
              type="button"
              className={`feed-follow-btn ${isFollowing ? 'following' : ''}`}
              onClick={() => isFollowing ? onUnfollow(authorId) : onFollow(authorId)}
              disabled={followLoading[authorId]}
            >
              {followLoading[authorId] ? '…' : isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
          <button type="button" className="feed-card-action-icon" aria-label="More options">⋯</button>
          {isOwn && onDelete && (
            <button type="button" className="feed-card-action-delete" onClick={() => onDelete(post.id)}>Delete</button>
          )}
        </div>
      </div>
      <div className="feed-card-body">
        <p>{post.body}</p>
        {(post.hashtags?.length || post.userTags?.length) && (
          <div className="feed-card-tags">
            {post.hashtags?.map((tag) => (
              <span key={`h-${tag}`} className="feed-tag">#{tag}</span>
            ))}
            {post.userTags?.map((tag) => (
              <span key={`u-${tag}`} className="feed-tag">@{tag}</span>
            ))}
          </div>
        )}
        {post.imageUrl && (
          <div className="feed-card-media">
            <img src={post.imageUrl} alt="Post" />
          </div>
        )}
        {post.pollOptions?.length > 0 && (
          <div className="feed-card-poll">
            {post.pollOptions.map((opt, idx) => (
              <div key={idx} className="feed-card-poll-option">{opt}</div>
            ))}
          </div>
        )}
      </div>
      <div className="feed-card-engagement">
        <button
          type="button"
          className={`feed-engagement-btn feed-engagement-like ${isLiked ? 'liked' : ''}`}
          onClick={() => onLike(post.id)}
          disabled={likeLoading[post.id]}
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          <span className="feed-engagement-icon" aria-hidden>{isLiked ? '❤️' : '🤍'}</span>
          <span>{likeCount}</span>
        </button>
        <button type="button" className="feed-engagement-btn" onClick={() => onToggleComments(post.id)}>
          <span className="feed-engagement-icon" aria-hidden>💬</span>
          <span>{commentCount}</span>
        </button>
      </div>
      {commentsOpen[post.id] && (
        <div className="feed-card-comments">
          {commentsLoading[post.id] ? (
            <p className="feed-comment-empty">Loading comments...</p>
          ) : (commentsByPost[post.id] || []).length === 0 ? (
            <p className="feed-comment-empty">No comments yet.</p>
          ) : (
            <ul className="feed-comment-list">
              {(commentsByPost[post.id] || []).map((c) => (
                <li key={c.id} className="feed-comment">
                  <strong>{c.authorName || 'Someone'}</strong> {c.body}
                </li>
              ))}
            </ul>
          )}
          <div className="feed-comment-form">
            <input
              type="text"
              value={commentDrafts[post.id] || ''}
              onChange={(e) => onCommentChange(post.id, e.target.value)}
              placeholder="Write a comment..."
            />
            <button type="button" onClick={() => onCommentSubmit(post.id)}>Send</button>
          </div>
        </div>
      )}
    </article>
  );
}

export default Feed;

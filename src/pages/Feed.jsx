import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertiesBySeller } from '../services/propertyService';
import { getFavoritesForProperty } from '../services/favoritesService';
import { getPostsByAuthor, getPostsForProperties, addComment, createPost, deletePost, getCommentsForPost } from '../services/postService';
import { getAllProperties } from '../services/propertyService';
import { uploadFile } from '../services/storageService';
import AddressAutocomplete from '../components/AddressAutocomplete';
import DragDropFileInput from '../components/DragDropFileInput';
import './Feed.css';

function getPublicName(profile) {
  if (!profile) return 'Someone';
  if (profile.anonymousProfile) return profile.publicUsername || 'Anonymous';
  return profile.publicUsername || profile.name || 'Someone';
}

function formatDate(v) {
  if (!v) return '—';
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(v) {
  if (!v) return '—';
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAddress(property) {
  const parts = [property?.address, property?.city, property?.state, property?.zipCode].filter(Boolean);
  return parts.join(', ');
}

function normalizeAddress(value) {
  const base = String(value ?? '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
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

function toHandle(name) {
  if (!name) return 'user';
  return String(name).replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '') || 'user';
}

const Feed = () => {
  const { user, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myProperties, setMyProperties] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [receivedPosts, setReceivedPosts] = useState([]);
  const [activityTab, setActivityTab] = useState('received');
  const [allPropertiesCache, setAllPropertiesCache] = useState([]);

  const [showPostModal, setShowPostModal] = useState(false);
  const [postStage, setPostStage] = useState('type');
  const [postType, setPostType] = useState('tweet');
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

  const loadFeedData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      setError(null);
      const properties = await getPropertiesBySeller(user.uid);
      setMyProperties(properties);

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
      setActivityFeed(favoriteActivity.slice(0, 20));

      const [mine, received] = await Promise.all([
        getPostsByAuthor(user.uid),
        getPostsForProperties(properties.map((p) => p.id)),
      ]);
      setMyPosts(mine || []);
      setReceivedPosts((received || []).filter((p) => p.authorId !== user.uid));
    } catch (err) {
      console.error('Failed to load feed', err);
      setError('Unable to load feed.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return;
    loadFeedData();
  }, [isAuthenticated, user?.uid, loadFeedData]);

  const resolvePropertyMatch = async (addressText) => {
    const normalized = normalizeAddress(addressText);
    if (!normalized) return null;
    let propertiesToMatch = allPropertiesCache;
    if (!propertiesToMatch?.length) {
      try {
        propertiesToMatch = await getAllProperties();
        setAllPropertiesCache(propertiesToMatch);
      } catch (_) {
        propertiesToMatch = myProperties;
      }
    }
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
    let propertiesToMatch = allPropertiesCache;
    if (!propertiesToMatch?.length) {
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
      const property = myProperties.find((p) => p.id === postPropertyId) || (postPropertyId ? null : await resolvePropertyMatch(postAddress));
      const addressText = (postAddress || '').trim();
      const linkedAddress = property ? formatAddress(property) : addressText || null;
      const hashtags = parseTagList(postHashtags, '#');
      const userTags = parseTagList(postUserTags, '@');
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
      await loadFeedData();
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
      await loadFeedData();
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

  const receivedItems = [
    ...activityFeed.map((entry) => ({ type: 'like', ...entry, sortDate: entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date(entry.createdAt || 0) })),
    ...receivedPosts.map((post) => ({ type: 'post', post, sortDate: post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt || 0) })),
  ].sort((a, b) => b.sortDate - a.sortDate);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="feed-page">
        <div className="feed-container">
          <div className="feed-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <div className="feed-container">
        <header className="feed-header">
          <h1>Feed</h1>
          <p className="feed-subtitle">Recent activity and posts around your properties.</p>
          <div className="feed-header-actions">
            <button type="button" className="btn btn-primary" onClick={openPostModal}>
              New Post
            </button>
          </div>
        </header>

        <div className="feed-tabs">
          <button
            type="button"
            className={`feed-tab ${activityTab === 'received' ? 'active' : ''}`}
            onClick={() => setActivityTab('received')}
          >
            Received
          </button>
          <button
            type="button"
            className={`feed-tab ${activityTab === 'mine' ? 'active' : ''}`}
            onClick={() => setActivityTab('mine')}
          >
            My posts
          </button>
        </div>

        {error && <div className="feed-alert feed-alert-error">{error}</div>}

        {loading ? (
          <div className="feed-loading">Loading feed...</div>
        ) : activityTab === 'received' ? (
          receivedItems.length === 0 ? (
            <p className="feed-empty">No recent activity yet.</p>
          ) : (
            <div className="feed-list">
              {receivedItems.map((item, idx) =>
                item.type === 'like' ? (
                  <article key={`like-${item.propertyId}-${idx}`} className="feed-card">
                    <div className="feed-card-header">
                      <div className="feed-card-avatar" aria-hidden>
                        {(item.userName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="feed-card-meta">
                        <span className="feed-card-name">{item.userName || 'Someone'}</span>
                        <span className="feed-card-handle">@{toHandle(item.userName)}</span>
                        <span className="feed-card-date">{formatDateShort(item.createdAt)}</span>
                      </div>
                      <div className="feed-card-actions-top">
                        <button type="button" className="feed-card-action-icon" aria-label="More options">⋯</button>
                      </div>
                    </div>
                    <div className="feed-card-body">
                      <p>
                        Liked <Link to={`/property/${item.propertyId}`} className="feed-card-link">{item.propertyAddress}</Link>
                      </p>
                    </div>
                    <div className="feed-card-engagement">
                      <span className="feed-engagement-item">💬 0</span>
                      <span className="feed-engagement-item">↗ Share</span>
                      <span className="feed-engagement-item">🔖</span>
                    </div>
                  </article>
                ) : (
                  <PostCard
                    key={item.post.id}
                    post={item.post}
                    isOwn={false}
                    currentUserName={userProfile?.name || user?.displayName}
                    formatDateShort={formatDateShort}
                    toHandle={toHandle}
                    commentsOpen={commentsOpen}
                    commentsByPost={commentsByPost}
                    commentsLoading={commentsLoading}
                    commentDrafts={commentDrafts}
                    onToggleComments={toggleComments}
                    onCommentChange={handleCommentChange}
                    onCommentSubmit={handleCommentSubmit}
                  />
                )
              )}
            </div>
          )
        ) : myPosts.length === 0 ? (
          <p className="feed-empty">You have not posted yet.</p>
        ) : (
          <div className="feed-list">
            {myPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isOwn
                currentUserName={userProfile?.name || user?.displayName}
                formatDateShort={formatDateShort}
                toHandle={toHandle}
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

      {showPostModal && (
        <div className="feed-post-modal-overlay" onClick={closePostModal}>
          <div className="feed-post-modal" onClick={(e) => e.stopPropagation()}>
            <div className="feed-post-modal-header">
              <h3>Create Post</h3>
              <button type="button" className="feed-post-modal-close" onClick={closePostModal} aria-label="Close">×</button>
            </div>
            {postStage === 'type' && (
              <div className="feed-post-modal-body">
                <p className="feed-post-modal-hint">Choose a post style.</p>
                <div className="feed-post-type-wheel">
                  {[{ id: 'tweet', label: 'Tweet' }, { id: 'instagram', label: 'Instagram' }, { id: 'poll', label: 'Poll' }].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      className={`feed-post-type-pill ${postType === type.id ? 'active' : ''}`}
                      onClick={() => setPostType(type.id)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                <div className="feed-post-modal-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setPostStage('compose')}>Continue</button>
                </div>
              </div>
            )}
            {postStage === 'compose' && (
              <div className="feed-post-modal-body">
                <div className="feed-composer-row">
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
                <div className="feed-composer-row">
                  <label>
                    Hashtags
                    <input type="text" value={postHashtags} onChange={(e) => setPostHashtags(e.target.value)} placeholder="#renovation #kitchen" />
                  </label>
                  <label>
                    Tag users
                    <input type="text" value={postUserTags} onChange={(e) => setPostUserTags(e.target.value)} placeholder="@alex, @chris" />
                  </label>
                </div>
                {postType === 'instagram' && (
                  <div className="feed-post-media-upload">
                    <DragDropFileInput
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={(f) => { if (f) handleUploadPostImage(f); }}
                      disabled={postImageUploading}
                      uploading={postImageUploading}
                      placeholder={postImageUrl ? 'Drop to replace image' : 'Drop or click to upload image'}
                      className="feed-doc-upload"
                    />
                    {postImageUrl && (
                      <div className="feed-post-media-preview">
                        <img src={postImageUrl} alt="Post" />
                        <button type="button" className="btn btn-outline btn-small" onClick={() => setPostImageUrl('')}>Remove image</button>
                      </div>
                    )}
                  </div>
                )}
                {postType === 'poll' && (
                  <div className="feed-poll-options">
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
                    <button type="button" className="btn btn-outline btn-small" onClick={() => setPollOptions([...pollOptions, ''])}>+ Add option</button>
                    {pollOptions.length > 2 && (
                      <button type="button" className="btn btn-outline btn-small" onClick={() => setPollOptions(pollOptions.slice(0, -1))}>Remove last</button>
                    )}
                  </div>
                )}
                <div className="feed-post-modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setPostStage('type')}>Back</button>
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

function PostCard({
  post,
  isOwn,
  currentUserName,
  formatDateShort,
  toHandle,
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
  const commentCount = (commentsByPost[post.id] || []).length;

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
        <button type="button" className="feed-engagement-btn" onClick={() => onToggleComments(post.id)}>
          <span className="feed-engagement-icon" aria-hidden>💬</span>
          <span>{commentCount}</span>
        </button>
        {post.propertyId && (
          <Link to={`/property/${post.propertyId}`} className="feed-engagement-btn feed-engagement-share">
            <span className="feed-engagement-icon" aria-hidden>↗</span>
            <span>Share</span>
          </Link>
        )}
        <button type="button" className="feed-engagement-btn" aria-label="Bookmark">
          <span className="feed-engagement-icon" aria-hidden>🔖</span>
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

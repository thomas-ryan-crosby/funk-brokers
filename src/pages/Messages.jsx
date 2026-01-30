import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMessagesForUser, createMessage } from '../services/messageService';
import './Messages.css';

const formatDate = (v) => {
  if (!v) return '—';
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const formatListDate = (v) => {
  if (!v) return '';
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const THREAD_READ_KEY = 'messageLastReadByThread';
const buildThreadKey = (otherUserId, propertyId) => `${otherUserId}_${propertyId || 'none'}`;

const Messages = () => {
  const { user, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterFromUserId, setFilterFromUserId] = useState('');
  const [filterPropertyId, setFilterPropertyId] = useState('');
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [composingNew, setComposingNew] = useState(false);
  const [newTo, setNewTo] = useState('');
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newBody, setNewBody] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in?redirect=/messages');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMessages();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const to = searchParams.get('to');
    const propertyId = searchParams.get('propertyId') || null;
    const state = location.state || {};
    if (to) {
      setSelectedThread({
        otherUserId: to,
        otherUserName: state.otherUserName || 'Unknown',
        propertyId,
        propertyAddress: state.propertyAddress || null,
      });
      setComposingNew(false);
    }
  }, [searchParams, location.state]);

  const loadMessages = async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getMessagesForUser(user.uid);
      setMessages(list);
    } catch (e) {
      setError('Failed to load messages.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const uid = user?.uid;
  const myName = userProfile?.name || user?.displayName || 'You';

  const threads = useMemo(() => {
    if (!uid) return [];
    const map = new Map();
    for (const m of messages) {
      const other = m.senderId === uid ? { id: m.recipientId, name: m.recipientName || 'Unknown' } : { id: m.senderId, name: m.senderName || 'Unknown' };
      const key = `${other.id}_${m.propertyId || 'none'}`;
      if (!map.has(key)) {
        map.set(key, { otherUserId: other.id, otherUserName: other.name, propertyId: m.propertyId || null, propertyAddress: m.propertyAddress || null, messages: [] });
      }
      map.get(key).messages.push(m);
    }
    for (const t of map.values()) {
      t.messages.sort((a, b) => {
        const aD = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bD = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return aD - bD;
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.createdAt;
      const bLast = b.messages[b.messages.length - 1]?.createdAt;
      const aD = aLast?.toDate ? aLast.toDate() : new Date(aLast || 0);
      const bD = bLast?.toDate ? bLast.toDate() : new Date(bLast || 0);
      return bD - aD;
    });
  }, [messages, uid]);

  const filteredThreads = useMemo(() => {
    let list = threads;
    if (filterFromUserId) list = list.filter((t) => t.otherUserId === filterFromUserId);
    if (filterPropertyId) list = list.filter((t) => (t.propertyId || '') === filterPropertyId);
    return list;
  }, [threads, filterFromUserId, filterPropertyId]);

  const messageableUsers = useMemo(() => {
    const seen = new Map();
    for (const t of threads) {
      if (!seen.has(t.otherUserId)) seen.set(t.otherUserId, t.otherUserName);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [threads]);

  const messageableProperties = useMemo(() => {
    const seen = new Map();
    for (const t of threads) {
      if (t.propertyId && t.propertyAddress && !seen.has(t.propertyId)) seen.set(t.propertyId, t.propertyAddress);
    }
    return Array.from(seen.entries()).map(([id, address]) => ({ id, address }));
  }, [threads]);

  useEffect(() => {
    if (!selectedThread || !uid) return;
    const key = buildThreadKey(selectedThread.otherUserId, selectedThread.propertyId);
    const latest = selectedThreadMessages[selectedThreadMessages.length - 1];
    const latestDate = latest
      ? (latest.createdAt?.toDate ? latest.createdAt.toDate() : new Date(latest.createdAt || Date.now()))
      : new Date();
    try {
      const map = JSON.parse(localStorage.getItem(THREAD_READ_KEY) || '{}');
      map[key] = latestDate.toISOString();
      localStorage.setItem(THREAD_READ_KEY, JSON.stringify(map));
      window.dispatchEvent(new Event('messages:read'));
    } catch (e) {
      console.error('Failed to store message read state', e);
    }
  }, [selectedThread, selectedThreadMessages, uid]);

  const selectedThreadMessages = useMemo(() => {
    if (!selectedThread) return [];
    const t = threads.find((x) => x.otherUserId === selectedThread.otherUserId && (x.propertyId || '') === (selectedThread.propertyId || ''));
    return t ? t.messages : [];
  }, [threads, selectedThread]);

  const handleSendReply = async () => {
    if (!selectedThread || !replyBody.trim() || !uid || sending) return;
    setSending(true);
    try {
      await createMessage({
        senderId: uid,
        senderName: myName,
        recipientId: selectedThread.otherUserId,
        recipientName: selectedThread.otherUserName,
        propertyId: selectedThread.propertyId || null,
        propertyAddress: selectedThread.propertyAddress || null,
        body: replyBody.trim(),
      });
      setReplyBody('');
      await loadMessages();
    } catch (e) {
      setError('Failed to send.');
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleSendNew = async () => {
    if (!newTo || !newBody.trim() || !uid || sending) return;
    const rec = messageableUsers.find((u) => u.id === newTo);
    const name = rec?.name || 'Unknown';
    let propertyId = null;
    let propertyAddress = null;
    if (newPropertyId) {
      const p = messageableProperties.find((x) => x.id === newPropertyId);
      if (p) { propertyId = p.id; propertyAddress = p.address; }
    }
    setSending(true);
    try {
      await createMessage({
        senderId: uid,
        senderName: myName,
        recipientId: newTo,
        recipientName: name,
        propertyId,
        propertyAddress,
        body: newBody.trim(),
      });
      setNewTo('');
      setNewPropertyId('');
      setNewBody('');
      setComposingNew(false);
      setSelectedThread({ otherUserId: newTo, otherUserName: name, propertyId, propertyAddress });
      await loadMessages();
    } catch (e) {
      setError('Failed to send.');
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="messages-page">
        <div className="loading-state">{authLoading ? 'Loading...' : 'Redirecting...'}</div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <div className="messages-container">
        <header className="messages-header">
          <h1>Messages</h1>
          <div className="messages-filters">
            <select
              value={filterFromUserId}
              onChange={(e) => setFilterFromUserId(e.target.value)}
              className="messages-filter-select"
              aria-label="Filter by user"
            >
              <option value="">All users</option>
              {messageableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <select
              value={filterPropertyId}
              onChange={(e) => setFilterPropertyId(e.target.value)}
              className="messages-filter-select"
              aria-label="Filter by property"
            >
              <option value="">All properties</option>
              {messageableProperties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
            <button type="button" className="btn btn-primary btn-small" onClick={() => { setComposingNew(true); setSelectedThread(null); }}>
              New message
            </button>
          </div>
        </header>

        {error && <div className="messages-error">{error}</div>}

        <div className="messages-body">
          <aside className="messages-list">
            {loading ? (
              <p className="messages-empty">Loading...</p>
            ) : filteredThreads.length === 0 ? (
              <p className="messages-empty">No conversations yet. Start one from a property or deal, or pick a user above and use New message.</p>
            ) : (
              <ul className="thread-list">
                {filteredThreads.map((t) => {
                  const last = t.messages[t.messages.length - 1];
                  const isSelected = selectedThread && selectedThread.otherUserId === t.otherUserId && (selectedThread.propertyId || '') === (t.propertyId || '');
                  return (
                    <li
                      key={`${t.otherUserId}_${t.propertyId || 'none'}`}
                      className={`thread-item ${isSelected ? 'thread-item--selected' : ''}`}
                      onClick={() => { setSelectedThread(t); setComposingNew(false); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedThread(t); setComposingNew(false); } }}
                    >
                      <div className="thread-item-head">
                        <span className="thread-item-name">{t.otherUserName}</span>
                        <span className="thread-item-date">{formatListDate(last?.createdAt)}</span>
                      </div>
                      <div className="thread-item-context">{t.propertyAddress || 'General'}</div>
                      <div className="thread-item-preview">{(last?.body || '').slice(0, 60)}{(last?.body || '').length > 60 ? '…' : ''}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <main className="messages-main">
            {composingNew && (
              <div className="thread-view thread-view--compose">
                <h2>New message</h2>
                {messageableUsers.length === 0 ? (
                  <p className="form-hint">Start a conversation from a property page (Message seller) or from a deal in Deal Center. Once you have conversations, you can message those users here.</p>
                ) : (
                  <form className="compose-form" onSubmit={(e) => { e.preventDefault(); handleSendNew(); }}>
                    <div className="form-group">
                      <label>To *</label>
                      <select value={newTo} onChange={(e) => setNewTo(e.target.value)} required>
                        <option value="">Select user</option>
                        {messageableUsers.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Regarding property (optional)</label>
                      <select value={newPropertyId} onChange={(e) => setNewPropertyId(e.target.value)}>
                        <option value="">General</option>
                        {messageableProperties.map((p) => (
                          <option key={p.id} value={p.id}>{p.address}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Message *</label>
                      <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={4} required placeholder="Type your message..." />
                    </div>
                    <div className="compose-actions">
                      <button type="button" className="btn btn-outline" onClick={() => setComposingNew(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={sending || !newTo || !newBody.trim()}>{sending ? 'Sending...' : 'Send'}</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {!composingNew && selectedThread && (
              <div className="thread-view">
                <div className="thread-view-header">
                  <h2>{selectedThread.otherUserName}</h2>
                  <div className="thread-view-context">{selectedThread.propertyAddress || 'General'}</div>
                </div>
                <div className="thread-messages">
                  {selectedThreadMessages.length === 0 ? (
                    <p className="thread-empty">No messages yet. Send one below.</p>
                  ) : (
                    selectedThreadMessages.map((m) => {
                      const isMe = m.senderId === uid;
                      return (
                        <div key={m.id} className={`thread-msg ${isMe ? 'thread-msg--me' : 'thread-msg--them'}`}>
                          <div className="thread-msg-body">{m.body}</div>
                          <div className="thread-msg-meta">{formatDate(m.createdAt)}</div>
                        </div>
                      );
                    })
                  )}
                </div>
                <form className="thread-reply" onSubmit={(e) => { e.preventDefault(); handleSendReply(); }}>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Type a message..."
                    rows={2}
                    disabled={sending}
                  />
                  <button type="submit" className="btn btn-primary" disabled={sending || !replyBody.trim()}>{sending ? 'Sending...' : 'Send'}</button>
                </form>
              </div>
            )}

            {!composingNew && !selectedThread && filteredThreads.length > 0 && (
              <div className="thread-view thread-view--empty">
                <p>Select a conversation or start a new message.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Messages;

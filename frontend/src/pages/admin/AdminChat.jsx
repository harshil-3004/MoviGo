import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { getSocket } from '../../services/chatSocket';
import { fetchApi } from '../../services/api';
import { Send, Search, User, Check, CheckCheck, Paperclip, Loader, ArrowLeft, Phone, MoreVertical } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const AdminChat = () => {
  const { user } = useSelector(state => state.auth);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [contactTyping, setContactTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const socketRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // ── Socket ──
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    socketRef.current = socket;
    const myId = user.id || user._id;

    const onConnect = () => socket.emit('register', myId);
    if (socket.connected) socket.emit('register', myId);
    else socket.on('connect', onConnect);

    const onOnlineUsers = (users) => setOnlineUsers(users);
    socket.on('onlineUsers', onOnlineUsers);

    const onReceiveMessage = (message) => {
      const senderId = message.sender?._id || message.sender;
      setActiveContact(currentActive => {
        if (currentActive && (senderId === currentActive._id || senderId === myId)) {
          setMessages(prev => {
            if (prev.some(m => m._id === message._id)) return prev;
            return [...prev, message];
          });
          if (senderId !== myId) {
            socket.emit('markAsRead', { senderId, receiverId: myId });
          }
        } else if (senderId !== myId) {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        }
        setContacts(prev => {
          const updated = prev.map(c => {
            if (c._id === senderId || (message.receiver && c._id === message.receiver)) {
              return {
                ...c,
                lastMessage: message,
                unreadCount: (c._id === senderId && (!currentActive || currentActive._id !== c._id))
                  ? (c.unreadCount || 0) + 1 : 0
              };
            }
            return c;
          });
          return updated.sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
          });
        });
        return currentActive;
      });
    };
    socket.on('receiveMessage', onReceiveMessage);

    const onTyping = ({ sender }) => setActiveContact(c => { if (c?._id === sender) setContactTyping(true); return c; });
    const onStopTyping = ({ sender }) => setActiveContact(c => { if (c?._id === sender) setContactTyping(false); return c; });
    const onMessagesRead = ({ receiverId }) => {
      setActiveContact(c => {
        if (c?._id === receiverId) {
          setMessages(prev => prev.map(m =>
            (m.sender?._id === myId || m.sender === myId) ? { ...m, read: true } : m
          ));
        }
        return c;
      });
    };
    socket.on('typing', onTyping);
    socket.on('stopTyping', onStopTyping);
    socket.on('messagesRead', onMessagesRead);

    return () => {
      socket.off('connect', onConnect);
      socket.off('onlineUsers', onOnlineUsers);
      socket.off('receiveMessage', onReceiveMessage);
      socket.off('typing', onTyping);
      socket.off('stopTyping', onStopTyping);
      socket.off('messagesRead', onMessagesRead);
    };
  }, [user?.id, user?._id]);

  useEffect(() => { fetchContacts(); }, []);

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact._id);
      if (socketRef.current) {
        socketRef.current.emit('markAsRead', { senderId: activeContact._id, receiverId: user.id || user._id });
      }
      setContacts(prev => prev.map(c => c._id === activeContact._id ? { ...c, unreadCount: 0 } : c));
      // focus input on mobile after selecting contact
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeContact?._id]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, contactTyping]);

  const fetchContacts = async () => {
    try { setContacts(await fetchApi('/chat/contacts')); } catch (e) { console.error(e); }
  };

  const fetchMessages = async (id) => {
    try { setMessages(await fetchApi(`/chat/messages/${id}`)); } catch (e) { console.error(e); }
  };

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeContact || !socketRef.current) return;
    socketRef.current.emit('sendMessage', {
      sender: user.id || user._id,
      receiver: activeContact._id,
      text: newMessage.trim(),
    });
    setNewMessage('');
    setShowEmojiPicker(false);
    socketRef.current.emit('stopTyping', { sender: user.id || user._id, receiver: activeContact._id });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeContact || !socketRef.current) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/upload`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: formData }
      );
      const result = await res.json();
      if (result.url) {
        const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
        socketRef.current.emit('sendMessage', {
          sender: user.id || user._id,
          receiver: activeContact._id,
          text: file.name,
          fileUrl: result.url,
          fileType,
        });
      } else {
        alert('Upload failed: ' + (result.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to upload attachment');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!activeContact || !socketRef.current) return;
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', { sender: user.id || user._id, receiver: activeContact._id });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current.emit('stopTyping', { sender: user.id || user._id, receiver: activeContact._id });
    }, 2000);
  };

  const isLightTheme = document.body.classList.contains('light-theme');
  const myId = user?.id || user?._id;
  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-[calc(100dvh-60px)] md:h-[calc(100vh-2rem)] bg-base md:m-4 md:rounded-3xl overflow-hidden shadow-2xl border" style={{ borderColor: 'var(--theme-border)' }}>

      {/* ── LEFT: Contacts Sidebar ── */}
      <div className={`
        flex flex-col border-r border-white/10 bg-base
        ${activeContact ? 'hidden md:flex md:w-80 lg:w-96' : 'flex w-full md:w-80 lg:w-96'}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10 flex-shrink-0" style={{ borderColor: 'var(--theme-border)' }}>
          <h2 className="text-xl font-bold text-white mb-3 font-outfit" style={{ color: 'var(--color-white)' }}>
            Internal Chat
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search admins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              style={{
                background: 'var(--theme-surface-darker)',
                border: '1px solid var(--theme-border)',
                color: 'var(--color-white)',
              }}
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 && (
            <div className="p-8 text-center text-muted text-sm italic">No contacts found</div>
          )}
          {filteredContacts.map(contact => {
            const isOnline = onlineUsers.includes(contact._id);
            const isActive = activeContact?._id === contact._id;
            return (
              <div
                key={contact._id}
                onClick={() => setActiveContact(contact)}
                className="flex items-center gap-3 p-4 cursor-pointer transition-all border-b"
                style={{
                  background: isActive ? 'rgba(244,63,94,0.08)' : 'transparent',
                  borderColor: 'var(--theme-border)',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-surface)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {contact.profilePhoto ? (
                    <img src={contact.profilePhoto} alt={contact.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                      {contact.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-base transition-colors ${isOnline ? 'bg-emerald-500' : 'bg-gray-500/50'}`}></div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-white)' }}>{contact.name}</p>
                    {contact.lastMessage && (
                      <span className="text-[10px] text-muted flex-shrink-0">{formatTime(contact.lastMessage.createdAt)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted truncate">
                      {contact.lastMessage
                        ? (contact.lastMessage.fileUrl ? `📎 ${contact.lastMessage.text || 'Attachment'}` : contact.lastMessage.text)
                        : <span className="italic opacity-60">No messages yet</span>
                      }
                    </p>
                    {contact.unreadCount > 0 && (
                      <span className="ml-2 flex-shrink-0 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] mt-0.5 font-medium ${isOnline ? 'text-emerald-500' : 'text-muted opacity-60'}`}>
                    {isOnline ? '● Online' : '● Offline'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Chat Area ── */}
      {activeContact ? (
        <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--color-base)' }}>

          {/* Chat Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 backdrop-blur-md"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--color-surface)' }}
          >
            {/* Back button (mobile) */}
            <button
              onClick={() => setActiveContact(null)}
              className="md:hidden p-2 rounded-xl hover:bg-white/10 text-muted hover:text-white transition-colors flex-shrink-0"
              style={{ color: 'var(--color-muted)' }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {activeContact.profilePhoto ? (
                <img src={activeContact.profilePhoto} alt={activeContact.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                  {activeContact.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-base ${onlineUsers.includes(activeContact._id) ? 'bg-emerald-500' : 'bg-gray-500/50'}`}></div>
            </div>

            {/* Name & Status */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: 'var(--color-white)' }}>{activeContact.name}</p>
              <p className={`text-xs font-medium ${onlineUsers.includes(activeContact._id) ? 'text-emerald-500' : 'text-muted'}`}>
                {onlineUsers.includes(activeContact._id) ? '● Online' : '● Offline'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-3 md:p-5 space-y-3"
            style={{ background: 'var(--color-base)' }}
          >
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 border border-primary/20">
                    <span className="text-2xl">💬</span>
                  </div>
                  <p className="text-muted text-sm">Start your conversation with {activeContact.name}</p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => {
              const senderId = msg.sender?._id || msg.sender;
              const isMe = senderId === myId;
              return (
                <div key={msg._id || idx} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {/* Avatar for received messages */}
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mb-1">
                      {activeContact.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}

                  <div className={`max-w-[78%] sm:max-w-[65%] rounded-2xl overflow-hidden shadow-sm
                    ${isMe
                      ? 'bg-primary text-[#ffffff] rounded-br-sm'
                      : 'rounded-bl-sm'
                    }
                  `}
                    style={!isMe ? {
                      background: 'var(--color-surface)',
                      border: '1px solid var(--theme-border)',
                      color: 'var(--color-white)'
                    } : {}}
                  >
                    {/* Attachment */}
                    {msg.fileUrl ? (
                      <div>
                        {msg.fileType === 'image' ? (
                          <img
                            src={msg.fileUrl}
                            alt={msg.text || 'image'}
                            className="max-h-64 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.fileUrl, '_blank')}
                          />
                        ) : msg.fileType === 'video' ? (
                          <video src={msg.fileUrl} controls className="max-h-56 w-full" />
                        ) : (
                          <a href={msg.fileUrl} target="_blank" rel="noreferrer"
                            className={`flex items-center gap-3 p-3 hover:opacity-80 transition-opacity`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-white/20' : 'bg-primary/20'}`}>
                              <Paperclip className={`w-5 h-5 ${isMe ? 'text-[#ffffff]' : 'text-primary'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{msg.text || 'Document'}</p>
                              <p className={`text-[10px] opacity-70`}>Tap to open</p>
                            </div>
                          </a>
                        )}
                        {/* Filename + time below image/video */}
                        <div className={`px-3 pb-2 pt-1 flex items-center justify-between gap-2`}>
                          {(msg.fileType === 'image' || msg.fileType === 'video') && (
                            <p className="text-[10px] opacity-70 truncate">{msg.text}</p>
                          )}
                          <div className={`flex items-center gap-1 text-[10px] opacity-70 ml-auto flex-shrink-0`}>
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMe && (msg.read ? <CheckCheck className="w-3 h-3 text-[#ffffff] opacity-80" /> : <Check className="w-3 h-3 text-[#ffffff]" />)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-2">
                        <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                        <div className={`flex items-center justify-end gap-1 text-[10px] opacity-70 mt-1`}>
                          <span>{formatTime(msg.createdAt)}</span>
                          {isMe && (msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {contactTyping && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                  {activeContact.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--theme-border)' }}
                >
                  {[0, 150, 300].map(delay => (
                    <div key={delay} className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t flex-shrink-0 relative" style={{ borderColor: 'var(--theme-border)', background: 'var(--color-surface)' }}>
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 right-0 md:left-auto md:right-4 mb-2 z-50 shadow-2xl">
                <Picker
                  data={data}
                  onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji.native)}
                  theme={isLightTheme ? 'light' : 'dark'}
                  previewPosition="none"
                />
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              {/* Emoji toggle */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(v => !v)}
                className="p-2.5 rounded-xl transition-colors flex-shrink-0 text-xl hover:scale-110"
                title="Emoji"
              >😊</button>

              {/* Attach */}
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl transition-colors flex-shrink-0 hover:text-primary disabled:opacity-50"
                style={{ color: 'var(--color-muted)' }}
                title="Attach file"
              >
                {isUploading ? <Loader className="w-5 h-5 animate-spin text-primary" /> : <Paperclip className="w-5 h-5" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/mp4,application/pdf,.doc,.docx"
                onChange={handleFileUpload}
              />

              {/* Text */}
              <input
                ref={inputRef}
                type="text"
                placeholder={isUploading ? 'Uploading...' : 'Type a message...'}
                value={newMessage}
                onChange={handleTyping}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(e)}
                disabled={isUploading}
                className="flex-1 min-w-0 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                style={{
                  background: 'var(--theme-surface-darker)',
                  border: '1px solid var(--theme-border)',
                  color: 'var(--color-white)',
                }}
              />

              {/* Send */}
              <button
                type="submit"
                disabled={!newMessage.trim() || isUploading}
                className="p-2.5 rounded-xl flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: newMessage.trim() && !isUploading ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: newMessage.trim() && !isUploading ? '#fff' : 'var(--color-muted)',
                }}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Empty state (desktop) */
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-10" style={{ background: 'var(--color-base)' }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 border border-primary/20" style={{ background: 'rgba(244,63,94,0.08)' }}>
            <img src="/src/assets/Logo.png" alt="MoviGo" className="h-8 opacity-50 grayscale" />
          </div>
          <h3 className="text-xl font-bold mb-2 font-outfit" style={{ color: 'var(--color-white)' }}>MoviGo Connect</h3>
          <p className="text-sm max-w-xs" style={{ color: 'var(--color-muted)' }}>
            Select an admin from the sidebar to start a secure conversation.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminChat;

import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { getSocket } from '../../services/chatSocket';
import { fetchApi, uploadFile } from '../../services/api';
import {
  Send,
  Search,
  Check,
  CheckCheck,
  Paperclip,
  Loader,
  ArrowLeft,
  Smile,
  MessageSquare,
} from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const AdminChat = () => {
  const { user } = useSelector((state) => state.auth);
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
  const [isLightTheme, setIsLightTheme] = useState(
    () => document.body.classList.contains('light-theme')
  );

  const socketRef = useRef(null);
  const activeContactRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const myId = user?.id || user?._id;

  useEffect(() => {
    const syncTheme = () => setIsLightTheme(document.body.classList.contains('light-theme'));
    window.addEventListener('mg-theme-change', syncTheme);
    return () => window.removeEventListener('mg-theme-change', syncTheme);
  }, []);

  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!myId) return;
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => socket.emit('register', myId);
    if (socket.connected) socket.emit('register', myId);
    else socket.on('connect', onConnect);

    const onOnlineUsers = (users) => setOnlineUsers(users);
    socket.on('onlineUsers', onOnlineUsers);

    const onReceiveMessage = (message) => {
      const senderId = message.sender?._id || message.sender;
      const receiverId = message.receiver?._id || message.receiver;
      const currentActive = activeContactRef.current;

      if (currentActive && (senderId === currentActive._id || senderId === myId)) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        if (senderId !== myId) {
          socket.emit('markAsRead', { senderId, receiverId: myId });
        }
      }

      setContacts((prev) => {
        const updated = prev.map((c) => {
          if (c._id === senderId || (receiverId && c._id === receiverId)) {
            return {
              ...c,
              lastMessage: message,
              unreadCount:
                c._id === senderId && (!currentActive || currentActive._id !== c._id)
                  ? (c.unreadCount || 0) + 1
                  : 0,
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
    };
    socket.on('receiveMessage', onReceiveMessage);

    const onTyping = ({ sender }) => {
      if (activeContactRef.current?._id === sender) setContactTyping(true);
    };
    const onStopTyping = ({ sender }) => {
      if (activeContactRef.current?._id === sender) setContactTyping(false);
    };
    const onMessagesRead = ({ receiverId }) => {
      if (activeContactRef.current?._id === receiverId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender?._id === myId || m.sender === myId ? { ...m, read: true } : m
          )
        );
      }
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
  }, [myId]);

  const fetchContacts = async () => {
    try {
      const list = await fetchApi('/chat/contacts');
      setContacts(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (id) => {
    try {
      const msgs = await fetchApi(`/chat/messages/${id}`);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (activeContact && myId) {
      fetchMessages(activeContact._id);
      if (socketRef.current) {
        socketRef.current.emit('markAsRead', { senderId: activeContact._id, receiverId: myId });
      }
      setContacts((prev) =>
        prev.map((c) => (c._id === activeContact._id ? { ...c, unreadCount: 0 } : c))
      );
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeContact, myId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, contactTyping]);

  const formatTime = (d) =>
    d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeContact || !socketRef.current || !myId) return;
    socketRef.current.emit('sendMessage', {
      sender: myId,
      receiver: activeContact._id,
      text: newMessage.trim(),
    });
    setNewMessage('');
    setShowEmojiPicker(false);
    setIsTyping(false);
    socketRef.current.emit('stopTyping', { sender: myId, receiver: activeContact._id });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeContact || !socketRef.current || !myId) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(true);
    try {
      const result = await uploadFile(file);
      if (result.url) {
        const fileType = file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
            ? 'video'
            : 'file';
        socketRef.current.emit('sendMessage', {
          sender: myId,
          receiver: activeContact._id,
          text: file.name,
          fileUrl: result.url,
          fileType,
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!activeContact || !socketRef.current || !myId) return;
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', { sender: myId, receiver: activeContact._id });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('stopTyping', { sender: myId, receiver: activeContact._id });
    }, 2000);
  };

  const filteredContacts = contacts.filter((c) =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="flex h-[calc(100dvh-56px)] lg:h-[calc(100vh-2rem)] lg:m-4 lg:rounded-xl overflow-hidden border"
      style={{
        backgroundColor: 'var(--mg-surface)',
        borderColor: 'var(--mg-border)',
      }}
    >
      {/* Contacts List */}
      <div
        className={`flex flex-col border-r ${
          activeContact ? 'hidden md:flex md:w-80 lg:w-96' : 'flex w-full md:w-80 lg:w-96'
        }`}
        style={{
          backgroundColor: 'var(--mg-surface)',
          borderColor: 'var(--mg-border)',
        }}
      >
        <div className="p-4 border-b shrink-0" style={{ borderColor: 'var(--mg-border)' }}>
          <h1 className="text-lg font-display font-bold mb-3" style={{ color: 'var(--mg-ink)' }}>
            Team Chat
          </h1>
          <div className="relative">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--mg-ink-3)' }}
            />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mg-input w-full pl-9 pr-3 py-2 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y" style={{ borderColor: 'var(--mg-border)' }}>
          {filteredContacts.length === 0 && (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--mg-ink-3)' }}>
              No contacts found
            </div>
          )}
          {filteredContacts.map((contact) => {
            const isOnline = onlineUsers.includes(contact._id);
            const isActive = activeContact?._id === contact._id;
            return (
              <button
                key={contact._id}
                type="button"
                onClick={() => {
                  setContactTyping(false);
                  setActiveContact(contact);
                }}
                className="w-full text-left flex items-center gap-3 p-3.5 transition-colors cursor-pointer"
                style={{
                  backgroundColor: isActive ? 'var(--mg-accent-soft)' : 'transparent',
                }}
              >
                <div className="relative shrink-0">
                  {contact.profilePhoto ? (
                    <img
                      src={contact.profilePhoto}
                      alt={contact.name}
                      className="w-11 h-11 rounded-full object-cover border"
                      style={{ borderColor: 'var(--mg-border)' }}
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: 'var(--mg-accent-soft)',
                        color: 'var(--mg-accent)',
                      }}
                    >
                      {contact.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <span
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                    style={{
                      backgroundColor: isOnline ? 'var(--mg-success)' : 'var(--mg-ink-3)',
                      borderColor: 'var(--mg-surface)',
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--mg-ink)' }}>
                      {contact.name}
                    </p>
                    {contact.lastMessage && (
                      <span className="text-[11px] shrink-0" style={{ color: 'var(--mg-ink-3)' }}>
                        {formatTime(contact.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs truncate" style={{ color: 'var(--mg-ink-2)' }}>
                      {contact.lastMessage
                        ? contact.lastMessage.fileUrl
                          ? `Attachment: ${contact.lastMessage.text || 'File'}`
                          : contact.lastMessage.text
                        : 'No messages yet'}
                    </p>
                    {contact.unreadCount > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white min-w-[18px] text-center shrink-0"
                        style={{ backgroundColor: 'var(--mg-accent)' }}
                      >
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Workspace */}
      {activeContact ? (
        <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: 'var(--mg-bg)' }}>
          {/* Active Chat Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
            style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
          >
            <button
              type="button"
              onClick={() => setActiveContact(null)}
              aria-label="Back to contacts"
              className="md:hidden p-1.5 rounded-lg border cursor-pointer"
              style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-ink-2)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="relative shrink-0">
              {activeContact.profilePhoto ? (
                <img
                  src={activeContact.profilePhoto}
                  alt={activeContact.name}
                  className="w-9 h-9 rounded-full object-cover border"
                  style={{ borderColor: 'var(--mg-border)' }}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: 'var(--mg-accent-soft)', color: 'var(--mg-accent)' }}
                >
                  {activeContact.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="font-display font-bold text-sm truncate" style={{ color: 'var(--mg-ink)' }}>
                {activeContact.name}
              </p>
              <p
                className="text-xs font-medium"
                style={{
                  color: onlineUsers.includes(activeContact._id)
                    ? 'var(--mg-success)'
                    : 'var(--mg-ink-3)',
                }}
              >
                {onlineUsers.includes(activeContact._id) ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>

          {/* Messages Stream */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <MessageSquare className="w-8 h-8 mb-2" style={{ color: 'var(--mg-ink-3)' }} />
                <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
                  Send a message to start chatting with {activeContact.name}
                </p>
              </div>
            )}

            {messages.map((msg, idx) => {
              const senderId = msg.sender?._id || msg.sender;
              const isMe = senderId === myId;
              return (
                <div key={msg._id || idx} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] sm:max-w-[65%] rounded-2xl overflow-hidden ${
                      isMe ? 'rounded-br-sm text-white' : 'rounded-bl-sm border'
                    }`}
                    style={
                      isMe
                        ? { backgroundColor: 'var(--mg-accent)', color: '#ffffff' }
                        : {
                            backgroundColor: 'var(--mg-surface)',
                            borderColor: 'var(--mg-border)',
                            color: 'var(--mg-ink)',
                          }
                    }
                  >
                    {msg.fileUrl ? (
                      <div>
                        {msg.fileType === 'image' ? (
                          <img
                            src={msg.fileUrl}
                            alt={msg.text || 'Attachment'}
                            className="max-h-64 w-full object-cover cursor-pointer"
                            onClick={() => window.open(msg.fileUrl, '_blank')}
                          />
                        ) : msg.fileType === 'video' ? (
                          <video src={msg.fileUrl} controls className="max-h-56 w-full" />
                        ) : (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2.5 p-3 hover:opacity-85"
                          >
                            <Paperclip className="w-4 h-4 shrink-0" />
                            <span className="text-xs font-semibold truncate">{msg.text || 'Document'}</span>
                          </a>
                        )}
                        <div className="px-3 py-1.5 flex items-center justify-end gap-1 text-[10px] opacity-80">
                          <span>{formatTime(msg.createdAt)}</span>
                          {isMe && (msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                        </div>
                      </div>
                    ) : (
                      <div className="px-3.5 py-2">
                        <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                        <div className="flex items-center justify-end gap-1 text-[10px] opacity-80 mt-1">
                          <span>{formatTime(msg.createdAt)}</span>
                          {isMe && (msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {contactTyping && (
              <div className="flex justify-start">
                <div
                  className="px-3.5 py-2.5 rounded-xl border text-xs"
                  style={{
                    backgroundColor: 'var(--mg-surface)',
                    borderColor: 'var(--mg-border)',
                    color: 'var(--mg-ink-3)',
                  }}
                >
                  Typing...
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div
            className="p-3 border-t shrink-0 relative"
            style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
          >
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 sm:left-3 mb-2 z-50">
                <Picker
                  data={data}
                  onEmojiSelect={(emoji) => setNewMessage((prev) => prev + emoji.native)}
                  theme={isLightTheme ? 'light' : 'dark'}
                  previewPosition="none"
                />
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                aria-label="Emoji picker"
                className="p-2 rounded-lg border cursor-pointer"
                style={{
                  backgroundColor: 'var(--mg-surface-2)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-ink-2)',
                }}
              >
                <Smile className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
                className="p-2 rounded-lg border cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--mg-surface-2)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-ink-2)',
                }}
              >
                {isUploading ? (
                  <Loader className="w-4 h-4 animate-spin" style={{ color: 'var(--mg-accent)' }} />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/mp4,application/pdf,.doc,.docx"
                onChange={handleFileUpload}
              />

              <input
                ref={inputRef}
                type="text"
                placeholder={isUploading ? 'Uploading attachment...' : 'Write a message...'}
                value={newMessage}
                onChange={handleTyping}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(e)}
                disabled={isUploading}
                className="mg-input flex-1 min-w-0 px-3.5 py-2 rounded-lg text-sm"
              />

              <button
                type="submit"
                disabled={!newMessage.trim() || isUploading}
                aria-label="Send message"
                className="p-2.5 rounded-lg text-white cursor-pointer disabled:opacity-45"
                style={{ backgroundColor: 'var(--mg-accent)' }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div
          className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8"
          style={{ backgroundColor: 'var(--mg-bg)' }}
        >
          <MessageSquare className="w-10 h-10 mb-3" style={{ color: 'var(--mg-ink-3)' }} />
          <h2 className="font-display font-bold text-lg" style={{ color: 'var(--mg-ink)' }}>
            Select a Conversation
          </h2>
          <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--mg-ink-2)' }}>
            Choose a cinema manager or staff member on the left to start messaging.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminChat;

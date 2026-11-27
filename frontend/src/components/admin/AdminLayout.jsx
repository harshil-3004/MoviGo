import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Film,
  MapPin,
  Users,
  Settings,
  LogOut,
  Ticket,
  Tag,
  Gift,
  QrCode,
  Home,
  Menu,
  X as CloseIcon,
  MessageSquare,
  Sun,
  Moon,
} from 'lucide-react';
import { getSocket } from '../../services/chatSocket';
import LogoutModal from '../common/LogoutModal';

const AdminLayout = () => {
  const { user } = useSelector((state) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('connected');
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('theme') === 'light');

  const isSuperAdmin = user?.role === 'admin' || user?.role === 'master_admin';
  const location = useLocation();
  const socketRef = useRef(null);
  const isOnChatPage = location.pathname === '/admin/chat';
  const isOnChatPageRef = useRef(isOnChatPage);
  const myId = user?.id || user?._id;

  useEffect(() => {
    isOnChatPageRef.current = isOnChatPage;
  }, [isOnChatPage]);

  // Subtle sidebar health telemetry
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        setApiStatus(res.ok ? 'connected' : 'degraded');
      } catch {
        setApiStatus('degraded');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Global socket connection
  useEffect(() => {
    if (!myId) return;

    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => socket.emit('register', myId);
    if (socket.connected) socket.emit('register', myId);
    else socket.on('connect', onConnect);

    const onReceiveMessage = (message) => {
      if (isOnChatPageRef.current) {
        setUnreadCount(0);
        return;
      }
      const senderId = message.sender?._id || message.sender;
      if (senderId && String(senderId) !== String(myId)) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    socket.on('receiveMessage', onReceiveMessage);

    return () => {
      socket.off('connect', onConnect);
      socket.off('receiveMessage', onReceiveMessage);
    };
  }, [myId]);

  const effectiveUnreadCount = isOnChatPage ? 0 : unreadCount;

  const toggleTheme = () => {
    const next = !isLightMode;
    setIsLightMode(next);
    if (next) {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    }
    window.dispatchEvent(new Event('mg-theme-change'));
  };

  useEffect(() => {
    const syncTheme = () => setIsLightMode(document.body.classList.contains('light-theme'));
    window.addEventListener('mg-theme-change', syncTheme);
    return () => window.removeEventListener('mg-theme-change', syncTheme);
  }, []);

  const sidebarLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true, showToManager: true },
    { name: 'Movies', path: '/admin/movies', icon: Film, showToManager: true },
    { name: 'Theaters', path: '/admin/theaters', icon: MapPin, showToManager: true },
    { name: 'Bookings', path: '/admin/bookings', icon: Ticket, showToManager: true },
    { name: 'Promotions', path: '/admin/promotions', icon: Tag, showToManager: true },
    { name: 'Scanner', path: '/admin/scanner', icon: QrCode, showToManager: true },
    { name: 'Users', path: '/admin/users', icon: Users, showToManager: false },
    { name: 'Loyalty Store', path: '/admin/loyalty', icon: Gift, showToManager: true },
    { name: 'Team Chat', path: '/admin/chat', icon: MessageSquare, showToManager: true, badge: true },
    { name: 'Staff Settings', path: '/admin/settings', icon: Settings, showToManager: false },
  ];

  const visibleLinks = sidebarLinks.filter((link) => isSuperAdmin || link.showToManager);

  return (
    <div
      className="flex h-screen overflow-hidden w-full"
      style={{ backgroundColor: 'var(--mg-bg)', color: 'var(--mg-ink)' }}
    >
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[90] md:hidden"
          style={{ backgroundColor: 'var(--mg-overlay)' }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 border-r flex flex-col z-[100] transition-transform duration-200 flex-shrink-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          backgroundColor: 'var(--mg-surface)',
          borderColor: 'var(--mg-border)',
        }}
      >
        <div
          className="h-16 px-5 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'var(--mg-border)' }}
        >
          <Link to="/admin" className="flex items-center gap-2.5">
            <img src="/Logo.png" alt="MoviGo" className="h-6 object-contain" />
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--mg-accent-soft)',
                color: 'var(--mg-accent)',
              }}
            >
              Console
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1 rounded"
            style={{ color: 'var(--mg-ink-2)' }}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {visibleLinks.map((link) => {
            const IconComp = link.icon;
            return (
              <NavLink
                key={link.name}
                to={link.path}
                end={link.exact}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (link.badge) setUnreadCount(0);
                }}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--mg-accent-soft)' : 'transparent',
                  color: isActive ? 'var(--mg-accent)' : 'var(--mg-ink-2)',
                })}
              >
                <IconComp className="w-4 h-4 shrink-0" />
                <span className="truncate">{link.name}</span>
                {link.badge && effectiveUnreadCount > 0 && (
                  <span
                    className="ml-auto text-white text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--mg-accent)' }}
                  >
                    {effectiveUnreadCount > 99 ? '99+' : effectiveUnreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}

          <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--mg-border)' }}>
            <Link
              to="/"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'var(--mg-ink-2)' }}
            >
              <Home className="w-4 h-4 shrink-0" />
              View Storefront
            </Link>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div
          className="p-3 border-t space-y-2 flex-shrink-0"
          style={{ borderColor: 'var(--mg-border)' }}
        >
          <div
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
            style={{ backgroundColor: 'var(--mg-surface-2)', color: 'var(--mg-ink-2)' }}
          >
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    apiStatus === 'connected' ? 'var(--mg-success)' : 'var(--mg-danger)',
                }}
              />
              API {apiStatus === 'connected' ? 'Online' : 'Offline'}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-1 rounded hover:opacity-80 cursor-pointer"
            >
              {isLightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer hover:opacity-80"
            style={{ color: 'var(--mg-ink-2)' }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="truncate">Sign Out ({user?.name?.split(' ')[0] || 'Staff'})</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col min-w-0">
        {/* Mobile Header */}
        <header
          className="md:hidden flex items-center justify-between h-14 px-4 border-b sticky top-0 z-50"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg border"
            style={{
              backgroundColor: 'var(--mg-surface-2)',
              borderColor: 'var(--mg-border)',
              color: 'var(--mg-ink)',
            }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <img src="/Logo.png" alt="MoviGo" className="h-5" />
          <div className="w-8 flex justify-end">
            {effectiveUnreadCount > 0 && (
              <Link
                to="/admin/chat"
                onClick={() => setUnreadCount(0)}
                className="relative p-1.5"
                style={{ color: 'var(--mg-accent)' }}
              >
                <MessageSquare className="w-5 h-5" />
                <span
                  className="absolute -top-0.5 -right-0.5 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--mg-accent)' }}
                >
                  {effectiveUnreadCount > 9 ? '9+' : effectiveUnreadCount}
                </span>
              </Link>
            )}
          </div>
        </header>

        <div className="flex-1">
          <Outlet />
        </div>
      </main>

      <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} />
    </div>
  );
};

export default AdminLayout;

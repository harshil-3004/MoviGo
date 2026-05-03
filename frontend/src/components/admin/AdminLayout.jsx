import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { LayoutDashboard, Film, MapPin, Users, Settings, LogOut, Ticket, Tag, Gift, QrCode, Home, Menu, X as CloseIcon, MessageSquare } from 'lucide-react';
import { logout } from '../../store/authSlice';
import { getSocket, disconnectSocket } from '../../services/chatSocket';
import LogoutModal from '../common/LogoutModal';

const AdminLayout = () => {
  const { user } = useSelector((state) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const dispatch = useDispatch();
  const isSuperAdmin = user?.role === 'admin';
  const location = useLocation();
  const socketRef = useRef(null);
  const isOnChatPage = location.pathname === '/admin/chat';
  // Ref so socket listener always reads the LATEST value (avoids stale closure)
  const isOnChatPageRef = useRef(isOnChatPage);

  // Keep ref in sync whenever route changes
  useEffect(() => {
    isOnChatPageRef.current = isOnChatPage;
  }, [isOnChatPage]);

  // Global socket connection — keeps admin "online" from anywhere in panel
  useEffect(() => {
    if (!user) return;

    const userId = user.id || user._id;
    if (!userId) return;

    socketRef.current = getSocket();

    const onConnect = () => {
      socketRef.current.emit('register', userId);
    };

    // Register immediately if already connected, or wait for connect event
    if (socketRef.current.connected) {
      socketRef.current.emit('register', userId);
    } else {
      socketRef.current.on('connect', onConnect);
    }

    const onReceiveMessage = (message) => {
      if (!isOnChatPageRef.current) {
        const senderId = message.sender?._id || message.sender;
        const myId = user?.id || user?._id;
        if (senderId && senderId !== myId) {
          setUnreadCount(prev => prev + 1);
        }
      }
    };

    socketRef.current.on('receiveMessage', onReceiveMessage);

    return () => {
      // Only remove our specific listeners — do NOT disconnect the singleton
      socketRef.current.off('connect', onConnect);
      socketRef.current.off('receiveMessage', onReceiveMessage);
    };
  }, [user?.id, user?._id]);

  // Clear unread badge when user navigates to chat
  useEffect(() => {
    if (isOnChatPage) {
      setUnreadCount(0);
    }
  }, [isOnChatPage]);

  const sidebarLinks = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, exact: true, showToManager: true },
    { name: 'Movies', path: '/admin/movies', icon: <Film className="w-5 h-5" />, showToManager: true },
    { name: 'Theaters', path: '/admin/theaters', icon: <MapPin className="w-5 h-5" />, showToManager: true },
    { name: 'Bookings', path: '/admin/bookings', icon: <Ticket className="w-5 h-5" />, showToManager: true },
    { name: 'Promotions', path: '/admin/promotions', icon: <Tag className="w-5 h-5" />, showToManager: true },
    { name: 'Scanner', path: '/admin/scanner', icon: <QrCode className="w-5 h-5" />, showToManager: true },
    { name: 'Users', path: '/admin/users', icon: <Users className="w-5 h-5" />, showToManager: false },
    { name: 'Loyalty Store', path: '/admin/loyalty', icon: <Gift className="w-5 h-5" />, showToManager: true },
    { name: 'Internal Chat', path: '/admin/chat', icon: <MessageSquare className="w-5 h-5" />, showToManager: true, badge: true },
    { name: 'Settings', path: '/admin/settings', icon: <Settings className="w-5 h-5" />, showToManager: false },
  ];

  const visibleLinks = sidebarLinks.filter(link => isSuperAdmin || link.showToManager);

  const handleLogout = () => {
     setIsLogoutModalOpen(true);
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-base w-full">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-surface/50 border-r border-white/10 backdrop-blur-xl flex flex-col z-[100] transition-transform duration-300 flex-shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <Link to="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <img src="/Logo.png" alt="MoviGo Logo" className="h-6 object-contain drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
            <span className="text-[10px] uppercase bg-primary/20 text-primary px-2 py-0.5 rounded font-bold tracking-wider ml-1">Admin</span>
          </Link>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white/50 hover:text-white">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto hide-scrollbar">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              end={link.exact}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isActive 
                  ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(244,63,94,0.1)] border border-primary/30' 
                  : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
                }`
              }
            >
              <span className="relative">
                {link.icon}
                {/* Unread badge on chat icon */}
                {link.badge && unreadCount > 0 && !isOnChatPage && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              {link.name}
              {/* Also show count inline for clarity */}
              {link.badge && unreadCount > 0 && !isOnChatPage && (
                <span className="ml-auto bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.4)]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
          
          <div className="pt-4 mt-4 border-t border-white/5">
            <Link 
              to="/" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-400/5 transition-all border border-transparent"
            >
              <Home className="w-5 h-5" />
              Visit Home Page
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-white/50 hover:text-white hover:bg-white/5 transition-colors rounded-xl font-medium cursor-pointer">
            <LogOut className="w-5 h-5" />
            Logout ({user?.name?.split(' ')[0] || 'User'})
          </button>
        </div>
      </aside>

      {/* Main Content Area - scrolls independently */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-surface/50 border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
          <button onClick={toggleMobileMenu} className="p-2 text-white/70 hover:text-white bg-white/5 rounded-lg border border-white/10">
            <Menu className="w-6 h-6" />
          </button>
          <img src="/Logo.png" alt="Logo" className="h-5" />
          <div className="relative">
            {unreadCount > 0 && !isOnChatPage && (
              <Link to="/admin/chat" className="relative p-2 text-primary">
                <MessageSquare className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </Link>
            )}
          </div>
        </header>

        <div className="flex-1">
          <Outlet />
        </div>
      </main>

      {/* Logout Modal */}
      <LogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
      />

    </div>
  );
};

export default AdminLayout;

import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { LayoutDashboard, Film, MapPin, Users, Settings, LogOut, Ticket, Tag, Gift, QrCode, Home, Menu, X as CloseIcon } from 'lucide-react';
import { logout } from '../../store/authSlice';

const AdminLayout = () => {
  const { user } = useSelector((state) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const isSuperAdmin = user?.role === 'admin';

  const sidebarLinks = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, exact: true, showToManager: true },
    { name: 'Movies', path: '/admin/movies', icon: <Film className="w-5 h-5" />, showToManager: true },
    { name: 'Theaters', path: '/admin/theaters', icon: <MapPin className="w-5 h-5" />, showToManager: true },
    { name: 'Bookings', path: '/admin/bookings', icon: <Ticket className="w-5 h-5" />, showToManager: true },
    { name: 'Promotions', path: '/admin/promotions', icon: <Tag className="w-5 h-5" />, showToManager: true },
    { name: 'Scanner', path: '/admin/scanner', icon: <QrCode className="w-5 h-5" />, showToManager: true },
    { name: 'Users', path: '/admin/users', icon: <Users className="w-5 h-5" />, showToManager: false },
    { name: 'Loyalty Store', path: '/admin/loyalty', icon: <Gift className="w-5 h-5" />, showToManager: true },
    { name: 'Settings', path: '/admin/settings', icon: <Settings className="w-5 h-5" />, showToManager: false },
  ];

  const visibleLinks = sidebarLinks.filter(link => isSuperAdmin || link.showToManager);

  const handleLogout = () => {
     dispatch(logout());
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="flex min-h-screen bg-base w-full">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-surface/50 border-r border-white/10 backdrop-blur-xl flex flex-col z-[100] transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <img src="/src/assets/Logo.png" alt="MoviGo Logo" className="h-6 object-contain drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
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
              {link.icon}
              {link.name}
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

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-white/50 hover:text-white hover:bg-white/5 transition-colors rounded-xl font-medium cursor-pointer">
            <LogOut className="w-5 h-5" />
            Logout ({user?.name?.split(' ')[0] || 'User'})
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden relative flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-surface/50 border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
          <button onClick={toggleMobileMenu} className="p-2 text-white/70 hover:text-white bg-white/5 rounded-lg border border-white/10">
            <Menu className="w-6 h-6" />
          </button>
          <img src="/src/assets/Logo.png" alt="Logo" className="h-5" />
          <div className="w-10"></div> {/* Spacer for symmetry */}
        </header>

        <div className="flex-1">
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default AdminLayout;

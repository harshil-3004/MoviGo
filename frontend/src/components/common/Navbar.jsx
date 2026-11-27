import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Search, User, Menu, X, Ticket, AlertTriangle, Shield, LogOut, Sun, Moon } from 'lucide-react';
import { setCheckoutLocked, setPendingBookingId, clearSeats } from '../../store/bookingSlice';
import { getTrendingMovies } from '../../services/movieService';
import { getTheaters } from '../../services/theaterService';
import { fetchApi } from '../../services/api';
import Modal from './Modal';
import Button from './Button';
import LogoutModal from './LogoutModal';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moviesList, setMoviesList] = useState([]);
  const [theatersList, setTheatersList] = useState([]);
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('theme') === 'light');

  // Navigation Guard State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const [pendingLogout, setPendingLogout] = useState(false);
  const searchInputRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { isCheckoutLocked, pendingBookingId } = useSelector((state) => state.booking);

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

  const handleNavClick = (e, path) => {
    if (isCheckoutLocked) {
      e?.preventDefault();
      setPendingLogout(false);
      setPendingPath(path);
      setShowLeaveModal(true);
      return false;
    }
    return true;
  };

  const handleSignOutClick = () => {
    if (isCheckoutLocked) {
      setPendingPath(null);
      setPendingLogout(true);
      setShowLeaveModal(true);
    } else {
      setIsLogoutModalOpen(true);
    }
  };

  const confirmLeave = async () => {
    if (pendingBookingId) {
      try {
        await fetchApi(`/bookings/${pendingBookingId}`, { method: 'DELETE' });
      } catch {
        // Ignore release error during navigation cleanup
      }
      dispatch(setPendingBookingId(null));
      dispatch(clearSeats());
    }
    dispatch(setCheckoutLocked(false));
    setShowLeaveModal(false);

    if (pendingLogout) {
      setPendingLogout(false);
      setIsLogoutModalOpen(true);
    } else if (pendingPath) {
      navigate(pendingPath);
    }
    setPendingPath(null);
  };

  useEffect(() => {
    getTrendingMovies().then((data) => {
      setMoviesList(Array.isArray(data) ? data : []);
    });
    getTheaters().then((data) => {
      setTheatersList(Array.isArray(data) ? data : []);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQuery = searchQuery.toLowerCase();

    const matchedMovies = (moviesList || [])
      .filter((m) => m && m.title && m.title.toLowerCase().includes(lowerQuery))
      .map((m) => ({
        title: m.title,
        subtitle: m.genre || 'Movie',
        type: 'Movie',
        link: `/movie/${m._id || m.id}`,
        id: m._id || m.id,
      }));

    const matchedTheaters = (theatersList || [])
      .filter((t) => t && t.name && t.name.toLowerCase().includes(lowerQuery))
      .map((t) => ({
        title: t.name,
        subtitle: t.location,
        type: 'Cinema',
        link: `/cinema/${t._id || t.id}/shows`,
        id: t._id || t.id,
      }));

    const matchedLocations = (theatersList || [])
      .filter((t) => t && t.location && t.location.toLowerCase().includes(lowerQuery))
      .map((t) => {
        const parts = t.location.split(',');
        return parts[parts.length - 1].trim();
      });

    const uniqueLocations = [...new Set(matchedLocations)].filter(
      (loc) => loc && loc.toLowerCase().includes(lowerQuery)
    );

    const locationSuggestions = uniqueLocations.map((loc) => ({
      title: `Cinemas in ${loc}`,
      subtitle: 'Location',
      type: 'Location',
      link: `/cinemas?search=${encodeURIComponent(loc)}`,
      id: loc,
    }));

    return [...matchedMovies, ...matchedTheaters, ...locationSuggestions].slice(0, 6);
  }, [searchQuery, moviesList, theatersList]);

  const handleSuggestionClick = (link) => {
    if (!handleNavClick(null, link)) return;
    navigate(link);
    setIsSearchFocused(false);
    setSearchQuery('');
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    if (suggestions.length > 0) {
      handleSuggestionClick(suggestions[0].link);
    } else {
      const target = `/movies?search=${encodeURIComponent(searchQuery.trim())}`;
      if (!handleNavClick(null, target)) return;
      navigate(target);
      setIsSearchFocused(false);
      setSearchQuery('');
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Movies', path: '/movies' },
    { name: 'Cinemas', path: '/cinemas' },
  ];

  const isStaff = ['admin', 'master_admin', 'theater_admin'].includes(user?.role);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 transition-colors duration-200 border-b backdrop-blur-md"
      style={{
        backgroundColor: isScrolled ? 'var(--mg-nav-bg)' : 'var(--mg-nav-bg)',
        borderColor: 'var(--mg-border)',
      }}
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Brand + Primary Links */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            onClick={(e) => handleNavClick(e, '/')}
            className="flex items-center shrink-0 focus:outline-none"
          >
            <img src="/Logo.png" alt="MoviGo" className="h-7 object-contain" />
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={(e) => handleNavClick(e, link.path)}
                  className="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: isActive ? 'var(--mg-ink)' : 'var(--mg-ink-2)',
                    backgroundColor: isActive ? 'var(--mg-surface-2)' : 'transparent',
                  }}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Center/Right: Search + Theme + Account */}
        <div className="hidden md:flex items-center gap-3 flex-1 justify-end max-w-xl">
          {/* Persistent Compact Search Bar */}
          <div className="relative flex-1 max-w-xs">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <Search
                className="w-4 h-4 absolute left-3 pointer-events-none"
                style={{ color: 'var(--mg-ink-3)' }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search movies, cinemas, cities..."
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  blurTimeoutRef.current = setTimeout(() => setIsSearchFocused(false), 180);
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg py-2 pl-9 pr-8 text-sm outline-none transition-colors border"
                style={{
                  backgroundColor: 'var(--mg-input-bg)',
                  borderColor: isSearchFocused ? 'var(--mg-accent)' : 'var(--mg-border)',
                  color: 'var(--mg-ink)',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 p-0.5 rounded"
                  style={{ color: 'var(--mg-ink-3)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {isSearchFocused && suggestions.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden py-1 z-[100]"
                style={{
                  backgroundColor: 'var(--mg-surface)',
                  border: '1px solid var(--mg-border-strong)',
                  boxShadow: 'var(--mg-shadow-lg)',
                }}
              >
                {suggestions.map((item, idx) => (
                  <button
                    key={`${item.type}-${item.id}-${idx}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSuggestionClick(item.link)}
                    className="w-full text-left flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors mg-hover cursor-pointer"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-medium truncate" style={{ color: 'var(--mg-ink)' }}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs truncate" style={{ color: 'var(--mg-ink-3)' }}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded shrink-0"
                      style={{
                        backgroundColor: 'var(--mg-surface-2)',
                        color: 'var(--mg-ink-2)',
                      }}
                    >
                      {item.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isLightMode ? 'Switch to dark theme' : 'Switch to light theme'}
            title={isLightMode ? 'Dark mode' : 'Light mode'}
            className="p-2 rounded-lg border transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--mg-surface)',
              borderColor: 'var(--mg-border)',
              color: 'var(--mg-ink-2)',
            }}
          >
            {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Account Menu / Sign In */}
          {isAuthenticated ? (
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--mg-surface)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-ink)',
                }}
              >
                {user?.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--mg-accent)' }}
                  >
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-sm font-medium max-w-[100px] truncate">
                  {user?.name?.split(' ')[0]}
                </span>
              </button>

              <div
                className="absolute right-0 mt-1.5 w-52 rounded-xl py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50"
                style={{
                  backgroundColor: 'var(--mg-surface)',
                  border: '1px solid var(--mg-border-strong)',
                  boxShadow: 'var(--mg-shadow-lg)',
                }}
              >
                <div className="px-3.5 py-2 border-b" style={{ borderColor: 'var(--mg-border)' }}>
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--mg-ink)' }}>
                    {user?.name}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--mg-ink-3)' }}>
                    {user?.email}
                  </p>
                </div>
                <Link
                  to="/profile"
                  onClick={(e) => handleNavClick(e, '/profile')}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors mg-hover"
                  style={{ color: 'var(--mg-ink-2)' }}
                >
                  <User className="w-4 h-4" /> My Profile
                </Link>
                <Link
                  to="/profile"
                  onClick={(e) => handleNavClick(e, '/profile')}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors mg-hover"
                  style={{ color: 'var(--mg-ink-2)' }}
                >
                  <Ticket className="w-4 h-4" /> My Tickets
                </Link>
                {isStaff && (
                  <Link
                    to="/admin"
                    onClick={(e) => handleNavClick(e, '/admin')}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium transition-colors mg-hover"
                    style={{ color: 'var(--mg-accent)' }}
                  >
                    <Shield className="w-4 h-4" /> Admin Portal
                  </Link>
                )}
                <div className="my-1 border-t" style={{ borderColor: 'var(--mg-border)' }} />
                <button
                  type="button"
                  onClick={handleSignOutClick}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-left transition-colors mg-hover cursor-pointer"
                  style={{ color: 'var(--mg-danger)' }}
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={(e) => handleNavClick(e, '/login')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--mg-accent)' }}
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg border"
            style={{
              backgroundColor: 'var(--mg-surface)',
              borderColor: 'var(--mg-border)',
              color: 'var(--mg-ink-2)',
            }}
          >
            {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {isAuthenticated ? (
            <Link
              to="/profile"
              onClick={(e) => handleNavClick(e, '/profile')}
              className="flex items-center"
            >
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border"
                  style={{ borderColor: 'var(--mg-border-strong)' }}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--mg-accent)' }}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={(e) => handleNavClick(e, '/login')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--mg-accent)' }}
            >
              Sign In
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            className="p-2 rounded-lg"
            style={{ color: 'var(--mg-ink)' }}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden absolute top-16 left-0 right-0 border-b px-4 py-4 space-y-3"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border-strong)',
            boxShadow: 'var(--mg-shadow-lg)',
          }}
        >
          <form
            onSubmit={(e) => {
              handleSearch(e);
              setIsMobileMenuOpen(false);
            }}
            className="relative flex items-center"
          >
            <Search
              className="w-4 h-4 absolute left-3 pointer-events-none"
              style={{ color: 'var(--mg-ink-3)' }}
            />
            <input
              type="text"
              placeholder="Search movies & cinemas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mg-input pl-9"
            />
          </form>

          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={(e) => {
                  handleNavClick(e, link.path);
                  setIsMobileMenuOpen(false);
                }}
                className="px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{
                  color: location.pathname === link.path ? 'var(--mg-accent)' : 'var(--mg-ink)',
                  backgroundColor:
                    location.pathname === link.path ? 'var(--mg-accent-soft)' : 'transparent',
                }}
              >
                {link.name}
              </Link>
            ))}

            {isAuthenticated && (
              <>
                <div className="my-1 border-t" style={{ borderColor: 'var(--mg-border)' }} />
                <Link
                  to="/profile"
                  onClick={(e) => {
                    handleNavClick(e, '/profile');
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium"
                  style={{ color: 'var(--mg-ink)' }}
                >
                  My Profile &amp; Tickets
                </Link>
                {isStaff && (
                  <Link
                    to="/admin"
                    onClick={(e) => {
                      handleNavClick(e, '/admin');
                      setIsMobileMenuOpen(false);
                    }}
                    className="px-3 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ color: 'var(--mg-accent)' }}
                  >
                    Admin Portal
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleSignOutClick();
                  }}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-left"
                  style={{ color: 'var(--mg-danger)' }}
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Checkout Leave Confirmation Modal */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => {
          setShowLeaveModal(false);
          setPendingLogout(false);
          setPendingPath(null);
        }}
        title="Release Selected Seats?"
        className="max-w-md"
      >
        <div className="text-center py-2">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--mg-accent-soft)', color: 'var(--mg-accent)' }}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
            Your seats are temporarily held for your booking. Leaving checkout will release them for other moviegoers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => {
                setShowLeaveModal(false);
                setPendingLogout(false);
                setPendingPath(null);
              }}
              className="flex-1"
            >
              Stay on Checkout
            </Button>
            <Button variant="secondary" onClick={confirmLeave} className="flex-1">
              Release &amp; Leave
            </Button>
          </div>
        </div>
      </Modal>

      <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} />
    </header>
  );
};

export default Navbar;

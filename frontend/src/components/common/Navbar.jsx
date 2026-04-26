import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Search, User, Menu, X, Ticket, LogOut, AlertTriangle } from 'lucide-react';
import { logout } from '../../store/authSlice';
import { setCheckoutLocked } from '../../store/bookingSlice';
import { getTrendingMovies } from '../../services/movieService';
import { getTheaters } from '../../services/theaterService';
import Modal from './Modal';
import Button from './Button';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moviesList, setMoviesList] = useState([]);
  const [theatersList, setTheatersList] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  
  // Navigation Guard State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const { isCheckoutLocked } = useSelector(state => state.booking);

  const handleNavClick = (e, path) => {
    if (isCheckoutLocked) {
      e.preventDefault();
      setPendingPath(path);
      setShowLeaveModal(true);
    }
  };

  const confirmLeave = () => {
    dispatch(setCheckoutLocked(false));
    setShowLeaveModal(false);
    if (pendingPath) navigate(pendingPath);
    setPendingPath(null);
  };

  useEffect(() => {
    // Pre-fetch data for search suggestions
    getTrendingMovies().then(data => {
      setMoviesList(Array.isArray(data) ? data : []);
    });
    getTheaters().then(data => {
      setTheatersList(Array.isArray(data) ? data : []);
    });
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const lowerQuery = searchQuery.toLowerCase();
    
    const matchedMovies = (moviesList || [])
      .filter(m => m && m.title && m.title.toLowerCase().includes(lowerQuery))
      .map(m => ({ ...m, title: m.title, type: 'Movie', link: `/movie/${m._id || m.id}` }));
      
    const matchedTheaters = (theatersList || [])
      .filter(t => t && t.name && t.name.toLowerCase().includes(lowerQuery))
      .map(t => ({ ...t, title: t.name, type: 'Cinema', link: `/cinema/${t._id || t.id}/shows` }));
      
    // Extract unique locations/cities from theaters
    const matchedLocations = (theatersList || [])
      .filter(t => t && t.location && t.location.toLowerCase().includes(lowerQuery))
      .map(t => {
        const parts = t.location.split(',');
        return parts[parts.length - 1].trim();
      });
      
    const uniqueLocations = [...new Set(matchedLocations)].filter(loc => loc && loc.toLowerCase().includes(lowerQuery));
    
    const locationSuggestions = uniqueLocations.map(loc => ({
      title: `Cinemas in ${loc}`,
      type: 'City/Location',
      link: `/cinemas?search=${encodeURIComponent(loc)}`
    }));
      
    setSuggestions([...locationSuggestions, ...matchedMovies, ...matchedTheaters].slice(0, 6));
  }, [searchQuery, moviesList, theatersList]);

  const handleSuggestionClick = (link) => {
    navigate(link);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // If user presses enter, maybe just navigate to the first suggestion or the generic movies page
      if (suggestions.length > 0) {
        handleSuggestionClick(suggestions[0].link);
      } else {
        navigate(`/movies?search=${encodeURIComponent(searchQuery.trim())}`);
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Movies', path: '/movies' },
    { name: 'Cinemas', path: '/cinemas' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-base/80 backdrop-blur-xl border-b border-surface py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex-1 flex justify-start">
            <Link to="/" onClick={(e) => handleNavClick(e, '/')} className="flex items-center space-x-3 group transition-transform duration-300 hover:scale-105">
              <img src="/src/assets/Logo.png" alt="MoviGo Logo" className="h-8 object-contain drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex flex-1 justify-center items-center space-x-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={(e) => handleNavClick(e, link.path)}
                className={`text-sm tracking-wide font-medium transition-colors ${location.pathname === link.path ? 'text-primary' : 'text-muted hover:text-white'}`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex flex-1 justify-end items-center space-x-4">
            <div className="relative">
              <form 
                onSubmit={handleSearch}
                className={`flex items-center transition-all duration-300 overflow-hidden ${isSearchOpen ? 'w-64 bg-surface/80 border border-white/20 rounded-full px-3' : 'w-10 bg-transparent border-transparent'}`}
              >
                <button
                  type="button"
                  onClick={() => isSearchOpen && searchQuery ? handleSearch(new Event('submit')) : setIsSearchOpen(!isSearchOpen)}
                  className={`text-muted hover:text-white transition-colors cursor-pointer p-2 shrink-0 ${isSearchOpen ? 'text-primary' : ''}`}
                >
                  <Search className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Search movies & cinemas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`bg-transparent outline-none text-sm text-white placeholder-white/50 w-full transition-opacity duration-300 ${isSearchOpen ? 'opacity-100 px-2' : 'opacity-0 w-0'}`}
                  autoFocus={isSearchOpen}
                  onBlur={() => {
                    // Delay hiding so clicks on suggestions can register
                    setTimeout(() => {
                      if (!searchQuery) setIsSearchOpen(false);
                      setSuggestions([]);
                    }, 200);
                  }}
                />
              </form>
              
              {/* Search Suggestions Dropdown */}
              {isSearchOpen && suggestions.length > 0 && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-[#14161a] border border-white/10 rounded-2xl shadow-2xl py-2 z-[100] animate-in slide-in-from-top-2">
                  {suggestions.map((item, idx) => (
                    <div 
                      key={`${item.type}-${item._id || item.id}-${idx}`}
                      onClick={() => handleNavClick(null, item.link) || handleSuggestionClick(item.link)}
                      className="flex flex-col px-4 py-2 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-b-0"
                    >
                      <span className="text-white text-sm font-medium truncate">{item.title || item.name}</span>
                      <span className="text-xs text-primary">{item.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors">
                  {user?.profilePhoto ? (
                    <img src={user.profilePhoto} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-primary/50" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 text-sm font-bold">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="text-sm font-medium hidden lg:block">{user?.name?.split(' ')[0]}</span>
                </button>

                {/* Secure Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-[#14161a] border border-white/10 rounded-2xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right group-hover:translate-y-0 translate-y-2 z-50">
                  <Link to="/profile" onClick={(e) => handleNavClick(e, '/profile')} className="flex items-center w-full px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                    <User className="w-4 h-4 mr-2" /> My Profile
                  </Link>
                  <Link to="/profile" onClick={(e) => handleNavClick(e, '/profile')} className="flex items-center w-full px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                    <Ticket className="w-4 h-4 mr-2" /> My Tickets
                  </Link>
                  {(user?.role === 'admin' || user?.role === 'theater_admin') && (
                    <Link to="/admin" onClick={(e) => handleNavClick(e, '/admin')} className="flex items-center w-full px-4 py-2.5 text-sm text-primary/80 hover:text-primary hover:bg-primary/10 transition-colors">
                      <span className="w-4 h-4 mr-2">🛡️</span> Admin Portal
                    </Link>
                  )}
                  <div className="h-px bg-white/10 my-2"></div>
                  <button onClick={() => isCheckoutLocked ? setShowLeaveModal(true) : dispatch(logout())} className="flex items-center w-full px-4 py-2.5 text-sm text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                    <span className="w-4 h-4 mr-2">🚪</span> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" onClick={(e) => handleNavClick(e, '/login')} className="flex items-center space-x-2 bg-surface hover:bg-white/10 border border-white/10 rounded-full px-5 py-2.5 transition-all backdrop-blur-md">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Sign In</span>
              </Link>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex-1 flex justify-end items-center space-x-2">
            {isAuthenticated ? (
              <Link to="/profile" onClick={(e) => handleNavClick(e, '/profile')} className="flex items-center text-white/90 hover:text-white transition-colors">
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-primary/50" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 text-sm font-bold">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                )}
              </Link>
            ) : (
              <Link to="/login" onClick={(e) => handleNavClick(e, '/login')} className="flex items-center text-primary bg-surface hover:bg-white/10 border border-white/10 rounded-full p-2 transition-all">
                <User className="w-4 h-4" />
              </Link>
            )}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-base border-b border-surface backdrop-blur-2xl">
          <div className="px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={(e) => { handleNavClick(e, link.path); setIsMobileMenuOpen(false); }}
                className="block text-base font-medium text-white"
              >
                {link.name}
              </Link>
            ))}
            {isAuthenticated && (
              <>
                <div className="h-px bg-white/10 my-2"></div>
                <Link
                  to="/profile"
                  onClick={(e) => { handleNavClick(e, '/profile'); setIsMobileMenuOpen(false); }}
                  className="block text-base font-medium text-white"
                >
                  View Profile
                </Link>
                {(user?.role === 'admin' || user?.role === 'theater_admin') && (
                  <Link
                    to="/admin"
                    onClick={(e) => { handleNavClick(e, '/admin'); setIsMobileMenuOpen(false); }}
                    className="block text-base font-medium text-primary"
                  >
                    Admin Portal
                  </Link>
                )}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    isCheckoutLocked ? setShowLeaveModal(true) : dispatch(logout());
                  }}
                  className="block text-base font-medium text-red-500 w-full text-left"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <Modal 
        isOpen={showLeaveModal} 
        onClose={() => setShowLeaveModal(false)} 
        title="Leave Checkout?"
        className="max-w-md"
      >
        <div className="text-center p-4">
           <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-primary" />
           </div>
           <h3 className="text-xl font-bold text-white mb-4">Secure Lock Active</h3>
           <p className="text-muted text-sm mb-8 leading-relaxed">
             Your seats are currently locked for your booking. Leaving this page will release them to other users.
           </p>
           <div className="flex flex-col gap-3">
              <Button onClick={() => setShowLeaveModal(false)} className="w-full">
                 Stay & Complete Payment
              </Button>
              <button 
                onClick={confirmLeave} 
                className="py-3 text-xs font-black uppercase tracking-widest text-muted hover:text-white transition-colors"
              >
                 Yes, Release Seats
              </button>
           </div>
        </div>
      </Modal>
    </nav>
  );
};

export default Navbar;

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  LogOut, 
  Ticket as TicketIcon, 
  Clock, 
  MapPin, 
  ChevronRight, 
  Activity, 
  Settings, 
  Gift, 
  CreditCard, 
  ShieldCheck,
  Film,
  Image as ImageIcon,
  CheckCircle,
  X,
  Coins,
  QrCode,
  History,
  Eye,
  EyeOff,
  Menu
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { logout, login } from '../store/authSlice';
import { fetchApi } from '../services/api';

const Profile = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    profilePhotoFile: null
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [redeemableItems, setRedeemableItems] = useState([]);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userRedemptions, setUserRedemptions] = useState([]);
  const [selectedRedemption, setSelectedRedemption] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const userData = await fetchApi('/users/me');
        // Update redux with latest data
        dispatch(login(userData));
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    const fetchUserBookings = async () => {
      try {
        const userId = user?.id || user?._id;
        if (!userId) return;
        setIsLoading(true);
        const data = await fetchApi(`/bookings/user/${userId}`);
        setBookings(data);
      } catch (err) {
        console.error("Error fetching user bookings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchRedeemableItems = async () => {
      try {
        const items = await fetchApi('/users/redeemable-items');
        setRedeemableItems(items);
      } catch (err) {
        console.error("Error fetching items:", err);
      }
    };

    const fetchMyRedemptions = async () => {
      try {
        const data = await fetchApi('/users/my-redemptions');
        setUserRedemptions(data);
      } catch (err) {
        console.error("Error fetching redemptions:", err);
      }
    };

    fetchUserProfile();
    fetchUserBookings();
    fetchRedeemableItems();
    fetchMyRedemptions();
  }, [user?.id, user?._id, isAuthenticated, navigate, dispatch]);

  const handleBuyMembership = async () => {
    setIsUpdating(true);
    try {
      const data = await fetchApi('/users/membership/buy', { method: 'POST' });
      alert(data.message);
      dispatch(login({ ...user, isMember: true }));
    } catch (err) {
      alert("Membership activation failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRedeemItem = async (itemId) => {
    setIsRedeeming(true);
    try {
      const data = await fetchApi(`/users/redeem-item/${itemId}`, { method: 'POST' });
      alert(data.message);
      dispatch(login({ ...user, rewardPoints: data.user.rewardPoints }));
      // Refresh redemptions
      const updatedRedemptions = await fetchApi('/users/my-redemptions');
      setUserRedemptions(updatedRedemptions);
    } catch (err) {
      alert(err.message || "Redemption failed.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      let profilePhotoUrl = user?.profilePhoto;

      if (profileForm.profilePhotoFile) {
        const formData = new FormData();
        formData.append('image', profileForm.profilePhotoFile);
        const uploadRes = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          profilePhotoUrl = uploadData.url;
        }
      }

      const body = {};
      if (profileForm.name !== user?.name) body.name = profileForm.name;
      if (profilePhotoUrl !== user?.profilePhoto) body.profilePhoto = profilePhotoUrl;

      const data = await fetchApi('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      
      alert(data.message);
      
      // Update local storage and redux state
      dispatch(login({ ...data.user, email: user?.email }));
      setIsEditingProfile(false);
    } catch (err) {
      alert("Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return alert("Passwords do not match!");
    }
    setIsUpdating(true);
    try {
      const data = await fetchApi('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ password: passwordForm.newPassword })
      });
      alert("Password updated successfully!");
      setIsChangingPassword(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      alert("Failed to change password.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinalPurge = async () => {
    setIsUpdating(true);
    try {
      await fetchApi('/users/me', { method: 'DELETE' });
      dispatch(logout());
      navigate('/');
    } catch (err) {
      alert("CRITICAL ERROR: Failed to execute data purge. Please contact support.");
    } finally {
      setIsUpdating(false);
      setShowPurgeConfirm(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const navItems = [
    { id: 'history', label: 'Booking History', icon: <TicketIcon className="w-5 h-5" /> },
    { id: 'membership', label: 'Inner Circle', icon: <ShieldCheck className="w-5 h-5 text-primary" /> },
    { id: 'loyalty', label: 'Artifact Store', icon: <Coins className="w-5 h-5 text-secondary" /> },
    { id: 'profile', label: 'My Profile', icon: <User className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'history':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-bold font-outfit text-white mb-8">History</h2>
            
            {isLoading ? (
              <div className="w-full flex items-center justify-center p-20 bg-surface/30 rounded-[2rem] border border-white/5">
                <Activity className="w-6 h-6 animate-spin mr-3 text-primary" /> 
                <span className="text-muted tracking-widest uppercase font-bold text-sm">Syncing Ledger...</span>
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-surface/30 border border-white/5 rounded-[2rem] p-16 text-center backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <TicketIcon className="w-10 h-10 text-white/20" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 font-outfit">No Bookings Yet</h3>
                  <p className="text-muted mb-8 max-w-xs mx-auto">You haven't booked any movies with us yet.</p>
                  <Link to="/movies">
                    <Button className="h-12 px-10 shadow-[0_0_20px_rgba(244,63,94,0.3)]">Browse Movies</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {bookings.map(booking => (
                  <div key={booking._id} className="bg-surface/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl relative overflow-hidden group hover:border-primary/30 transition-all border-glow">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="w-full sm:w-28 h-40 bg-base rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-xl relative transform group-hover:scale-105 transition-transform duration-500">
                        <img src={booking.showtime?.movie?.poster} alt="poster" className="w-full h-full object-cover" />
                        {!booking.showtime?.movie?.poster && <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">No Image</div>}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-2xl font-bold font-outfit text-white group-hover:text-primary transition-colors">{booking.showtime?.movie?.title}</h3>
                            <div className="flex items-center gap-3 mt-1 underline decoration-primary/30 underline-offset-4">
                              <span className="text-xs text-primary font-bold uppercase tracking-widest">{booking.status}</span>
                              <span className="text-[10px] text-muted font-mono">{booking.bookingIdString}</span>
                            </div>
                          </div>
                          <Link to={`/ticket/${booking._id}`}>
                            <div className="w-10 h-10 rounded-full bg-white/5 hover:bg-primary/20 flex items-center justify-center text-white/40 hover:text-white transition-all">
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
                           <div className="flex items-center text-white/70">
                              <MapPin className="w-4 h-4 mr-3 text-primary" />
                              <div className="flex flex-col">
                                <span className="font-bold text-white">{booking.showtime?.theater?.name}</span>
                                <span className="text-[10px] text-muted uppercase tracking-tighter">{booking.showtime?.theater?.location}</span>
                              </div>
                           </div>
                           <div className="flex items-center text-white/70">
                              <Clock className="w-4 h-4 mr-3 text-primary" />
                              <div className="flex flex-col">
                                <span className="font-bold text-white">{booking.showtime?.date}</span>
                                <span className="text-[10px] text-muted uppercase font-black">{booking.showtime?.time}</span>
                              </div>
                           </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                              {booking.seats.map(seat => (
                                <div key={seat} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-white shadow-inner">
                                  {seat}
                                </div>
                              ))}
                            </div>
                            <Link to={`/ticket/${booking._id}`}>
                               <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em] border-b border-primary/30 pb-0.5 hover:text-white hover:border-white transition-all cursor-pointer">View Digital Ticket</span>
                            </Link>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-muted">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Booked: <span className="text-white/60 font-bold ml-1">{new Date(booking.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </span>
                            {booking.isScanned && (
                              <span className="flex items-center gap-1 text-green-400">
                                • Scanned: <span className="font-bold ml-1">{new Date(booking.scannedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'profile':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-bold font-outfit text-white mb-8">My Profile</h2>
            
            <div className="bg-surface/50 border border-white/10 rounded-[2rem] p-10 backdrop-blur-xl">
               <div className="flex flex-col md:flex-row gap-10 items-center md:items-start mb-10 pb-10 border-b border-white/10">
                  <div className="relative group">
                    <div className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center border-4 border-primary/30 shadow-[0_0_40px_rgba(244,63,94,0.2)] overflow-hidden">
                       {user?.profilePhoto ? (
                         <img src={user.profilePhoto} alt="profile" className="w-full h-full object-cover" />
                       ) : (
                         <User className="w-14 h-14 text-primary" />
                       )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-10 h-10 bg-base border border-white/10 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-primary transition-colors shadow-xl">
                       <Activity className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="text-center md:text-left pt-4">
                      <h3 className="text-3xl font-bold font-outfit text-white mb-2">{user?.name}</h3>
                     <p className="text-muted mb-4">{user?.email}</p>
                     <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        {user?.role === 'admin' && (
                          <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-primary italic">
                            Master Admin
                          </span>
                        )}
                        <span className="px-3 py-1 bg-secondary/10 border border-secondary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-secondary">
                          Level 14 member
                        </span>
                     </div>
                  </div>
               </div>

               {isEditingProfile ? (
                 <form onSubmit={handleUpdateProfile} className="animate-in fade-in zoom-in-95 duration-300" autoComplete="off">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Full Name</label>
                        <input 
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary" 
                          type="text" 
                          value={profileForm.name} 
                          onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} 
                          required 
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Communication Link (Immutable)</label>
                        <div className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-white/40 cursor-not-allowed italic text-sm">{user?.email}</div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Profile Photo</label>
                        <div className="relative flex items-center bg-black/40 border border-white/10 rounded-xl p-4 transition-all focus-within:border-primary">
                          <div className="w-full flex items-center justify-between">
                            <span className="text-white/40 text-sm truncate max-w-[250px]">{profileForm.profilePhotoFile ? profileForm.profilePhotoFile.name : 'Upload New Photo'}</span>
                            <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1 border border-white/20 rounded-lg transition-colors whitespace-nowrap">
                              Browse
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files[0]) setProfileForm({...profileForm, profilePhotoFile: e.target.files[0]}) }} />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-4">
                       <Button type="button" onClick={() => setIsEditingProfile(false)} className="px-8 h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white shadow-none">Cancel</Button>
                       <Button type="submit" disabled={isUpdating} className="px-10 h-12 shadow-[0_0_20px_rgba(244,63,94,0.3)] flex items-center gap-2">
                         {isUpdating ? <Activity className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                         Save Identity
                       </Button>
                    </div>
                 </form>
               ) : (
                 <>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted tracking-widest pl-1">Full Identity</label>
                        <div className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold">{user?.name}</div>
                      </div>
                       <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted tracking-widest pl-1">Communication Link</label>
                        <div className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold">{user?.email}</div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted tracking-widest pl-1">Mobile Nexus</label>
                        <div className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold">{user?.mobile || 'Not Linked'}</div>
                      </div>
                      {user?.role === 'admin' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-muted tracking-widest pl-1">Network Role</label>
                          <div className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold opacity-50 italic">Master Admin</div>
                        </div>
                      )}
                   </div>
                   <div className="mt-12 flex justify-end">
                      <Button onClick={() => setIsEditingProfile(true)} className="px-10 h-12 shadow-[0_0_20px_rgba(244,63,94,0.2)]">Edit Identity Profile</Button>
                   </div>
                 </>
                )}
            </div>
          </div>
        );
      case 'membership':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-full">
              <div className="mb-8 border-b border-white/5 pb-4">
                 <h3 className="text-2xl font-bold text-white font-outfit uppercase tracking-tighter">Membership Tiers</h3>
                 <p className="text-xs text-muted">Elevate your cinematic experience with premium benefits</p>
              </div>
              
              <div className={`relative overflow-hidden rounded-[3rem] border transition-all duration-700 ${user?.isMember ? 'bg-gradient-to-r from-primary/20 via-surface/40 to-secondary/10 border-primary/30 shadow-[0_0_50px_rgba(244,63,94,0.1)]' : 'bg-surface/50 border-white/10'}`}>
                 <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none"></div>
                 <div className="relative z-10 p-10 md:p-16 flex flex-col lg:flex-row items-center gap-12">
                    <div className="shrink-0">
                       <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-black/40 border border-white/10 flex items-center justify-center shadow-2xl relative group">
                          <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl group-hover:bg-primary/40 transition-all opacity-50"></div>
                          <TicketIcon className="w-16 h-16 md:w-20 md:h-20 text-primary relative z-10" />
                       </div>
                    </div>
                    
                    <div className="flex-1 text-center lg:text-left">
                       <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6">
                          Inner Circle Tier
                       </div>
                       <h3 className="text-4xl md:text-5xl font-black text-white mb-6 font-outfit tracking-tighter">Cinema Elite Access</h3>
                       <p className="text-muted text-lg max-w-2xl mb-10 leading-relaxed mx-auto lg:mx-0">
                          {user?.isMember 
                            ? 'Welcome back, Elite Member. Your premium status grants you priority access to all theaters and exclusive pricing on every ticket.' 
                            : 'Unlock the ultimate way to experience movies. Join the Inner Circle and bypass convenience fees while enjoying significant savings on every booking.'}
                       </p>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                          {[
                            { title: '10% OFF', sub: 'Every Ticket' },
                            { title: '₹0 FEES', sub: 'Convenience Free' },
                            { title: 'PRIORITY', sub: 'Early Access' }
                          ].map((perk, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                              <div className="text-xl font-black text-white mb-1">{perk.title}</div>
                              <div className="text-[9px] font-black text-primary uppercase tracking-widest">{perk.sub}</div>
                            </div>
                          ))}
                       </div>

                       {!user?.isMember ? (
                          <Button 
                            onClick={handleBuyMembership} 
                            disabled={isUpdating}
                            className="h-16 px-12 bg-primary text-white hover:bg-white hover:text-black border-none shadow-[0_20px_50px_rgba(244,63,94,0.3)] text-sm font-black uppercase tracking-[0.2em] transition-all transform hover:scale-105 active:scale-95"
                          >
                             {isUpdating ? 'Activating Protocol...' : 'Secure Membership • ₹199/mo'}
                          </Button>
                       ) : (
                          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
                             <div className="px-10 py-5 bg-primary/10 border border-primary/30 rounded-2xl text-primary font-black uppercase tracking-[0.2em] text-xs flex items-center gap-3">
                                <CheckCircle className="w-5 h-5" /> Membership Active
                             </div>
                             <div className="text-left">
                                <span className="block text-[10px] text-muted uppercase font-black tracking-widest mb-1">Valid Until</span>
                                <span className="text-white font-bold">{new Date(user.membershipExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                             </div>
                          </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        );

      case 'loyalty':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-8">
               <div>
                  <h2 className="text-3xl font-bold font-outfit text-white">Loyalty Hub</h2>
                  <p className="text-muted">Manage your membership and exchange artifacts</p>
               </div>
               <div className="bg-secondary/10 border border-secondary/20 rounded-2xl px-6 py-4 backdrop-blur-xl flex items-center gap-4 shadow-[0_0_20px_rgba(251,191,36,0.1)]">
                  <div className="p-2 bg-secondary/20 rounded-xl">
                    <Coins className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase text-secondary tracking-widest">Available Balance</span>
                    <span className="text-2xl font-black text-white">{user?.rewardPoints || 0} <span className="text-xs text-muted font-normal uppercase tracking-tighter">Pts</span></span>
                  </div>
               </div>
            </div>

            <div className="w-full">
                <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                   <div>
                      <h3 className="text-2xl font-bold text-white font-outfit uppercase tracking-tighter">Artifact Vault</h3>
                      <p className="text-xs text-muted">Exchange your earned points for exclusive artifacts</p>
                   </div>
                   <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-xl">
                      <Coins className="w-4 h-4 text-secondary" />
                      <span className="text-lg font-black text-white">{user?.rewardPoints || 0}</span>
                   </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {redeemableItems.length > 0 ? (
                      redeemableItems.map(item => (
                         <div key={item._id} className="bg-surface/40 border border-white/5 rounded-[2.5rem] p-6 hover:bg-surface/60 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors"></div>
                            <div className="flex flex-col gap-5 relative z-10">
                               <div className="w-full h-40 rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                                  {item.image ? (
                                     <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                  ) : (
                                     <div className="w-full h-full flex items-center justify-center text-white/10">
                                        <ImageIcon className="w-12 h-12" />
                                     </div>
                                  )}
                               </div>
                               <div className="flex-1 flex flex-col">
                                  <div className="flex justify-between items-start mb-2">
                                     <h4 className="font-bold text-lg text-white leading-tight">{item.name}</h4>
                                     <span className="text-[9px] font-black text-secondary px-2 py-0.5 bg-secondary/10 rounded-md border border-secondary/20 uppercase tracking-widest">{item.category}</span>
                                  </div>
                                  <p className="text-[11px] text-muted line-clamp-2 leading-relaxed mb-6">{item.description}</p>
                                  
                                  <div className="flex items-center justify-between mt-auto">
                                     <div className="flex items-center gap-1.5">
                                        <Coins className="w-4 h-4 text-secondary" />
                                        <span className="text-xl font-black text-white">{item.pointCost}</span>
                                     </div>
                                     <button 
                                        onClick={() => handleRedeemItem(item._id)}
                                        disabled={isRedeeming || (user?.rewardPoints < item.pointCost)}
                                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                           user?.rewardPoints >= item.pointCost 
                                           ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95' 
                                           : 'bg-white/5 text-white/20 border border-white/10 cursor-not-allowed'
                                        }`}
                                     >
                                        {isRedeeming ? 'Processing...' : 'Exchange'}
                                     </button>
                                  </div>
                               </div>
                            </div>
                         </div>
                      ))
                   ) : (
                      <div className="col-span-full py-20 text-center border border-dashed border-white/5 rounded-[2.5rem] bg-white/5">
                         <Clock className="w-12 h-12 text-muted/20 mx-auto mb-4" />
                         <p className="text-muted text-sm italic">The vault is currently empty. Our curators are searching for new artifacts.</p>
                      </div>
                   )}
                </div>

                {/* My Redemptions Section */}
                <div className="mt-16">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                         <History className="w-5 h-5" />
                      </div>
                      <div>
                         <h3 className="text-xl font-bold text-white font-outfit uppercase">My Redemptions</h3>
                         <p className="text-[10px] text-muted uppercase tracking-widest font-black">History of exchanged artifacts</p>
                      </div>
                   </div>

                   {userRedemptions.length > 0 ? (
                      <div className="space-y-4">
                         {userRedemptions.map(red => (
                            <div key={red._id} className="bg-surface/30 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-surface/50 transition-all group">
                               <div className="flex items-center gap-5 w-full md:w-auto">
                                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex-shrink-0">
                                     {red.item?.image ? (
                                        <img src={red.item.image} alt="" className="w-full h-full object-cover" />
                                     ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/5"><ImageIcon className="w-8 h-8" /></div>
                                     )}
                                  </div>
                                  <div>
                                     <h4 className="font-bold text-white leading-tight">{red.item?.name}</h4>
                                     <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black font-mono text-secondary tracking-widest">{red.uniqueCode}</span>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${red.isUsed ? 'bg-white/5 text-muted' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/20'}`}>
                                           {red.isUsed ? 'Redeemed' : 'Active'}
                                        </span>
                                     </div>
                                  </div>
                               </div>

                               <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                                  <div className="text-right hidden md:block">
                                     <p className="text-[10px] text-muted uppercase tracking-widest font-black">Points Spent</p>
                                     <p className="text-white font-black">{red.pointsSpent}</p>
                                  </div>
                                  {!red.isUsed && (
                                     <button 
                                        onClick={() => { setSelectedRedemption(red); setIsQrModalOpen(true); }}
                                        className="w-full md:w-auto px-6 py-3 bg-secondary/10 hover:bg-secondary text-secondary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-secondary/30 flex items-center justify-center gap-2"
                                     >
                                        <QrCode className="w-4 h-4" />
                                        Show Code
                                     </button>
                                  )}
                                  {red.isUsed && (
                                     <div className="text-[10px] text-muted italic flex items-center gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5 text-green-400" /> 
                                        Collected: <span className="text-white/60 font-bold not-italic">{new Date(red.usedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                     </div>
                                  )}
                                  <div className="text-[9px] text-muted/60 mt-1">
                                     Redeemed: {new Date(red.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="py-12 text-center border border-dashed border-white/5 rounded-[2.5rem] bg-white/5">
                         <p className="text-muted text-sm italic">You haven't redeemed any artifacts yet.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        );

      case 'settings':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-bold font-outfit text-white mb-8">Settings</h2>
            <div className="space-y-6">
               
               {/* Password Security */}
               <div className="bg-surface/50 border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                           <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                           <h4 className="font-bold text-white text-lg">Login Security</h4>
                           <p className="text-sm text-muted">Update your access credentials</p>
                        </div>
                     </div>
                     <Button 
                       variant="secondary" 
                       size="sm" 
                       onClick={() => setIsChangingPassword(!isChangingPassword)}
                       className="px-6"
                     >
                       {isChangingPassword ? 'Cancel' : 'Update Password'}
                     </Button>
                  </div>

                  {isChangingPassword && (
                    <form onSubmit={handleChangePassword} className="space-y-6 pt-4 border-t border-white/5 animate-in slide-in-from-top-4 duration-300" autoComplete="new-password">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                             <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest pl-1">New Password</label>
                             <div className="relative">
                               <input 
                                 className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-4 pr-12 text-white focus:outline-none focus:border-primary" 
                                 type={showNewPassword ? "text" : "password"} 
                                 value={passwordForm.newPassword} 
                                 onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
                                 placeholder="Min 6 characters" 
                                 required 
                                 autoComplete="new-password"
                               />
                               <button 
                                 type="button" 
                                 onClick={() => setShowNewPassword(!showNewPassword)}
                                 className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                               >
                                 {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                               </button>
                             </div>
                          </div>
                          <div>
                             <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest pl-1">Confirm Identity</label>
                             <div className="relative">
                               <input 
                                 className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-4 pr-12 text-white focus:outline-none focus:border-primary" 
                                 type={showConfirmPassword ? "text" : "password"} 
                                 value={passwordForm.confirmPassword} 
                                 onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} 
                                 placeholder="Re-type password" 
                                 required 
                                 autoComplete="new-password"
                               />
                               <button 
                                 type="button" 
                                 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                 className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                               >
                                 {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                               </button>
                             </div>
                          </div>
                       </div>
                       <div className="flex justify-end">
                          <Button type="submit" disabled={isUpdating} className="px-10 h-12 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                             {isUpdating ? 'Syncing...' : 'Lock Credentials'}
                          </Button>
                       </div>
                    </form>
                  )}
               </div>

               {/* Static Settings (Placeholders) */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Privacy Vault', sub: 'Invisibility modes', icon: <Activity /> },
                    { label: 'Notification Relay', sub: 'Cinematic alerts', icon: <Film /> },
                  ].map((item, i) => (
                    <div key={i} className="bg-surface/30 border border-white/5 rounded-[2rem] p-6 flex items-center justify-between opacity-50 cursor-not-allowed">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted">
                             {React.cloneElement(item.icon, { className: "w-5 h-5" })}
                          </div>
                          <div>
                             <h4 className="font-bold text-white text-md">{item.label}</h4>
                             <p className="text-[10px] text-muted uppercase font-black">{item.sub}</p>
                          </div>
                       </div>
                       <X className="w-4 h-4 text-muted/20" />
                    </div>
                  ))}
               </div>
               
               <div className="mt-12 pt-12 border-t border-white/10">
                  <h4 className="text-red-500 font-bold mb-6 flex items-center gap-2">
                     <LogOut className="w-5 h-5" /> Danger Zone
                  </h4>
                  <div className="bg-red-500/5 border border-red-500/20 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[60px] rounded-full pointer-events-none"></div>
                     <div className="relative z-10">
                        <div className="font-bold text-white uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                           <ShieldCheck className="w-4 h-4 text-red-500" /> Account Purge
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 font-outfit">Delete Identity</h3>
                        <p className="text-sm text-muted max-w-sm">Permanently erase your identity, booking history, and rewards. This action is irreversible.</p>
                     </div>
                     <button 
                       onClick={() => setShowPurgeConfirm(true)}
                       className="relative z-10 px-10 py-4 bg-red-500/10 hover:bg-red-500 border border-red-500 text-red-500 hover:text-white transition-all rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:shadow-red-500/30"
                     >
                        Initiate Purge
                     </button>
                  </div>
               </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full min-h-screen pt-12 pb-32 px-4 sm:px-6 lg:px-8 bg-base relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] -z-10 rounded-full"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 blur-[120px] -z-10 rounded-full"></div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
        
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden flex items-center justify-between bg-surface/30 border border-white/5 rounded-2xl p-4 backdrop-blur-3xl mb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                <User className="w-5 h-5 text-primary" />
             </div>
             <div>
                <h3 className="font-bold text-white text-sm">{user?.name}</h3>
                <p className="text-[10px] text-muted uppercase font-black tracking-wider">Verified Member</p>
             </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <aside className={`lg:w-80 shrink-0 ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
           <div className="bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-3xl sticky top-32">
              <div className="hidden lg:flex items-center gap-4 mb-10 pb-10 border-b border-white/5">
                 <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                    <User className="w-8 h-8 text-primary" />
                 </div>
                 <div>
                    <h3 className="font-bold font-outfit text-white text-xl leading-tight">{user?.name}</h3>
                    <p className="text-xs text-muted uppercase tracking-widest font-black mt-1">Verified Member</p>
                 </div>
              </div>

              <nav className="space-y-2">
                 {navItems.map(item => (
                   <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm group ${
                      activeTab === item.id 
                      ? 'bg-primary text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-105' 
                      : 'text-muted hover:bg-white/5 hover:text-white'
                    }`}
                   >
                     <div className={`${activeTab === item.id ? 'text-white' : 'text-primary opacity-50'} group-hover:scale-110 transition-transform`}>
                       {item.icon}
                     </div>
                     {item.label}
                   </button>
                 ))}
                 
                 <div className="pt-8 mt-8 border-t border-white/5">
                   <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm group"
                   >
                     <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                     Logout Identity
                   </button>
                 </div>
              </nav>
           </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 min-w-0">
           {renderContent()}
        </main>

      </div>

      {/* High Alert Purge Modal */}
      <Modal 
        isOpen={showPurgeConfirm} 
        onClose={() => setShowPurgeConfirm(false)} 
        title="SYSTEM CLEARANCE REQUIRED"
        className="max-w-md border-red-500/50"
      >
        <div className="flex flex-col items-center text-center p-4">
           <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse border border-red-500/30">
              <ShieldCheck className="w-10 h-10 text-red-500" />
           </div>
           <h3 className="text-2xl font-black font-outfit text-white mb-4 uppercase tracking-tighter">Initiate Total Purge?</h3>
           <p className="text-muted text-sm mb-8 leading-relaxed">
             This operation will permanently erase your <span className="text-white font-bold italic">Identity</span>, 
             all <span className="text-white font-bold italic">Booking Records</span>, and 
             <span className="text-white font-bold italic">Reward Points</span>. 
             This action is <span className="text-red-500 font-black underline">IRREVERSIBLE</span>.
           </p>
           
           <div className="w-full space-y-3">
              <Button 
                onClick={handleFinalPurge} 
                disabled={isUpdating}
                className="w-full h-14 bg-red-500 hover:bg-red-600 border-none shadow-[0_0_30px_rgba(239,68,68,0.4)] text-xs font-black uppercase tracking-[0.2em]"
              >
                {isUpdating ? 'Executing Purge...' : 'Confirm Destruction'}
              </Button>
              <button 
                onClick={() => setShowPurgeConfirm(false)}
                className="w-full py-4 text-xs font-bold uppercase tracking-widest text-muted hover:text-white transition-colors"
              >
                Abort Protocol
              </button>
           </div>
        </div>
      </Modal>

      {/* Redemption QR Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="VIRTUAL ARTIFACT KEY"
        className="max-w-md"
      >
        <div className="flex flex-col items-center text-center">
           <div className="relative group mb-10">
              <div className="absolute inset-0 bg-secondary/20 blur-3xl group-hover:bg-secondary/40 transition-all duration-700 rounded-full"></div>
              <div className="relative bg-white p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(251,191,36,0.2)] transform group-hover:scale-[1.02] transition-transform duration-500">
                 <QRCodeSVG 
                   value={selectedRedemption?.uniqueCode || ''} 
                   size={180}
                   level="H"
                   includeMargin={true}
                 />
              </div>
           </div>
           
           <div className="mb-8">
              <h3 className="text-2xl font-black text-white mb-2 font-outfit tracking-tighter uppercase">{selectedRedemption?.item?.name}</h3>
              <div className="flex items-center justify-center gap-2">
                 <span className="text-[10px] text-muted uppercase tracking-[0.2em] font-black">Authentication Code</span>
                 <span className="px-3 py-1 bg-secondary/10 border border-secondary/20 rounded-lg text-xs font-mono font-bold text-secondary">{selectedRedemption?.uniqueCode}</span>
              </div>
           </div>
           
           <div className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-3xl mb-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-2xl rounded-full"></div>
              <div className="flex items-start gap-4 text-left">
                 <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle className="w-4 h-4" />
                 </div>
                 <p className="text-[11px] text-muted leading-relaxed font-medium italic">
                   Present this unique holographic key to the theater concierge. 
                   Once authenticated, your artifact will be issued. 
                   <span className="block mt-1 text-emerald-400/60 font-bold uppercase tracking-tighter text-[9px] not-italic">Single-use protocol active</span>
                 </p>
              </div>
           </div>
           
           <Button 
             onClick={() => setIsQrModalOpen(false)} 
             className="w-full h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white shadow-none text-xs font-black uppercase tracking-[0.3em]"
           >
             Close Access
           </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;

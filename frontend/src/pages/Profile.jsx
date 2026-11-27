import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  LogOut,
  Ticket as TicketIcon,
  Clock,
  MapPin,
  ChevronRight,
  Settings,
  ShieldCheck,
  Image as ImageIcon,
  CheckCircle2,
  Coins,
  QrCode,
  History,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Crown,
  Trash2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LogoutModal from '../components/common/LogoutModal';
import { logout, login } from '../store/authSlice';
import { fetchApi, uploadFile } from '../services/api';
import {
  validatePasswordStrength,
  isActiveMembership,
  formatLocalDate,
} from '../utils/bookingUtils';

const Profile = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    profilePhotoFile: null,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [redeemableItems, setRedeemableItems] = useState([]);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userRedemptions, setUserRedemptions] = useState([]);
  const [selectedRedemption, setSelectedRedemption] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(
    () => localStorage.getItem('theme') === 'light'
  );
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: string }

  const handleToggleTheme = () => {
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
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const userData = await fetchApi('/users/me');
        dispatch(login(userData));
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    const fetchUserBookings = async () => {
      try {
        const userId = user?.id || user?._id;
        if (!userId) return;
        setIsLoading(true);
        const data = await fetchApi(`/bookings/user/${userId}`);
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching user bookings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchRedeemableItems = async () => {
      try {
        const items = await fetchApi('/users/redeemable-items');
        setRedeemableItems(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error('Error fetching items:', err);
      }
    };

    const fetchMyRedemptions = async () => {
      try {
        const data = await fetchApi('/users/my-redemptions');
        setUserRedemptions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching redemptions:', err);
      }
    };

    fetchUserProfile();
    fetchUserBookings();
    fetchRedeemableItems();
    fetchMyRedemptions();
  }, [user?.id, user?._id, isAuthenticated, navigate, dispatch]);

  const { upcomingBookings, pastBookings } = useMemo(() => {
    const todayStr = formatLocalDate(new Date());
    const upcoming = [];
    const past = [];
    bookings.forEach((b) => {
      const showDate = b.showtime?.date;
      if (b.status === 'Confirmed' && showDate && showDate >= todayStr) {
        upcoming.push(b);
      } else {
        past.push(b);
      }
    });
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [bookings]);

  const handleBuyMembership = async () => {
    setFeedback(null);
    setIsUpdating(true);
    try {
      const data = await fetchApi('/users/membership/buy', { method: 'POST' });
      dispatch(login({ ...user, ...data.user }));
      setFeedback({ type: 'success', text: data.message || 'Inner Circle membership activated!' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Membership activation failed.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRedeemItem = async (itemId) => {
    setFeedback(null);
    setIsRedeeming(true);
    try {
      const data = await fetchApi(`/users/redeem-item/${itemId}`, { method: 'POST' });
      dispatch(login({ ...user, ...data.user }));
      const updatedRedemptions = await fetchApi('/users/my-redemptions');
      setUserRedemptions(Array.isArray(updatedRedemptions) ? updatedRedemptions : []);
      setFeedback({ type: 'success', text: data.message || 'Reward redeemed! Open QR below.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Redemption failed.' });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setIsUpdating(true);
    try {
      let profilePhotoUrl = user?.profilePhoto;

      if (profileForm.profilePhotoFile) {
        const uploadData = await uploadFile(profileForm.profilePhotoFile);
        if (uploadData.url) {
          profilePhotoUrl = uploadData.url;
        }
      }

      const body = {};
      if (profileForm.name !== user?.name) body.name = profileForm.name;
      if (profilePhotoUrl !== user?.profilePhoto) body.profilePhoto = profilePhotoUrl;

      const data = await fetchApi('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      dispatch(login({ ...user, ...data.user }));
      setIsEditingProfile(false);
      setProfileForm({
        name: data.user?.name || profileForm.name,
        profilePhotoFile: null,
      });
      setFeedback({ type: 'success', text: data.message || 'Profile updated.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setFeedback(null);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFeedback({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (!validatePasswordStrength(passwordForm.newPassword)) {
      setFeedback({
        type: 'error',
        text: 'Password must be 6+ characters with 1 uppercase letter, 1 symbol, and 1 number.',
      });
      return;
    }
    setIsUpdating(true);
    try {
      await fetchApi('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ password: passwordForm.newPassword }),
      });
      setIsChangingPassword(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setFeedback({ type: 'success', text: 'Password changed successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update password.' });
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
      setFeedback({ type: 'error', text: err.message || 'Failed to delete account.' });
    } finally {
      setIsUpdating(false);
      setShowPurgeConfirm(false);
    }
  };

  const navItems = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'history', label: 'Booking History', icon: TicketIcon },
    { id: 'membership', label: 'Inner Circle', icon: Crown },
    { id: 'loyalty', label: 'Rewards Store', icon: Coins },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderBookingCard = (booking) => {
    const isConfirmed = booking.status === 'Confirmed';
    const statusColor = isConfirmed
      ? 'var(--mg-success)'
      : booking.status === 'Pending'
        ? 'var(--mg-warning)'
        : 'var(--mg-danger)';
    const statusBg = isConfirmed
      ? 'var(--mg-success-soft)'
      : booking.status === 'Pending'
        ? 'var(--mg-warning-soft)'
        : 'var(--mg-danger-soft)';

    return (
      <div
        key={booking._id}
        className="rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 transition-colors"
        style={{
          backgroundColor: 'var(--mg-surface)',
          borderColor: 'var(--mg-border)',
        }}
      >
        <div
          className="w-20 aspect-[2/3] rounded-lg overflow-hidden shrink-0 border"
          style={{ borderColor: 'var(--mg-border)', backgroundColor: 'var(--mg-surface-2)' }}
        >
          {booking.showtime?.movie?.poster ? (
            <img
              src={booking.showtime.movie.poster}
              alt={booking.showtime?.movie?.title || 'Movie poster'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: 'var(--mg-ink-3)' }}>
              No Poster
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span
                  className="px-2 py-0.5 rounded text-[11px] font-bold uppercase"
                  style={{ backgroundColor: statusBg, color: statusColor }}
                >
                  {booking.status}
                </span>
                <span className="text-xs font-mono" style={{ color: 'var(--mg-ink-3)' }}>
                  {booking.bookingIdString}
                </span>
              </div>
              <h4 className="text-lg font-display font-bold truncate" style={{ color: 'var(--mg-ink)' }}>
                {booking.showtime?.movie?.title || 'Cinema Screening'}
              </h4>
            </div>

            {isConfirmed ? (
              <Link
                to={`/ticket/${booking._id}`}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: 'var(--mg-surface-2)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-ink)',
                }}
              >
                View Pass
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span
                className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold border"
                style={{
                  backgroundColor: statusBg,
                  borderColor: statusColor,
                  color: statusColor,
                }}
              >
                {booking.status === 'Cancelled'
                  ? 'Ticket Cancelled'
                  : booking.status === 'Pending'
                    ? 'Incomplete'
                    : 'Failed to Book'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" style={{ color: 'var(--mg-ink-2)' }}>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--mg-accent)' }} />
              <span className="truncate font-medium" style={{ color: 'var(--mg-ink)' }}>
                {booking.showtime?.theater?.name || 'Cinema Venue'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--mg-accent)' }} />
              <span>
                {booking.showtime?.date} • <strong className="font-mono">{booking.showtime?.time}</strong>
              </span>
            </div>
          </div>

          <div
            className="pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs"
            style={{ borderColor: 'var(--mg-border)' }}
          >
            {isConfirmed ? (
              <div className="flex flex-wrap gap-1.5">
                {booking.seats?.map((seat) => (
                  <span
                    key={seat}
                    className="px-2 py-0.5 rounded font-mono font-semibold border"
                    style={{
                      backgroundColor: 'var(--mg-surface-2)',
                      borderColor: 'var(--mg-border)',
                      color: 'var(--mg-ink)',
                    }}
                  >
                    {seat}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium" style={{ color: statusColor }}>
                  {booking.status === 'Cancelled'
                    ? 'Ticket cancelled • Not valid for entry'
                    : booking.status === 'Pending'
                      ? 'Payment not completed • No ticket issued'
                      : 'Booking failed • Payment did not complete (no pass issued)'}
                </span>
                {booking.showtime?.movie?._id && (
                  <Link
                    to={`/theaters/${booking.showtime.movie._id}`}
                    className="font-semibold hover:underline"
                    style={{ color: 'var(--mg-accent)' }}
                  >
                    Book Again
                  </Link>
                )}
              </div>
            )}
            <div className="flex items-center gap-3" style={{ color: 'var(--mg-ink-3)' }}>
              <span>
                {isConfirmed ? 'Booked' : 'Attempted'}{' '}
                {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
              {isConfirmed && booking.isScanned && (
                <span className="font-semibold" style={{ color: 'var(--mg-success)' }}>
                  • Scanned {new Date(booking.scannedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                My Profile
              </h2>
              <Button
                variant={isEditingProfile ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => {
                  setProfileForm({ name: user?.name || '', profilePhotoFile: null });
                  setIsEditingProfile((v) => !v);
                }}
              >
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>

            <div
              className="rounded-xl border p-6 sm:p-8"
              style={{
                backgroundColor: 'var(--mg-surface)',
                borderColor: 'var(--mg-border)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b" style={{ borderColor: 'var(--mg-border)' }}>
                <div
                  className="w-24 h-24 rounded-full overflow-hidden border flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'var(--mg-surface-2)',
                    borderColor: 'var(--mg-border-strong)',
                  }}
                >
                  {user?.profilePhoto ? (
                    <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10" style={{ color: 'var(--mg-ink-3)' }} />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-2xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                      {user?.name}
                    </h3>
                    {isActiveMembership(user) && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: 'var(--mg-gold-soft)',
                          color: 'var(--mg-gold)',
                        }}
                      >
                        <Crown className="w-3 h-3" />
                        Inner Circle
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--mg-ink-2)' }}>{user?.email}</p>
                  {user?.mobile && (
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--mg-ink-3)' }}>
                      {user.mobile}
                    </p>
                  )}
                </div>
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleUpdateProfile} className="pt-6 space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                      Display Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                      Update Profile Photo
                    </label>
                    <label
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-dashed cursor-pointer text-xs"
                      style={{
                        backgroundColor: 'var(--mg-input-bg)',
                        borderColor: 'var(--mg-border-strong)',
                        color: 'var(--mg-ink-2)',
                      }}
                    >
                      <ImageIcon className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {profileForm.profilePhotoFile
                          ? profileForm.profilePhotoFile.name
                          : 'Select a new image file'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            profilePhotoFile: e.target.files?.[0] || null,
                          })
                        }
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <Button type="submit" isLoading={isUpdating}>
                    Save Changes
                  </Button>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                  <div
                    className="p-4 rounded-xl border"
                    style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}
                  >
                    <p className="text-xs font-medium" style={{ color: 'var(--mg-ink-3)' }}>Total Bookings</p>
                    <p className="text-2xl font-display font-bold mt-1" style={{ color: 'var(--mg-ink)' }}>
                      {bookings.length}
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-xl border"
                    style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}
                  >
                    <p className="text-xs font-medium" style={{ color: 'var(--mg-ink-3)' }}>Reward Points</p>
                    <p className="text-2xl font-display font-bold mt-1" style={{ color: 'var(--mg-gold)' }}>
                      {user?.rewardPoints || 0}
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-xl border"
                    style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}
                  >
                    <p className="text-xs font-medium" style={{ color: 'var(--mg-ink-3)' }}>Membership Status</p>
                    <p className="text-base font-display font-bold mt-2" style={{ color: 'var(--mg-ink)' }}>
                      {isActiveMembership(user) ? 'Inner Circle Active' : 'Standard Member'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
              Booking History
            </h2>

            {isLoading ? (
              <div
                className="rounded-xl border p-12 flex items-center justify-center gap-3"
                style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
              >
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--mg-accent)' }} />
                <span className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>Loading your bookings...</span>
              </div>
            ) : bookings.length === 0 ? (
              <div
                className="rounded-xl border border-dashed p-12 text-center"
                style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border-strong)' }}
              >
                <TicketIcon className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--mg-ink-3)' }} />
                <h3 className="text-lg font-display font-bold mb-1" style={{ color: 'var(--mg-ink)' }}>
                  No Bookings Yet
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--mg-ink-2)' }}>
                  Your upcoming and past movie tickets will appear here once booked.
                </p>
                <Link to="/movies">
                  <Button>Browse Movies</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {upcomingBookings.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--mg-ink-2)' }}>
                      Upcoming Shows ({upcomingBookings.length})
                    </h3>
                    <div className="space-y-4">{upcomingBookings.map(renderBookingCard)}</div>
                  </section>
                )}

                {pastBookings.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--mg-ink-3)' }}>
                      Previous Bookings ({pastBookings.length})
                    </h3>
                    <div className="space-y-4">{pastBookings.map(renderBookingCard)}</div>
                  </section>
                )}
              </div>
            )}
          </div>
        );

      case 'membership':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
              Inner Circle Membership
            </h2>

            <div
              className="rounded-xl border p-6 sm:p-8"
              style={{
                backgroundColor: 'var(--mg-surface)',
                borderColor: isActiveMembership(user) ? 'var(--mg-gold)' : 'var(--mg-border)',
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--mg-gold-soft)',
                      color: 'var(--mg-gold)',
                    }}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    Inner Circle Pass
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                    Save on every booking you make
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
                    {isActiveMembership(user)
                      ? 'Your Inner Circle pass is active. Convenience fees are waived and 10% savings apply automatically at checkout.'
                      : 'Unlock zero convenience fees and an instant 10% ticket discount across all MoviGo partner cinemas.'}
                  </p>
                </div>

                <div className="shrink-0">
                  {!isActiveMembership(user) ? (
                    <Button size="lg" onClick={handleBuyMembership} isLoading={isUpdating}>
                      Activate • ₹199 / month
                    </Button>
                  ) : (
                    <div
                      className="px-5 py-3.5 rounded-xl border text-sm"
                      style={{
                        backgroundColor: 'var(--mg-success-soft)',
                        borderColor: 'var(--mg-success)',
                        color: 'var(--mg-success)',
                      }}
                    >
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        Membership Active
                      </div>
                      {user?.membershipExpiry && (
                        <p className="text-xs mt-1" style={{ color: 'var(--mg-ink)' }}>
                          Valid until{' '}
                          {new Date(user.membershipExpiry).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t" style={{ borderColor: 'var(--mg-border)' }}>
                {[
                  { title: '10% Discount', desc: 'Automatic off seat subtotal' },
                  { title: '₹0 Booking Fee', desc: 'Save ₹45 per ticket' },
                  { title: 'Priority Access', desc: 'Early access to big releases' },
                ].map((perk) => (
                  <div
                    key={perk.title}
                    className="p-4 rounded-xl border"
                    style={{
                      backgroundColor: 'var(--mg-surface-2)',
                      borderColor: 'var(--mg-border)',
                    }}
                  >
                    <p className="font-display font-bold text-base" style={{ color: 'var(--mg-ink)' }}>
                      {perk.title}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--mg-ink-2)' }}>
                      {perk.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'loyalty':
        return (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                  Rewards Store
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
                  Exchange your booking points for snacks, vouchers, and perks.
                </p>
              </div>
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border"
                style={{
                  backgroundColor: 'var(--mg-gold-soft)',
                  borderColor: 'var(--mg-gold)',
                }}
              >
                <Coins className="w-5 h-5" style={{ color: 'var(--mg-gold)' }} />
                <div>
                  <span className="block text-[10px] font-bold uppercase" style={{ color: 'var(--mg-gold)' }}>
                    Points Balance
                  </span>
                  <span className="text-lg font-mono font-bold" style={{ color: 'var(--mg-ink)' }}>
                    {user?.rewardPoints || 0} Pts
                  </span>
                </div>
              </div>
            </div>

            {redeemableItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {redeemableItems.map((item) => {
                  const canAfford = (user?.rewardPoints || 0) >= item.pointCost;
                  return (
                    <div
                      key={item._id}
                      className="rounded-xl border overflow-hidden flex flex-col"
                      style={{
                        backgroundColor: 'var(--mg-surface)',
                        borderColor: 'var(--mg-border)',
                      }}
                    >
                      <div className="aspect-[16/10] overflow-hidden border-b" style={{ borderColor: 'var(--mg-border)', backgroundColor: 'var(--mg-surface-2)' }}>
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8" style={{ color: 'var(--mg-ink-3)' }} />
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-display font-bold text-base" style={{ color: 'var(--mg-ink)' }}>
                            {item.name}
                          </h3>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-semibold shrink-0"
                            style={{ backgroundColor: 'var(--mg-surface-2)', color: 'var(--mg-ink-2)' }}
                          >
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs line-clamp-2 mb-4" style={{ color: 'var(--mg-ink-2)' }}>
                          {item.description}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: 'var(--mg-border)' }}>
                          <span className="font-mono font-bold text-sm flex items-center gap-1" style={{ color: 'var(--mg-gold)' }}>
                            <Coins className="w-4 h-4" />
                            {item.pointCost}
                          </span>
                          <Button
                            size="sm"
                            variant={canAfford ? 'primary' : 'outline'}
                            disabled={!canAfford || isRedeeming}
                            onClick={() => handleRedeemItem(item._id)}
                          >
                            {isRedeeming ? 'Redeeming...' : 'Redeem'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="rounded-xl border border-dashed p-12 text-center"
                style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border-strong)' }}
              >
                <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
                  No reward items are currently available. Check back soon.
                </p>
              </div>
            )}

            {/* My Redemptions */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
                <h3 className="text-lg font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                  My Redemptions
                </h3>
              </div>

              {userRedemptions.length > 0 ? (
                <div className="space-y-3">
                  {userRedemptions.map((red) => (
                    <div
                      key={red._id}
                      className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      style={{
                        backgroundColor: 'var(--mg-surface)',
                        borderColor: 'var(--mg-border)',
                      }}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-12 h-12 rounded-lg overflow-hidden border shrink-0"
                          style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}
                        >
                          {red.item?.image ? (
                            <img src={red.item.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-5 h-5" style={{ color: 'var(--mg-ink-3)' }} />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-sm" style={{ color: 'var(--mg-ink)' }}>
                            {red.item?.name || 'Reward Voucher'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                            <span className="font-mono font-semibold" style={{ color: 'var(--mg-gold)' }}>
                              {red.uniqueCode}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                              style={{
                                backgroundColor: red.isUsed ? 'var(--mg-surface-2)' : 'var(--mg-success-soft)',
                                color: red.isUsed ? 'var(--mg-ink-3)' : 'var(--mg-success)',
                              }}
                            >
                              {red.isUsed ? 'Used' : 'Active'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>
                          {red.isUsed && red.usedAt
                            ? `Collected ${new Date(red.usedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                            : `${red.pointsSpent} Pts • ${new Date(red.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                        </div>
                        {!red.isUsed && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedRedemption(red);
                              setIsQrModalOpen(true);
                            }}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            Show QR
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--mg-ink-3)' }}>
                  You haven&apos;t redeemed any rewards yet.
                </p>
              )}
            </section>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
              Account Settings
            </h2>

            {/* Appearance */}
            <div
              className="rounded-xl border p-5 sm:p-6 flex items-center justify-between gap-4"
              style={{
                backgroundColor: 'var(--mg-surface)',
                borderColor: 'var(--mg-border)',
              }}
            >
              <div>
                <h3 className="font-display font-bold text-base" style={{ color: 'var(--mg-ink)' }}>
                  Display Theme
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
                  Switch between dark cinema mode and light editorial mode.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleToggleTheme}>
                {isLightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isLightMode ? 'Light Mode' : 'Dark Mode'}
              </Button>
            </div>

            {/* Password Update */}
            <div
              className="rounded-xl border p-5 sm:p-6"
              style={{
                backgroundColor: 'var(--mg-surface)',
                borderColor: 'var(--mg-border)',
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-base" style={{ color: 'var(--mg-ink)' }}>
                    Password &amp; Security
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
                    Update your sign-in password at any time.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangingPassword((v) => !v)}
                >
                  {isChangingPassword ? 'Cancel' : 'Change Password'}
                </Button>
              </div>

              {isChangingPassword && (
                <form onSubmit={handleChangePassword} className="mt-5 pt-5 border-t space-y-4 max-w-md" style={{ borderColor: 'var(--mg-border)' }}>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="6+ chars with symbol & uppercase"
                        className="mg-input w-full pl-3.5 pr-10 py-2.5 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                        style={{ color: 'var(--mg-ink-3)' }}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        placeholder="Repeat new password"
                        className="mg-input w-full pl-3.5 pr-10 py-2.5 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                        style={{ color: 'var(--mg-ink-3)' }}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" isLoading={isUpdating}>
                    Update Password
                  </Button>
                </form>
              )}
            </div>

            {/* Delete Account */}
            <div
              className="rounded-xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{
                backgroundColor: 'var(--mg-danger-soft)',
                borderColor: 'var(--mg-danger)',
              }}
            >
              <div>
                <h3 className="font-display font-bold text-base" style={{ color: 'var(--mg-danger)' }}>
                  Delete Account
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
                  Permanently remove your profile, booking records, and unused points.
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => setShowPurgeConfirm(true)}>
                <Trash2 className="w-4 h-4" />
                Delete Account
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-24">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className="mb-6 px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between gap-3"
          style={{
            backgroundColor:
              feedback.type === 'success' ? 'var(--mg-success-soft)' : 'var(--mg-danger-soft)',
            borderColor:
              feedback.type === 'success' ? 'var(--mg-success)' : 'var(--mg-danger)',
            color:
              feedback.type === 'success' ? 'var(--mg-success)' : 'var(--mg-danger)',
          }}
        >
          <span className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {feedback.text}
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 cursor-pointer"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Tab Strip */}
      <div className="lg:hidden mb-6 flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
        {navItems.map((item) => {
          const IconComp = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setFeedback(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0"
              style={{
                backgroundColor: active ? 'var(--mg-accent)' : 'var(--mg-surface)',
                borderColor: active ? 'var(--mg-accent)' : 'var(--mg-border)',
                color: active ? '#ffffff' : 'var(--mg-ink-2)',
              }}
            >
              <IconComp className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0"
          style={{
            backgroundColor: 'var(--mg-danger-soft)',
            borderColor: 'var(--mg-danger)',
            color: 'var(--mg-danger)',
          }}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-24">
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: 'var(--mg-surface)',
              borderColor: 'var(--mg-border)',
            }}
          >
            <div className="flex items-center gap-3 p-2 mb-4 pb-4 border-b" style={{ borderColor: 'var(--mg-border)' }}>
              <div
                className="w-11 h-11 rounded-full overflow-hidden border flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}
              >
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5" style={{ color: 'var(--mg-ink-3)' }} />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm truncate" style={{ color: 'var(--mg-ink)' }}>
                  {user?.name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--mg-ink-3)' }}>
                  {user?.email}
                </p>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const IconComp = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setFeedback(null);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--mg-accent-soft)' : 'transparent',
                      color: active ? 'var(--mg-accent)' : 'var(--mg-ink-2)',
                    }}
                  >
                    <IconComp className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--mg-border)' }}>
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                  style={{ color: 'var(--mg-danger)' }}
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Panel */}
        <main className="lg:col-span-9 min-w-0">{renderContent()}</main>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showPurgeConfirm}
        onClose={() => setShowPurgeConfirm(false)}
        title="Delete Account"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" style={{ color: 'var(--mg-danger)' }} />
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
              Deleting your account permanently removes your profile, booking records, and accumulated reward points. This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowPurgeConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleFinalPurge} isLoading={isUpdating}>
              Confirm Deletion
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reward QR Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Reward Pass"
        className="max-w-sm"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="bg-white p-4 rounded-xl border" style={{ borderColor: 'var(--mg-border)' }}>
            <QRCodeSVG
              value={selectedRedemption?.uniqueCode || ''}
              size={180}
              level="H"
              includeMargin={true}
            />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg" style={{ color: 'var(--mg-ink)' }}>
              {selectedRedemption?.item?.name}
            </h3>
            <p className="font-mono text-sm font-bold mt-1" style={{ color: 'var(--mg-gold)' }}>
              {selectedRedemption?.uniqueCode}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--mg-ink-2)' }}>
              Show this code at the cinema concession desk to claim your item. Single-use voucher.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setIsQrModalOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
};

export default Profile;

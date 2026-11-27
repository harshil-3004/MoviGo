import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Mail,
  Lock,
  LogIn,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Film,
  Ticket,
  Sparkles,
} from 'lucide-react';
import Button from '../components/common/Button';
import { login } from '../store/authSlice';
import { fetchApi } from '../services/api';
import { validatePasswordStrength } from '../utils/bookingUtils';

const OTP_LENGTH = 6;

const OtpInputGroup = ({ otp, setOtp, disabled }) => {
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex gap-2 sm:gap-2.5 justify-center">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          aria-label={`Verification digit ${index + 1}`}
          className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg font-mono font-bold rounded-lg border transition-colors focus:outline-none disabled:opacity-50"
          style={{
            backgroundColor: digit ? 'var(--mg-accent-soft)' : 'var(--mg-input-bg)',
            borderColor: digit ? 'var(--mg-accent)' : 'var(--mg-border-strong)',
            color: 'var(--mg-ink)',
          }}
        />
      ))}
    </div>
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiMessage, setApiMessage] = useState('');

  // Forgot password steps: 0 = login, 1 = enter email, 2 = verify OTP, 3 = new password
  const [forgotStep, setForgotStep] = useState(0);
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [passwordError, setPasswordError] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setApiError('');
    setApiMessage('');
    setIsLoading(true);

    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      dispatch(
        login({
          ...data.user,
          email: data.user?.email || email,
          token: data.token,
        })
      );
      navigate(location.state?.from || '/');
    } catch (err) {
      setApiError(err.message || 'Sign in failed. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setApiError('Please enter your registered email address.');
      return;
    }
    setApiError('');
    setIsSendingOtp(true);
    try {
      await fetchApi('/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, purpose: 'reset' }),
      });
      setForgotStep(2);
      setCooldown(60);
    } catch (err) {
      setApiError(err.message || 'Failed to send reset code');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      setApiError('Please enter the complete 6-digit code.');
      return;
    }
    setApiError('');
    setIsLoading(true);
    try {
      await fetchApi('/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, otp: otpString, purpose: 'reset' }),
      });
      setForgotStep(3);
    } catch (err) {
      setApiError(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setApiError('');
    setPasswordError('');

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    if (!validatePasswordStrength(newPassword)) {
      setPasswordError(
        'Password must be at least 6 characters and include 1 uppercase letter, 1 symbol, and 1 number.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, newPassword, otp: otp.join('') }),
      });
      setApiMessage(data.message || 'Password updated. You can now sign in.');
      setForgotStep(0);
      setNewPassword('');
      setConfirmNewPassword('');
      setOtp(Array(OTP_LENGTH).fill(''));
      setResetEmail('');
    } catch (err) {
      setApiError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setApiError('');
    setIsSendingOtp(true);
    try {
      await fetchApi('/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, purpose: 'reset' }),
      });
      setOtp(Array(OTP_LENGTH).fill(''));
      setCooldown(60);
    } catch (err) {
      setApiError(err.message || 'Failed to resend code');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const resetForgotFlow = () => {
    setForgotStep(0);
    setResetEmail('');
    setOtp(Array(OTP_LENGTH).fill(''));
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError('');
    setApiError('');
  };

  const headingTitle =
    forgotStep === 0
      ? 'Sign in to MoviGo'
      : forgotStep === 1
        ? 'Reset your password'
        : forgotStep === 2
          ? 'Verify your email'
          : 'Create new password';

  const headingSubtitle =
    forgotStep === 0
      ? 'Book seats faster and keep all your cinema tickets in one place.'
      : forgotStep === 1
        ? 'Enter your account email and we will send a 6-digit verification code.'
        : forgotStep === 2
          ? `Enter the 6-digit code sent to ${resetEmail}.`
          : 'Choose a strong password to protect your account.';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div
        className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--mg-surface)',
          borderColor: 'var(--mg-border)',
          boxShadow: 'var(--mg-shadow-md)',
        }}
      >
        {/* Left Editorial Panel (Desktop) */}
        <div
          className="hidden lg:flex lg:col-span-5 flex-col justify-between p-10 border-r"
          style={{
            backgroundColor: 'var(--mg-surface-2)',
            borderColor: 'var(--mg-border)',
          }}
        >
          <div>
            <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-xl" style={{ color: 'var(--mg-ink)' }}>
              <Film className="w-5 h-5" style={{ color: 'var(--mg-accent)' }} />
              MoviGo
            </Link>
            <h2 className="text-2xl font-display font-bold mt-8 mb-3 leading-snug" style={{ color: 'var(--mg-ink)' }}>
              Your cinema nights, effortlessly organized.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
              Sign in to access digital QR passes, track rewards points, and enjoy Inner Circle booking perks.
            </p>
          </div>

          <div className="space-y-4 pt-8">
            <div className="flex items-start gap-3">
              <Ticket className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--mg-accent)' }} />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
                Instant seat selection, live screen layouts, and downloadable PDF tickets.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--mg-gold)' }} />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
                Earn loyalty points on bookings and unlock Inner Circle savings.
              </p>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-6 sm:p-10 md:p-12">
          <div className="max-w-md mx-auto">
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                {headingTitle}
              </h1>
              <p className="text-sm mt-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                {headingSubtitle}
              </p>
            </div>

            {apiMessage && (
              <div
                className="mb-5 px-4 py-3 rounded-lg border text-sm font-medium flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--mg-success-soft)',
                  borderColor: 'var(--mg-success)',
                  color: 'var(--mg-success)',
                }}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{apiMessage}</span>
              </div>
            )}

            {apiError && (
              <div
                className="mb-5 px-4 py-3 rounded-lg border text-sm font-medium flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--mg-danger-soft)',
                  borderColor: 'var(--mg-danger)',
                  color: 'var(--mg-danger)',
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {forgotStep === 0 && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mg-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'var(--mg-ink-2)' }}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        setApiError('');
                        setApiMessage('');
                      }}
                      className="text-xs font-semibold hover:underline cursor-pointer"
                      style={{ color: 'var(--mg-accent)' }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="mg-input w-full pl-10 pr-10 py-2.5 rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                      style={{ color: 'var(--mg-ink-3)' }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full mt-2" isLoading={isLoading}>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </form>
            )}

            {forgotStep === 1 && (
              <form onSubmit={handleSendResetOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                    Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mg-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" isLoading={isSendingOtp}>
                  Send Verification Code
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <button
                  type="button"
                  onClick={resetForgotFlow}
                  className="w-full text-center text-xs font-semibold py-2 cursor-pointer hover:underline"
                  style={{ color: 'var(--mg-ink-2)' }}
                >
                  Back to Sign In
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyResetOtp} className="space-y-5">
                <OtpInputGroup otp={otp} setOtp={setOtp} disabled={isLoading} />

                <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
                  <ShieldCheck className="w-4 h-4" />
                  Verify Code
                </Button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={cooldown > 0 || isSendingOtp}
                    className="font-semibold cursor-pointer disabled:opacity-50 hover:underline"
                    style={{ color: 'var(--mg-accent)' }}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForgotFlow}
                    className="font-semibold cursor-pointer hover:underline"
                    style={{ color: 'var(--mg-ink-2)' }}
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                      }}
                      placeholder="Create a strong password"
                      className="mg-input w-full pl-10 pr-10 py-2.5 rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
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
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => {
                        setConfirmNewPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                      }}
                      placeholder="Re-enter password"
                      className="mg-input w-full pl-10 pr-10 py-2.5 rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword((v) => !v)}
                      aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                      style={{ color: 'var(--mg-ink-3)' }}
                    >
                      {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <p className="text-xs font-medium" style={{ color: 'var(--mg-danger)' }}>
                    {passwordError}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
                  Update Password
                </Button>

                <button
                  type="button"
                  onClick={resetForgotFlow}
                  className="w-full text-center text-xs font-semibold py-2 cursor-pointer hover:underline"
                  style={{ color: 'var(--mg-ink-2)' }}
                >
                  Cancel
                </button>
              </form>
            )}

            <div className="mt-7 pt-6 border-t text-center text-sm" style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-ink-2)' }}>
              New to MoviGo?{' '}
              <Link
                to="/register"
                state={location.state}
                className="font-semibold hover:underline"
                style={{ color: 'var(--mg-accent)' }}
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

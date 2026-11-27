import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Mail,
  Lock,
  User,
  Phone,
  Image as ImageIcon,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Film,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import Button from '../components/common/Button';
import { login } from '../store/authSlice';
import { fetchApi, uploadFile } from '../services/api';
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
          aria-label={`OTP digit ${index + 1}`}
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

const Register = () => {
  const [step, setStep] = useState(1); // 1: Form, 2: OTP verify
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [apiError, setApiError] = useState('');
  const [cooldown, setCooldown] = useState(0);

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

  const handlePasswordBlur = () => {
    if (!password) return;
    if (!validatePasswordStrength(password)) {
      setPasswordError(
        'Password must be at least 6 characters, with 1 uppercase letter, 1 symbol, and 1 number.'
      );
    } else {
      setPasswordError('');
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setApiError('');
    setPasswordError('');

    if (!name || !email || !mobile || !password || !confirmPassword) {
      setApiError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (!validatePasswordStrength(password)) {
      setPasswordError(
        'Password must be at least 6 characters, with 1 uppercase letter, 1 symbol, and 1 number.'
      );
      return;
    }

    setIsSendingOtp(true);
    try {
      await fetchApi('/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email, purpose: 'registration' }),
      });
      setStep(2);
      setCooldown(60);
    } catch (err) {
      setApiError(err.message || 'Failed to send verification code');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setApiError('');
    setIsSendingOtp(true);
    try {
      await fetchApi('/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email, purpose: 'registration' }),
      });
      setOtp(Array(OTP_LENGTH).fill(''));
      setCooldown(60);
    } catch (err) {
      setApiError(err.message || 'Failed to resend code');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      setApiError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      const data = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, mobile, password, otp: otpString }),
      });

      let finalUser = data.user;

      if (profilePhotoFile && data.token) {
        try {
          const uploadData = await uploadFile(profilePhotoFile, data.token);
          if (uploadData.url) {
            const profileRes = await fetch('/api/users/profile', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.token}`,
              },
              body: JSON.stringify({ profilePhoto: uploadData.url }),
            });
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              finalUser = profileData.user || { ...finalUser, profilePhoto: uploadData.url };
            }
          }
        } catch (uploadErr) {
          console.warn('Optional profile photo upload failed:', uploadErr);
        }
      }

      dispatch(login({ ...finalUser, token: data.token }));
      navigate(location.state?.from || '/');
    } catch (err) {
      setApiError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

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
              Join MoviGo in under a minute.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
              Create a verified account to book seats across partner cinemas, save payment preferences, and earn loyalty rewards.
            </p>
          </div>

          <div className="space-y-3 pt-8 text-xs" style={{ color: 'var(--mg-ink-2)' }}>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-success)' }} />
              <span>Instant digital QR pass &amp; PDF downloads</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-success)' }} />
              <span>Waitlist alerts &amp; early Inner Circle booking access</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-success)' }} />
              <span>Zero spam — email verification only</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-6 sm:p-10 md:p-12">
          <div className="max-w-md mx-auto">
            <div className="mb-7">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setApiError('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold mb-3 cursor-pointer hover:underline"
                  style={{ color: 'var(--mg-ink-2)' }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Edit details
                </button>
              )}
              <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                {step === 1 ? 'Create your account' : 'Verify your email'}
              </h1>
              <p className="text-sm mt-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                {step === 1
                  ? 'Fill in your details below to receive a 6-digit verification code.'
                  : `Enter the 6-digit code sent to ${email}.`}
              </p>
            </div>

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

            {step === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Riya Sharma"
                      className="mg-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="mg-input w-full pl-10 pr-3 py-2.5 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
                      <input
                        type="tel"
                        required
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="mg-input w-full pl-10 pr-3 py-2.5 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        onBlur={handlePasswordBlur}
                        placeholder="Min 6 chars"
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

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        placeholder="Repeat password"
                        className="mg-input w-full pl-10 pr-10 py-2.5 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                        style={{ color: 'var(--mg-ink-3)' }}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[11px]" style={{ color: 'var(--mg-ink-3)' }}>
                  Must contain 6+ characters with at least 1 uppercase letter, 1 number, and 1 special symbol.
                </p>

                {passwordError && (
                  <p className="text-xs font-medium" style={{ color: 'var(--mg-danger)' }}>
                    {passwordError}
                  </p>
                )}

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                    Profile Photo <span style={{ color: 'var(--mg-ink-3)' }}>(Optional)</span>
                  </label>
                  <label
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-dashed cursor-pointer text-xs transition-colors"
                    style={{
                      backgroundColor: 'var(--mg-input-bg)',
                      borderColor: 'var(--mg-border-strong)',
                      color: 'var(--mg-ink-2)',
                    }}
                  >
                    <ImageIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-ink-3)' }} />
                    <span className="truncate">
                      {profilePhotoFile ? profilePhotoFile.name : 'Choose JPG, PNG, or WebP photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}
                      className="sr-only"
                    />
                  </label>
                </div>

                <Button type="submit" size="lg" className="w-full mt-2" isLoading={isSendingOtp}>
                  Continue &amp; Verify Email
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                <OtpInputGroup otp={otp} setOtp={setOtp} disabled={isLoading} />

                <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
                  <ShieldCheck className="w-4 h-4" />
                  Create Account
                </Button>

                <div className="flex items-center justify-center text-xs">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={cooldown > 0 || isSendingOtp}
                    className="font-semibold cursor-pointer disabled:opacity-50 hover:underline"
                    style={{ color: 'var(--mg-accent)' }}
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend verification code'}
                  </button>
                </div>
              </form>
            )}

            <div
              className="mt-7 pt-6 border-t text-center text-sm"
              style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-ink-2)' }}
            >
              Already have an account?{' '}
              <Link
                to="/login"
                state={location.state}
                className="font-semibold hover:underline"
                style={{ color: 'var(--mg-accent)' }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Mail, Lock, LogIn, KeyRound, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import Button from '../components/common/Button';
import { login } from '../store/authSlice';
import { fetchApi } from '../services/api';

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
    pasted.split('').forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex gap-2.5 justify-center">
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
          className={`w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all focus:outline-none
            ${digit
              ? 'bg-secondary/10 border-secondary text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]'
              : 'bg-black/20 border-white/10 text-white/60'
            }
            focus:border-secondary focus:bg-secondary/5 disabled:opacity-50`}
        />
      ))}
    </div>
  );
};

const Login = () => {
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiMessage, setApiMessage] = useState('');
  
  // Forgot password state
  const [forgotStep, setForgotStep] = useState(0); // 0: login, 1: enter email, 2: enter OTP, 3: new password
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [passwordError, setPasswordError] = useState('');
  
  // Visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
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
        body: JSON.stringify({ email, password })
      });

      dispatch(login({ ...data.user, email: email, token: data.token }));
      navigate('/');
    } catch (err) {
      setApiError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Send OTP to email
  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setApiError('Please enter your email.');
      return;
    }
    setApiError('');
    setIsSendingOtp(true);
    try {
      await fetchApi('/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, purpose: 'reset' })
      });
      setForgotStep(2);
      setCooldown(60);
    } catch (err) {
      setApiError(err.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Verify OTP
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
        body: JSON.stringify({ email: resetEmail, otp: otpString, purpose: 'reset' })
      });
      setForgotStep(3);
    } catch (err) {
      setApiError(err.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Set new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setApiError('');
    setPasswordError('');

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match!");
      return;
    }

    const minLength = newPassword.length >= 6;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>_]/.test(newPassword);
    const hasAlphabet = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);

    if (!minLength || !hasUppercase || !hasSymbol || !hasAlphabet || !hasNumber) {
      setPasswordError("Password must be at least 6 characters, contain 1 uppercase letter, 1 unique symbol, and 1 number.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, newPassword, otp: otp.join('') })
      });
      setApiMessage(data.message || 'Password reset successfully!');
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
        body: JSON.stringify({ email: resetEmail, purpose: 'reset' })
      });
      setOtp(Array(OTP_LENGTH).fill(''));
      setCooldown(60);
    } catch (err) {
      setApiError(err.message || 'Failed to resend OTP');
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

  const getSubtitle = () => {
    switch(forgotStep) {
      case 1: return 'Enter your registered email to receive a reset code.';
      case 2: return 'Enter the 6-digit code we sent to your email.';
      case 3: return 'Create a strong new password for your account.';
      default: return 'Welcome back. Enter the cinematic universe.';
    }
  };

  return (
    <div className="w-full min-h-screen flex -mt-24 pb-20 justify-center items-center relative">
      <div className="absolute inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=2560&q=80" alt="cinema" className="w-full h-full object-cover opacity-30 mix-blend-screen" />
        <div className="absolute inset-0 bg-base/80 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-base via-transparent to-base/80"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4 mt-20">
        <div className="text-center mb-8">
           <Link to="/" className="inline-block text-4xl font-bold font-outfit tracking-tight mb-2">
             Movie<span className="text-primary drop-shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse">Goo</span>
           </Link>
           <p className="text-white/60 text-sm">{getSubtitle()}</p>
        </div>

        {/* Step indicator for forgot password flow */}
        {forgotStep > 0 && (
          <div className="flex items-center justify-center gap-3 mb-6">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                  forgotStep >= s ? 'bg-secondary text-white' : 'bg-white/10 text-white/30'
                }`}>{s}</div>
                {s < 3 && <div className={`w-6 h-px transition-all ${forgotStep > s ? 'bg-secondary' : 'bg-white/10'}`}></div>}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="bg-surface/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {apiError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-semibold flex items-center justify-between">
              {apiError}
              <button type="button" onClick={() => setApiError('')} className="text-red-400 hover:text-white">&times;</button>
            </div>
          )}
          {apiMessage && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-semibold flex items-center justify-between">
              {apiMessage}
              <button type="button" onClick={() => setApiMessage('')} className="text-green-400 hover:text-white">&times;</button>
            </div>
          )}

          {forgotStep === 0 && (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-6 animate-in slide-in-from-right-4">
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:bg-white/5 transition-all" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input type={showPassword ? "text" : "password"} required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:bg-white/5 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button type="button" onClick={() => setForgotStep(1)} className="text-sm text-primary hover:text-white transition-colors cursor-pointer">Forgot password?</button>
              </div>

              <Button type="submit" className="w-full shadow-[0_0_20px_rgba(244,63,94,0.3)] flex justify-center py-3.5" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5 mr-2" />Sign In</>}
              </Button>
            </form>
          )}

          {forgotStep === 1 && (
            /* Forgot Password - Step 1: Enter Email */
            <form onSubmit={handleSendResetOtp} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-2">
                <div className="w-16 h-16 bg-secondary/10 border border-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-white">Forgot Password?</h3>
              </div>
              
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input type="email" required placeholder="Enter your registered email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-secondary focus:bg-white/5 transition-all" />
              </div>

              <Button type="submit" className="w-full bg-secondary hover:bg-secondary/80 shadow-[0_0_20px_rgba(139,92,246,0.3)] flex justify-center py-3.5" disabled={isSendingOtp}>
                {isSendingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5 mr-2" />Send Reset Code</>}
              </Button>

              <button type="button" onClick={resetForgotFlow} className="w-full text-center text-sm text-muted hover:text-white transition-colors cursor-pointer">← Back to Login</button>
            </form>
          )}

          {forgotStep === 2 && (
            /* Forgot Password - Step 2: Verify OTP */
            <form onSubmit={handleVerifyResetOtp} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary/10 border border-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Verify Your Identity</h3>
                <p className="text-white/50 text-sm">Code sent to <span className="text-secondary font-bold">{resetEmail}</span></p>
              </div>

              <OtpInputGroup otp={otp} setOtp={setOtp} disabled={isLoading} />

              <div className="text-center">
                {cooldown > 0 ? (
                  <p className="text-white/30 text-xs">Resend in <span className="text-secondary font-bold">{cooldown}s</span></p>
                ) : (
                  <button type="button" onClick={handleResendOtp} disabled={isSendingOtp} className="text-secondary text-xs font-bold hover:text-white transition-colors cursor-pointer">
                    {isSendingOtp ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </div>

              <Button type="submit" className="w-full bg-secondary hover:bg-secondary/80 shadow-[0_0_20px_rgba(139,92,246,0.3)] flex justify-center py-3.5" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5 mr-2" />Verify Code</>}
              </Button>

              <button type="button" onClick={resetForgotFlow} className="w-full text-center text-sm text-muted hover:text-white transition-colors cursor-pointer">← Back to Login</button>
            </form>
          )}

          {forgotStep === 3 && (
            /* Forgot Password - Step 3: New Password */
            <form onSubmit={handleResetPassword} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-2">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Set New Password</h3>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input type={showNewPassword ? "text" : "password"} required placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/40 focus:outline-none focus:border-green-500 focus:bg-white/5 transition-all" />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input type={showConfirmNewPassword ? "text" : "password"} required placeholder="Confirm New Password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} onPaste={(e) => e.preventDefault()} className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/40 focus:outline-none focus:border-green-500 focus:bg-white/5 transition-all" />
                  <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                    {showConfirmNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="text-red-400 text-xs font-semibold px-2">{passwordError}</div>
              )}

              <Button type="submit" className="w-full !bg-green-600 hover:!bg-green-700 shadow-[0_0_20px_rgba(34,197,94,0.3)] flex justify-center py-3.5" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><KeyRound className="w-5 h-5 mr-2" />Reset Password</>}
              </Button>
            </form>
          )}

          {forgotStep === 0 && (
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <p className="text-white/60 text-sm">
                Don't have an account? <Link to="/register" className="text-white font-bold hover:text-primary transition-colors hover:underline">Sign up for free</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Mail, Lock, UserPlus, User, Phone, Image as ImageIcon, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import Button from '../components/common/Button';
import { login } from '../store/authSlice';
import { fetchApi } from '../services/api';

const OTP_LENGTH = 6;

const OtpInputGroup = ({ otp, setOtp, disabled }) => {
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
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
              ? 'bg-primary/10 border-primary text-white shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : 'bg-black/20 border-white/10 text-white/60'
            }
            focus:border-primary focus:bg-primary/5 disabled:opacity-50`}
        />
      ))}
    </div>
  );
};

const Register = () => {
  const [step, setStep] = useState(1); // 1: Form, 2: OTP Verify
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
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handlePasswordBlur = () => {
    if (!password) return;
    const minLength = password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>_]/.test(password);
    const hasAlphabet = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!minLength || !hasUppercase || !hasSymbol || !hasAlphabet || !hasNumber) {
      setPasswordError("Password must be at least 6 characters, contain 1 uppercase letter, 1 unique symbol, and 1 number.");
    } else {
      setPasswordError('');
    }
  };

  const handleSendOtp = async () => {
    setApiError('');
    
    // Validate form first
    if (!name || !email || !mobile || !password || !confirmPassword) {
      setApiError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match!");
      return;
    }

    const minLength = password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>_]/.test(password);
    const hasAlphabet = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!minLength || !hasUppercase || !hasSymbol || !hasAlphabet || !hasNumber) {
      setPasswordError("Password must be at least 6 characters, contain 1 uppercase letter, 1 unique symbol, and 1 number.");
      return;
    }

    setIsSendingOtp(true);
    try {
      await fetchApi('/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email, purpose: 'registration' })
      });
      setOtpSent(true);
      setStep(2);
      setCooldown(60);
    } catch (err) {
      setApiError(err.message || 'Failed to send OTP');
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
        body: JSON.stringify({ email, purpose: 'registration' })
      });
      setOtp(Array(OTP_LENGTH).fill(''));
      setCooldown(60);
    } catch (err) {
      setApiError(err.message || 'Failed to resend OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      setApiError('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsLoading(true);
    setApiError('');
    
    try {
      let profilePhotoUrl = null;

      // Handle Image Upload first if file exists
      if (profilePhotoFile) {
        const formData = new FormData();
        formData.append('image', profilePhotoFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          profilePhotoUrl = uploadData.url;
        }
      }

      const data = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, mobile, password, profilePhoto: profilePhotoUrl, otp: otpString })
      });

      dispatch(login({
        ...data.user,
        email: email,
        token: data.token
      }));
      
      navigate('/');
    } catch (err) {
      setApiError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex -mt-24 pb-20 justify-center items-center relative">
      
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=2560&q=80" alt="cinema" className="w-full h-full object-cover opacity-20 mix-blend-screen" />
        <div className="absolute inset-0 bg-base/80 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-base via-transparent to-base/80"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4 mt-20">
        
        {/* Logo/Brand */}
        <div className="text-center mb-8">
           <Link to="/" className="inline-block text-4xl font-bold font-outfit tracking-tight mb-2">
             Movie<span className="text-primary drop-shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse">Goo</span>
           </Link>
           <p className="text-white/60 text-sm">
             {step === 1 ? 'Join the club. Get early tickets & rewards.' : 'Enter the verification code sent to your email.'}
           </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${step >= 1 ? 'text-primary' : 'text-white/30'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${step >= 1 ? 'bg-primary text-white' : 'bg-white/10 text-white/30'}`}>1</div>
            Details
          </div>
          <div className={`w-8 h-px transition-all ${step >= 2 ? 'bg-primary' : 'bg-white/10'}`}></div>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${step >= 2 ? 'text-primary' : 'text-white/30'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${step >= 2 ? 'bg-primary text-white' : 'bg-white/10 text-white/30'}`}>2</div>
            Verify
          </div>
        </div>

        {/* Register Card */}
        <div className="bg-surface/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {apiError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-semibold flex items-center justify-between">
              {apiError}
              <button type="button" onClick={() => setApiError('')} className="text-red-400 hover:text-white">&times;</button>
            </div>
          )}

          {step === 1 ? (
            /* Step 1: User Details */
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input 
                    type="text" required placeholder="Full Name" value={name}
                    onChange={(e) => setName(e.target.value)} autoComplete="off"
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:bg-white/5 transition-all"
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input 
                    type="email" required placeholder="Email address" value={email}
                    onChange={(e) => setEmail(e.target.value)} autoComplete="off"
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:bg-white/5 transition-all"
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input 
                    type="tel" required placeholder="Mobile Number" value={mobile}
                    onChange={(e) => setMobile(e.target.value)} autoComplete="off"
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:bg-white/5 transition-all"
                  />
                </div>

                <div className="relative flex items-center bg-black/20 border border-white/10 rounded-xl py-2 pl-4 pr-4 transition-all focus-within:border-primary focus-within:bg-white/5">
                  <ImageIcon className="w-5 h-5 text-white/40 mr-3 flex-shrink-0" />
                  <div className="w-full flex items-center justify-between">
                    <span className="text-white/40 text-sm truncate max-w-[150px]">{profilePhotoFile ? profilePhotoFile.name : 'Profile Photo (Optional)'}</span>
                    <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                      Browse
                      <input 
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => { if (e.target.files[0]) setProfilePhotoFile(e.target.files[0]); }}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input 
                      type={showPassword ? "text" : "password"} required placeholder="Create Password" value={password}
                      onChange={(e) => setPassword(e.target.value)} onBlur={handlePasswordBlur}
                      autoComplete="new-password"
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:bg-white/5 transition-all text-sm"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input 
                      type={showConfirmPassword ? "text" : "password"} required placeholder="Confirm Password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} onBlur={handlePasswordBlur}
                      onPaste={(e) => e.preventDefault()} autoComplete="new-password"
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:bg-white/5 transition-all text-sm"
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
                {passwordError && (
                  <div className="text-red-400 text-xs font-semibold px-2">{passwordError}</div>
                )}
              </div>

              <Button 
                type="button"
                onClick={handleSendOtp}
                className="w-full shadow-[0_0_20px_rgba(244,63,94,0.3)] flex justify-center py-3.5"
                disabled={isSendingOtp}
              >
                {isSendingOtp ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Verify Email & Continue
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Step 2: OTP Verification */
            <form onSubmit={handleRegister} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Check Your Email</h3>
                <p className="text-white/50 text-sm">We sent a 6-digit code to <span className="text-primary font-bold">{email}</span></p>
              </div>

              <OtpInputGroup otp={otp} setOtp={setOtp} disabled={isLoading} />

              <div className="text-center">
                {cooldown > 0 ? (
                  <p className="text-white/30 text-xs">Resend available in <span className="text-primary font-bold">{cooldown}s</span></p>
                ) : (
                  <button 
                    type="button" onClick={handleResendOtp} disabled={isSendingOtp}
                    className="text-primary text-xs font-bold hover:text-white transition-colors cursor-pointer"
                  >
                    {isSendingOtp ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </div>

              <Button 
                type="submit"
                className="w-full shadow-[0_0_20px_rgba(244,63,94,0.3)] flex justify-center py-3.5"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Create Account
                  </>
                )}
              </Button>

              <button 
                type="button" 
                onClick={() => { setStep(1); setOtp(Array(OTP_LENGTH).fill('')); setApiError(''); }}
                className="w-full text-center text-sm text-muted hover:text-white transition-colors cursor-pointer"
              >
                ← Go back & edit details
              </button>
            </form>
          )}

          {step === 1 && (
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <p className="text-white/60 text-sm">
                Already have an account? <Link to="/login" className="text-white font-bold hover:text-primary transition-colors hover:underline">Log in</Link>
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Register;

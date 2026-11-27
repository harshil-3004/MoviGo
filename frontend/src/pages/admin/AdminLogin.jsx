import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Shield, Key, Mail, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Button from '../../components/common/Button';
import { login } from '../../store/authSlice';
import { fetchApi } from '../../services/api';

const ALLOWED_STAFF_ROLES = ['admin', 'master_admin', 'theater_admin'];

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!ALLOWED_STAFF_ROLES.includes(data.user?.role)) {
        setError('Access restricted: this account does not have staff or admin permissions.');
        return;
      }

      dispatch(
        login({
          ...data.user,
          email: data.user?.email || email,
          token: data.token,
        })
      );

      navigate('/admin');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Staff authentication failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--mg-bg)', color: 'var(--mg-ink)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl border flex items-center justify-center mx-auto mb-4"
            style={{
              backgroundColor: 'var(--mg-accent-soft)',
              borderColor: 'var(--mg-border)',
              color: 'var(--mg-accent)',
            }}
          >
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
            MoviGo Admin Console
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--mg-ink-2)' }}>
            Sign in with your authorized operator credentials
          </p>
        </div>

        <div
          className="rounded-xl border p-6 sm:p-8"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border)',
            boxShadow: 'var(--mg-shadow-md)',
          }}
        >
          {error && (
            <div
              className="mb-5 px-3.5 py-2.5 rounded-lg border text-xs font-medium flex items-start gap-2"
              style={{
                backgroundColor: 'var(--mg-danger-soft)',
                borderColor: 'var(--mg-danger)',
                color: 'var(--mg-danger)',
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Staff Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@movigo.com"
                  required
                  className="mg-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
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
              Sign In to Console
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: 'var(--mg-border)' }}>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
              style={{ color: 'var(--mg-ink-2)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Consumer Site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

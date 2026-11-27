import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { fetchApi, uploadFile } from '../../services/api';
import Button from '../../components/common/Button';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const AdminSettings = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'admin' || user?.role === 'master_admin';
  const [theaters, setTheaters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    role: 'admin',
    theaterId: '',
    profilePhotoFile: null,
  });

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchApi('/theaters/admin')
      .then((list) => setTheaters(Array.isArray(list) ? list : []))
      .catch((err) => console.error(err));
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return <Navigate to="/admin" />;
  }

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSuccess(false);
    setError('');

    try {
      let profilePhotoUrl = null;

      if (formData.profilePhotoFile) {
        const uploadData = await uploadFile(formData.profilePhotoFile);
        if (uploadData.url) {
          profilePhotoUrl = uploadData.url;
        }
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        role: formData.role,
        theaterIds:
          formData.role === 'theater_admin' && formData.theaterId ? [formData.theaterId] : [],
        profilePhoto: profilePhotoUrl,
      };

      await fetchApi('/users/staff', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsSuccess(true);
      setFormData({
        name: '',
        email: '',
        mobile: '',
        password: '',
        role: 'admin',
        theaterId: '',
        profilePhotoFile: null,
      });

      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err) {
      setError(err.message || 'Failed to create staff account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
          Staff &amp; Access Provisioning
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
          Create administrator or cinema venue manager accounts with scoped permissions.
        </p>
      </div>

      <div
        className="rounded-xl border p-6 sm:p-8"
        style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
      >
        <div
          className="flex items-center gap-2 pb-4 mb-6 border-b font-display font-bold text-base"
          style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-ink)' }}
        >
          <UserPlus className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
          Add Staff Member
        </div>

        {isSuccess && (
          <div
            className="mb-5 px-4 py-3 rounded-lg border text-sm font-medium flex items-center gap-2"
            style={{
              backgroundColor: 'var(--mg-success-soft)',
              borderColor: 'var(--mg-success)',
              color: 'var(--mg-success)',
            }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Staff account created successfully.
          </div>
        )}

        {error && (
          <div
            className="mb-5 px-4 py-3 rounded-lg border text-sm font-medium flex items-center gap-2"
            style={{
              backgroundColor: 'var(--mg-danger-soft)',
              borderColor: 'var(--mg-danger)',
              color: 'var(--mg-danger)',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ananya Iyer"
                className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="staff@movigo.com"
                className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 98765 43210"
                className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Temporary Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Create password"
                  className="mg-input w-full pl-3.5 pr-10 py-2.5 rounded-lg text-sm"
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
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
              >
                <option value="admin">Platform Admin</option>
                <option value="theater_admin">Cinema Venue Manager</option>
              </select>
            </div>

            {formData.role === 'theater_admin' && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                  Assigned Cinema *
                </label>
                <select
                  required
                  value={formData.theaterId}
                  onChange={(e) => setFormData({ ...formData, theaterId: e.target.value })}
                  className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
                >
                  <option value="">Select cinema...</option>
                  {theaters.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.location})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Profile Photo (Optional)
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
                  {formData.profilePhotoFile ? formData.profilePhotoFile.name : 'Choose image file'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData({ ...formData, profilePhotoFile: e.target.files?.[0] || null })
                  }
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button type="submit" isLoading={isLoading}>
              <UserPlus className="w-4 h-4" />
              Create Staff Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;

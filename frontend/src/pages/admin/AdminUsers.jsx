import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Trash2, Shield, Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { fetchApi } from '../../services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'admin' || user?.role === 'master_admin';

  const fetchUsers = async () => {
    try {
      const data = await fetchApi('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchUsers();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return <Navigate to="/admin" />;
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user account permanently?')) return;
    setError('');
    try {
      await fetchApi(`/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (e) {
      setError(e.message || 'Failed to delete user record.');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleStyle = (u) => {
    if (u.email === 'harshil@movigo.com') {
      return { bg: 'var(--mg-gold-soft)', color: 'var(--mg-gold)', label: 'Super Admin', icon: ShieldAlert };
    }
    if (u.role === 'admin' || u.role === 'master_admin') {
      return { bg: 'var(--mg-accent-soft)', color: 'var(--mg-accent)', label: u.role, icon: Shield };
    }
    if (u.role === 'theater_admin') {
      return { bg: 'var(--mg-success-soft)', color: 'var(--mg-success)', label: 'Venue Manager', icon: null };
    }
    return { bg: 'var(--mg-surface-2)', color: 'var(--mg-ink-2)', label: 'Customer', icon: null };
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
          User Directory
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
          View registered customers, cinema managers, and administrators across MoviGo.
        </p>
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-xl border text-sm font-medium"
          style={{
            backgroundColor: 'var(--mg-danger-soft)',
            borderColor: 'var(--mg-danger)',
            color: 'var(--mg-danger)',
          }}
        >
          {error}
        </div>
      )}

      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
      >
        <div
          className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ borderColor: 'var(--mg-border)', backgroundColor: 'var(--mg-surface-2)' }}
        >
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mg-input w-full pl-10 pr-3 py-2 rounded-lg text-sm"
            />
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--mg-ink-3)' }}>
            {filteredUsers.length} accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr
                className="border-b text-xs font-semibold uppercase tracking-wider"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-ink-3)' }}
              >
                <th className="py-3.5 px-5">User</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Joined</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--mg-border)' }}>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center" style={{ color: 'var(--mg-ink-2)' }}>
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: 'var(--mg-accent)' }} />
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center" style={{ color: 'var(--mg-ink-3)' }}>
                    No users match your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleMeta = getRoleStyle(u);
                  const RoleIcon = roleMeta.icon;
                  const canDelete =
                    (user?.email === 'harshil@movigo.com' && u._id !== user?.id) ||
                    (user?.email !== 'harshil@movigo.com' &&
                      u.role !== 'admin' &&
                      u.role !== 'master_admin' &&
                      u._id !== user?.id);

                  return (
                    <tr key={u._id}>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                            style={{ backgroundColor: 'var(--mg-accent-soft)', color: 'var(--mg-accent)' }}
                          >
                            {u.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <span className="font-semibold" style={{ color: 'var(--mg-ink)' }}>
                            {u.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs sm:text-sm" style={{ color: 'var(--mg-ink-2)' }}>
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase"
                          style={{ backgroundColor: roleMeta.bg, color: roleMeta.color }}
                        >
                          {RoleIcon && <RoleIcon className="w-3 h-3" />}
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs" style={{ color: 'var(--mg-ink-3)' }}>
                        {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(u._id)}
                            title="Delete Account"
                            className="p-2 rounded-lg border cursor-pointer"
                            style={{
                              backgroundColor: 'var(--mg-danger-soft)',
                              borderColor: 'var(--mg-border)',
                              color: 'var(--mg-danger)',
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;

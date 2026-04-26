import React, { useState, useEffect } from 'react';
import { Users, ShieldAlert, Search, Trash2, Shield, Activity } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { fetchApi } from '../../services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useSelector(state => state.auth);

  if (user?.role !== 'admin') {
    return <Navigate to="/admin" />;
  }

  const fetchUsers = async () => {
    try {
      const data = await fetchApi('/users');
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("CRITICAL: Are you sure you want to completely scrub this user from the system?")) return;
    try {
      await fetchApi(`/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (e) {
      alert("Failed to delete user record.");
    }
  };

  return (
    <div className="p-6 md:p-10 w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-white mb-2">User Directory</h1>
          <p className="text-muted max-w-xl">
             Central Command for all registered entities. You hold global clearance to revoke access.
          </p>
        </div>
      </div>

      <div className="bg-surface/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between bg-white/[0.02]">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by name or email identity..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-muted focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/20 text-muted uppercase text-[11px] tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Identity</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Clearance Level</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && (
                 <tr>
                   <td colSpan="5" className="px-6 py-10 text-center text-muted">
                     <Activity className="w-6 h-6 animate-pulse mx-auto mb-2 text-primary" /> Syncing user database...
                   </td>
                 </tr>
              )}
              
              {!isLoading && users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())).map((u) => (
                <tr key={u._id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-white font-bold text-xs">
                        {u.name?.charAt(0) || 'U'}
                      </div>
                      <span className="font-bold text-white">
                        {u.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white/70">
                    {u.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center w-fit px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      u.email === 'harshil@movigo.com' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                      u.role === 'admin' ? 'bg-primary/20 text-primary border border-primary/30' : 
                      u.role === 'theater_admin' ? 'bg-secondary/20 text-secondary border border-secondary/30' : 
                      'bg-white/5 text-white/50 border border-white/5'
                    }`}>
                      {u.email === 'harshil@movigo.com' && <ShieldAlert className="w-3 h-3 mr-1" />}
                      {u.role === 'admin' && u.email !== 'harshil@movigo.com' && <Shield className="w-3 h-3 mr-1" />}
                      {u.email === 'harshil@movigo.com' ? 'Super Admin' : u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/50 font-mono text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Super Admin Logic: Harshil can delete ANYONE except himself */}
                      {/* Other Admins can only delete non-admins */}
                      {((user?.email === 'harshil@movigo.com' && u._id !== user?.id) || (user?.email !== 'harshil@movigo.com' && u.role !== 'admin')) && (
                        <button onClick={() => handleDelete(u._id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors cursor-pointer" title="Scrub Identity">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;

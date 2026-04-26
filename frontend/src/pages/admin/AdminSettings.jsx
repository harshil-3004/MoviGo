import React, { useState, useEffect } from 'react';
import { ShieldAlert, UserPlus, CheckCircle, Activity, Building2 } from 'lucide-react';
import { fetchApi } from '../../services/api';
import Button from '../../components/common/Button';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const AdminSettings = () => {
  const { user } = useSelector(state => state.auth);
  const [theaters, setTheaters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    role: 'admin',
    theaterId: '',
    profilePhotoFile: null
  });

  if (user?.role !== 'admin') {
    return <Navigate to="/admin" />;
  }

  useEffect(() => {
    fetchApi('/theaters')
      .then(data => setTheaters(data))
      .catch(err => console.error(err));
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSuccess(false);

    try {
      let profilePhotoUrl = null;

      // Handle Image Upload if file exists
      if (formData.profilePhotoFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('image', formData.profilePhotoFile);

        const uploadRes = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: uploadFormData
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          profilePhotoUrl = uploadData.url;
        }
      }

      const payload = { 
        ...formData,
        profilePhoto: profilePhotoUrl
      };
      if (payload.role === 'admin') payload.theaterId = null;

      await fetchApi('/users/staff', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      setIsSuccess(true);
      setFormData({
        name: '',
        email: '',
        mobile: '',
        password: '',
        role: 'admin',
        theaterId: '',
        profilePhotoFile: null
      });
      
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err) {
      alert("Failed to create staff account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 w-full animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-white mb-2">Staff Management</h1>
          <p className="text-muted">Master Admin Override: Provision high-level access nodes.</p>
        </div>
      </div>

      <div className="bg-surface/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/10 text-secondary font-bold uppercase tracking-widest text-sm">
          <ShieldAlert className="w-5 h-5" />
          Authorize New Command Agent
        </div>

        {isSuccess && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center text-green-400 gap-3">
             <CheckCircle className="w-5 h-5" />
             <span className="font-bold">Clearance Granted. Agent integrated into the network.</span>
          </div>
        )}

        <form onSubmit={handleCreateStaff} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Agent Designation (Name)</label>
              <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-secondary" placeholder="e.g. John Doe" />
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Comm Link (Email)</label>
              <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-secondary" placeholder="admin@domain.com" />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Mobile Nexus (Phone)</label>
              <input required type="tel" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-secondary" placeholder="e.g. 1234567890" />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Identity Image (Profile Photo)</label>
              <div className="relative flex items-center bg-black/40 border border-white/10 rounded-xl p-4 transition-all focus-within:border-secondary">
                <div className="w-full flex items-center justify-between">
                  <span className="text-white/40 text-sm truncate max-w-[150px]">{formData.profilePhotoFile ? formData.profilePhotoFile.name : 'Upload Identity Photo'}</span>
                  <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                    Browse
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files[0]) setFormData({...formData, profilePhotoFile: e.target.files[0]}) }} />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Initial Encryption Key (Password)</label>
              <input required type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-secondary" placeholder="Temporary password" />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Clearance Level</label>
              <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-secondary appearance-none">
                <option value="admin">Master Admin Phase II</option>
                <option value="theater_admin">Theater Branch Commander</option>
              </select>
            </div>
          </div>

          {formData.role === 'theater_admin' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest flex items-center gap-2">
                <Building2 className="w-3 h-3 text-secondary" /> Assigned Branch
              </label>
              <select required value={formData.theaterId} onChange={(e) => setFormData({...formData, theaterId: e.target.value})} className="w-full bg-primary/5 border border-primary/20 rounded-xl p-4 text-white focus:outline-none focus:border-primary appearance-none">
                <option value="">Select Theater Node...</option>
                {theaters.map(t => (
                  <option key={t._id} value={t._id}>{t.name} ({t.location})</option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-6 mt-6 border-t border-white/10 flex justify-end">
             <Button type="submit" disabled={isLoading} className="px-10 h-14 bg-secondary shadow-[0_0_20px_rgba(139,92,246,0.3)]">
               {isLoading ? <Activity className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-5 h-5 mr-2" /> Authorize & Provision</>}
             </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;

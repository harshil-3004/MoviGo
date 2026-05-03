import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Plus, Search, MapPin, Clock, Edit2, Trash2, Activity, X, Map, CheckCircle, ExternalLink, ShieldCheck, ShieldAlert, ShieldX, QrCode } from 'lucide-react';
import Button from '../../components/common/Button';
import { fetchApi } from '../../services/api';

const AdminTheaters = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [theaters, setTheaters] = useState([]);
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTheater, setCurrentTheater] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(null);
  const { user } = useSelector(state => state.auth);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    format: 'Standard 2D'
  });

  const fetchTheaters = async () => {
    try {
      const theatersData = await fetchApi('/theaters/admin');
      setTheaters(theatersData);
      
      // Fetch staff separately as it might fail for theater_admins due to permissions
      try {
        const staffData = await fetchApi('/users');
        setStaff(staffData.filter(u => u.role === 'admin' || u.role === 'theater_admin'));
      } catch (staffErr) {
        console.warn("Staff fetch restricted for this role", staffErr);
        setStaff([]); // Fallback to empty staff list
      }
    } catch (err) {
      console.error("Failed fetching theaters", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTheaters();
  }, []);

  const handleOpenModal = (theater = null) => {
    if (theater) {
      setCurrentTheater(theater);
      setFormData({
        name: theater.name,
        location: theater.location,
        format: theater.format || 'Standard 2D'
      });
    } else {
      setCurrentTheater(null);
      setFormData({ name: '', location: '', format: 'Standard 2D' });
    }
    setCreateSuccess(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.location) {
      alert("All fields are mandatory for satellite authorization.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentTheater) {
        // Update
        const updated = await fetchApi(`/theaters/${currentTheater._id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        setTheaters(prev => prev.map(t => t._id === updated._id ? updated : t));
        setIsModalOpen(false);
      } else {
        // Create
        const newTheater = await fetchApi('/theaters', {
          method: 'POST',
          body: JSON.stringify({ 
            ...formData,
            idString: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`, 
            screens: [] 
          })
        });
        setTheaters(prev => [newTheater, ...prev]);
        setCreateSuccess(newTheater);
      }
    } catch (e) { 
      alert(`Critical Error: ${e.message}`); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("CRITICAL: Shut down and purge this branch from the database?")) return;
    try {
      await fetchApi(`/theaters/${id}`, { method: 'DELETE' });
      setTheaters(prev => prev.filter(t => t._id !== id));
    } catch (e) { alert("Failed to shut down branch"); }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const updated = await fetchApi(`/theaters/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ approvalStatus: status })
      });
      setTheaters(prev => prev.map(t => t._id === updated._id ? updated : t));
    } catch (e) { alert("Failed to update status"); }
  };

  const handleRevokeAccess = async (theaterId, userId) => {
    if (!window.confirm("Revoke this personnel's access to this specific theater node?")) return;
    try {
      await fetchApi(`/theaters/${theaterId}/personnel/${userId}`, {
        method: 'DELETE'
      });
      // Refresh to reflect changes
      fetchTheaters();
    } catch (e) {
      alert(e.message || "Failed to revoke access clearance.");
    }
  };

  const handleAssignPersonnel = async (theaterId, userId) => {
    try {
      await fetchApi(`/theaters/${theaterId}/personnel`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      // Refresh staff to reflect changes
      fetchTheaters();
    } catch (e) {
      alert("Failed to authorize personnel.");
    }
  };

  const filteredTheaters = theaters.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
    <div className="p-6 md:p-10 w-full animate-in fade-in duration-700 bg-base min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-black uppercase tracking-widest">Sector Deployment</span>
              <span className="text-muted text-[10px] font-bold uppercase tracking-widest">• Global Fleet Overview</span>
           </div>
          <h1 className="text-4xl md:text-6xl font-black font-outfit text-white tracking-tighter uppercase">Theater Command</h1>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center h-14 px-8 bg-primary text-white shadow-[0_20px_50px_rgba(244,63,94,0.2)] hover:scale-105 transition-all">
          <Plus className="w-5 h-5 mr-2" /> Establish New Branch
        </Button>
      </div>

      {/* Search Toolbar */}
      <div className="mb-10 relative max-w-2xl">
         <Search className="w-6 h-6 text-muted absolute left-5 top-1/2 -translate-y-1/2" />
         <input 
           type="text" 
           placeholder="Search deployment sectors..." 
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="w-full bg-surface/30 border border-white/5 rounded-3xl py-5 pl-14 pr-6 text-white text-lg placeholder:text-muted/50 focus:outline-none focus:border-primary/50 transition-all backdrop-blur-xl"
         />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {isLoading ? (
           <div className="w-full py-20 flex flex-col items-center justify-center text-muted">
             <Activity className="w-12 h-12 animate-spin mb-4 text-primary" /> 
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Syncing Sector Data...</span>
           </div>
        ) : filteredTheaters.length === 0 ? (
           <div className="py-20 text-center bg-surface/20 border border-white/5 rounded-[3rem]">
              <MapPin className="w-16 h-16 text-white/10 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white/50 font-outfit">No Active Branches Found</h3>
              <p className="text-muted mt-2">Adjust your filters or deploy a new theater.</p>
           </div>
        ) : filteredTheaters.map((theater) => (
          <div 
            id={theater._id}
            key={theater._id} 
            className="bg-surface/30 border border-white/5 rounded-[3rem] p-8 backdrop-blur-2xl relative group transition-all duration-700 hover:bg-surface/40 hover:border-white/10"
          >
            {/* Background Decoration: Clipped by parent rounded corners manually or using overflow-hidden conditionally */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors pointer-events-none overflow-hidden"></div>
            
            <div className="flex flex-col lg:flex-row justify-between gap-10 relative z-10">
              
              {/* Theater Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <h2 className="text-3xl font-black font-outfit text-white tracking-tighter uppercase leading-none">{theater.name}</h2>
                  <span className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{theater.format}</span>
                  
                  {/* Status Badge */}
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                      theater.approvalStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      theater.approvalStatus === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                      'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {theater.approvalStatus === 'Approved' && <ShieldCheck className="w-3 h-3" />}
                    {theater.approvalStatus === 'Rejected' && <ShieldX className="w-3 h-3" />}
                    {(theater.approvalStatus === 'Pending' || !theater.approvalStatus) && <ShieldAlert className="w-3 h-3" />}
                    {theater.approvalStatus || 'Pending Authorization'}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center text-muted text-sm gap-6 mt-6">
                  <span className="flex items-center gap-3 font-bold text-white/70 tracking-tight">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary border border-white/10">
                       <MapPin className="w-4 h-4" />
                    </div>
                    {theater.location}
                  </span>
                  <span className="flex items-center gap-3 font-bold text-white/70 tracking-tight">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-secondary border border-white/10">
                       <Activity className="w-4 h-4" />
                    </div>
                    {theater.screens?.length || 0} Functional Screens
                  </span>
                </div>

                {/* Access Personnel Details */}
                <div className="mt-8 pt-6 border-t border-white/5">
                   <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] font-black uppercase text-muted tracking-widest">Authorized Command Personnel</span>
                   </div>
                   <div className="flex flex-wrap gap-3">
                      {staff.filter(s => s.role === 'admin' || s._id === theater.requestedBy || (s.theaterIds && s.theaterIds.includes(theater._id))).map(person => (
                         <div key={person._id} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 group/person relative">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                               {person.name?.charAt(0)}
                            </div>
                            <div>
                               <p className="text-xs font-bold text-white/80 leading-none">{person.name}</p>
                               <p className="text-[8px] text-muted uppercase tracking-tighter mt-1">
                                  {person.role === 'admin' ? 'Global Admin' : person._id === theater.requestedBy ? 'Branch Owner' : 'Branch Admin'}
                               </p>
                            </div>
                            {/* Revoke Permission: Only for Branch Admins, NOT the owner, and only if current user is admin/super */}
                            {person.role === 'theater_admin' && person._id !== theater.requestedBy && (user?.role === 'admin' || user?.email === 'harshil@movigo.com') && (
                               <button 
                                 onClick={() => handleRevokeAccess(theater._id, person._id)}
                                 className="ml-2 p-1 rounded-md bg-rose-500/10 text-rose-500 opacity-0 group-hover/person:opacity-100 transition-all hover:bg-rose-500 hover:text-white cursor-pointer"
                                 title="Revoke Branch Access"
                               >
                                  <X className="w-3 h-3" />
                               </button>
                            )}
                         </div>
                      ))}
                      {/* Add Personnel Button: Only for Super Admins */}
                      {(user?.role === 'admin' || user?.email === 'harshil@movigo.com') && (
                        <div className="relative group/assign">
                           <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all cursor-pointer">
                              <Plus className="w-5 h-5" />
                           </button>
                           {/* High-Opacity Solid Background to fix visibility issues */}
                           <div className="absolute left-0 bottom-full mb-4 w-64 bg-base border border-white/20 rounded-2xl p-4 shadow-[0_30px_60px_rgba(0,0,0,0.9)] opacity-0 invisible group-hover/assign:opacity-100 group-hover/assign:visible transition-all z-[100]">
                              <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-4 px-1">Authorize Personnel</p>
                              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                                 {staff.filter(s => s.role === 'theater_admin' && (!s.theaterIds || !s.theaterIds.includes(theater._id))).map(admin => (
                                    <button 
                                       key={admin._id}
                                       onClick={() => handleAssignPersonnel(theater._id, admin._id)}
                                       className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-all flex items-center gap-3 group/item"
                                    >
                                       <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white group-hover/item:bg-primary transition-colors">
                                          {admin.name?.charAt(0)}
                                       </div>
                                       <div>
                                          <p className="text-xs font-bold text-white/80">{admin.name}</p>
                                          <p className="text-[8px] text-muted truncate max-w-[140px]">{admin.email}</p>
                                       </div>
                                    </button>
                                 ))}
                                 {staff.filter(s => s.role === 'theater_admin' && (!s.theaterIds || !s.theaterIds.includes(theater._id))).length === 0 && (
                                    <p className="text-[10px] text-muted italic p-2">No available theater admins.</p>
                                 )}
                              </div>
                           </div>
                        </div>
                      )}
                      {staff.filter(s => s.role === 'admin' || (s.theaterIds && s.theaterIds.includes(theater._id))).length === 0 && (
                         <span className="text-[10px] text-muted italic">No personnel assigned to this node.</span>
                      )}
                   </div>
                </div>
              </div>

              {/* Command Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 lg:opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                
                {/* Approval Workflow */}
                {user?.role === 'admin' && theater.approvalStatus === 'Pending' && (
                  <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5 mr-4">
                    <button onClick={() => handleUpdateStatus(theater._id, 'Approved')} className="flex items-center gap-2 px-5 py-3 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => handleUpdateStatus(theater._id, 'Rejected')} className="flex items-center gap-2 px-5 py-3 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-rose-500/30">
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}

                {/* Standard Management */}
                {(theater.approvalStatus === 'Approved' || user?.role === 'admin') && (
                  <>
                    <Link 
                      to={`/admin/screens/${theater._id}`} 
                      className="w-12 h-12 bg-primary/10 hover:bg-primary rounded-2xl text-primary hover:text-white transition-all flex items-center justify-center border border-primary/20 shadow-lg"
                      title="Screen Configuration"
                    >
                      <Plus className="w-6 h-6" />
                    </Link>
                    <Link 
                      to={`/admin/showtimes/${theater._id}`} 
                      className="w-12 h-12 bg-secondary/10 hover:bg-secondary rounded-2xl text-secondary hover:text-white transition-all flex items-center justify-center border border-secondary/20 shadow-lg"
                      title="Schedules"
                    >
                      <Clock className="w-6 h-6" />
                    </Link>
                    <Link 
                      to={`/admin/scanner`} 
                      state={{ theaterId: theater._id, theaterName: theater.name }}
                      className="w-12 h-12 bg-emerald-500/10 hover:bg-emerald-500 rounded-2xl text-emerald-400 hover:text-white transition-all flex items-center justify-center border border-emerald-500/20 shadow-lg"
                      title="Entry Scanner"
                    >
                      <QrCode className="w-6 h-6" />
                    </Link>
                  </>
                )}

                <button onClick={() => handleOpenModal(theater)} className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl text-white/60 hover:text-white transition-all flex items-center justify-center border border-white/5">
                  <Edit2 className="w-5 h-5" />
                </button>
                
                {user?.role === 'admin' && (
                  <button onClick={() => handleDelete(theater._id)} className="w-12 h-12 bg-rose-500/5 hover:bg-rose-500 text-rose-500/60 hover:text-white transition-all flex items-center justify-center border border-white/5">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Unified Theater Modal */}
    {isModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-base/80 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setIsModalOpen(false)}
        ></div>

        <div className="relative w-full max-w-xl bg-surface border border-white/10 rounded-[3rem] p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          {!createSuccess ? (
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between mb-10">
                <div>
                   <h2 className="text-3xl font-black font-outfit text-white tracking-tighter uppercase">
                     {currentTheater ? 'Protocol Update' : 'Branch Commission'}
                   </h2>
                   <p className="text-[10px] text-muted font-black uppercase tracking-widest mt-1">Theater Deployment Parameters</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all flex items-center justify-center"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-muted tracking-widest pl-1">Cinematic Designation</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Cineplex Prime Downtown"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white text-lg focus:border-primary focus:outline-none transition-all font-outfit"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-muted tracking-widest pl-1">Sector Coordinates (Location)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Sector 7-G, Grand Plaza"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white text-lg focus:border-primary focus:outline-none transition-all font-outfit"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-muted tracking-widest pl-1">Projection Protocol (Format)</label>
                  <select 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white text-lg focus:border-primary focus:outline-none appearance-none transition-all font-outfit"
                    value={formData.format}
                    onChange={(e) => setFormData({...formData, format: e.target.value})}
                  >
                    <option value="Standard 2D">Standard 2D</option>
                    <option value="IMAX 2D">IMAX 2D</option>
                    <option value="IMAX 3D">IMAX 3D</option>
                    <option value="Dolby Cinema">Dolby Cinema</option>
                    <option value="4DX">4DX</option>
                  </select>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-16 bg-primary shadow-[0_20px_50px_rgba(244,63,94,0.3)] mt-8 text-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Activity className="w-6 h-6 animate-spin mx-auto" />
                ) : (
                  currentTheater ? "COMMIT PROTOCOL UPDATES" : "INITIALIZE DEPLOYMENT"
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center py-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                <ShieldCheck className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="text-4xl font-black font-outfit text-white mb-3 uppercase tracking-tighter">Fleet Expanded</h2>
              <p className="text-muted mb-10 px-4 leading-relaxed">
                Branch <span className="text-white font-black">{createSuccess.name}</span> has been successfully commissioned into the global network.
              </p>
              
              <div className="flex flex-col gap-4">
                <Link 
                  to={`/admin/screens/${createSuccess._id}`}
                  className="flex items-center justify-center gap-3 w-full h-16 bg-primary rounded-2xl text-white font-black shadow-[0_20px_50px_rgba(244,63,94,0.3)] hover:scale-[1.02] transition-all text-lg"
                >
                  <Plus className="w-6 h-6" /> CONFIGURE SEATING
                </Link>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.3em] py-4"
                >
                  Return to Fleet Overview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </>
  );
};

export default AdminTheaters;

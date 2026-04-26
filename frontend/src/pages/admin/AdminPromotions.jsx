import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Search, Tag, Percent, Edit2, Trash2, CalendarDays, Activity } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { fetchApi } from '../../services/api';

const AdminPromotions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMintOpen, setIsMintOpen] = useState(false);
  
  // Form state
  const [newPromo, setNewPromo] = useState({ code: '', type: 'percentage', value: '', limit: 100, expiry: '', isUnlimited: false, scope: 'global', theaterIds: [] });
  const [currentPromo, setCurrentPromo] = useState(null);
  const [theaters, setTheaters] = useState([]);
  const { user } = useSelector(state => state.auth);

  const fetchPromotions = async () => {
    try {
      const [promoData, theaterData] = await Promise.all([
        fetchApi('/promotions'),
        fetchApi('/theaters/admin')
      ]);
      setPromotions(promoData);
      setTheaters(theaterData);
    } catch (err) {
      console.error("Error fetching promotions/theaters:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this code?")) return;
    try {
      await fetchApi(`/promotions/${id}`, { method: 'DELETE' });
      fetchPromotions();
    } catch (e) {
      alert("Failed to delete promo.");
    }
  };

  const handleOpenModal = (promo = null) => {
    if (promo) {
      setCurrentPromo(promo);
      setNewPromo({
        code: promo.code,
        type: promo.type,
        value: promo.value,
        limit: promo.limit,
        expiry: promo.expiry,
        isUnlimited: promo.isUnlimited || false,
        scope: promo.scope || 'global',
        theaterIds: promo.theaterIds || []
      });
    } else {
      setCurrentPromo(null);
      setNewPromo({
        code: '',
        type: 'percentage',
        value: '',
        limit: 100,
        expiry: '',
        isUnlimited: false,
        scope: user?.role === 'admin' ? 'global' : 'local',
        theaterIds: user?.role === 'theater_admin' ? (user.theaterIds || []) : []
      });
    }
    setIsMintOpen(true);
  };

  const handleMint = async (e) => {
    e.preventDefault();
    if (newPromo.scope === 'local' && (!newPromo.theaterIds || newPromo.theaterIds.length === 0)) {
       alert("Please select at least one cinema for this local promotion.");
       return;
    }

    try {
      const payload = {
        ...newPromo,
        theaterIds: newPromo.scope === 'global' ? [] : newPromo.theaterIds
      };

      if (currentPromo) {
        await fetchApi(`/promotions/${currentPromo._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchApi('/promotions', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setIsMintOpen(false);
      fetchPromotions();
    } catch (e) {
      alert("Failed saving promo");
    }
  };

  const toggleTheater = (id) => {
    setNewPromo(prev => {
       const exists = prev.theaterIds.includes(id);
       if (exists) return { ...prev, theaterIds: prev.theaterIds.filter(tid => tid !== id) };
       return { ...prev, theaterIds: [...prev.theaterIds, id] };
    });
  };

  // RBAC Filtering Logic
  const filteredPromotions = promotions.filter(p => {
    if (user?.role === 'admin' || user?.email === 'harshil@movigo.com') return true;
    if (p.scope === 'global') return true; 
    
    // Use the fetched theaters list which includes both assigned and owned theaters
    const authorizedIds = theaters.map(t => t._id.toString());
    return (p.theaterIds || []).some(id => authorizedIds.includes(id.toString()));
  });

  return (
    <div className="p-6 md:p-10 w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-white mb-2">Vouchers & Promocodes</h1>
          <p className="text-muted">
            {user?.role === 'admin' 
              ? 'Manage global discounting events and track voucher redemptions.'
              : `Manage restricted local vouchers for your authorized theater branches.`}
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center shadow-[0_0_20px_rgba(244,63,94,0.3)]">
          <Plus className="w-5 h-5 mr-2" /> Mint New Code
        </Button>
      </div>

      <div className="bg-surface/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between bg-white/[0.02]">
          <div className="relative w-full sm:w-80">
            <Search className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by code abbreviation..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-muted focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/20 text-muted uppercase text-[11px] tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Promo Code</th>
                <th className="px-6 py-4">Scope</th>
                <th className="px-6 py-4">Discount</th>
                <th className="px-6 py-4">Usage (Used / Limit)</th>
                <th className="px-6 py-4">Expiry Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && (
                 <tr>
                   <td colSpan="6" className="px-6 py-10 text-center text-muted">
                     <Activity className="w-6 h-6 animate-pulse mx-auto mb-2 text-primary" /> Syncing network configuration...
                   </td>
                 </tr>
              )}
              
              {!isLoading && filteredPromotions.filter(p => p.code.toLowerCase().includes(searchTerm.toLowerCase())).map((promo) => (
                <tr key={promo._id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Tag className="w-4 h-4" />
                      </div>
                      <span className="font-mono font-bold tracking-wider text-white bg-white/5 px-2 py-1 rounded inline-block">
                        {promo.code}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`w-fit px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        promo.scope === 'global' ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      }`}>
                        {promo.scope}
                      </span>
                      {promo.scope === 'local' && (
                         <span className="text-[10px] text-muted">Applied to {promo.theaterIds?.length || 0} branches</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 font-bold text-white/90">
                      {promo.type === 'percentage' ? (
                        <><Percent className="w-3.5 h-3.5 text-primary" /> {promo.value}% OFF</>
                      ) : (
                        <><span className="text-green-400">₹</span>{promo.value.toFixed(2)} OFF</>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-32">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60">{promo.used} used</span>
                        <span className="text-muted">{promo.isUnlimited ? 'Unlimited' : `${promo.limit} max`}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 border border-white/5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${(!promo.isUnlimited && promo.used >= promo.limit) ? 'bg-red-500' : 'bg-primary'}`} 
                          style={{ width: `${promo.isUnlimited ? 0 : Math.min((promo.used / promo.limit) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-white/70">
                      <CalendarDays className="w-4 h-4 text-muted" /> {promo.expiry}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenModal(promo)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer" title="Edit Properties">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(promo._id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors cursor-pointer" title="Revoke Code">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mint Modal */}
      <Modal isOpen={isMintOpen} onClose={() => setIsMintOpen(false)} title={currentPromo ? "Update Promotional Code" : "Mint Promotional Code"}>
        <form onSubmit={handleMint} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-[2]">
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1">Code Name</label>
              <input type="text" required value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary uppercase" placeholder="e.g. SUMMER50" />
            </div>
            <div className="flex-1">
               <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1">Scope</label>
               <select disabled={user?.role !== 'admin'} value={newPromo.scope} onChange={e => setNewPromo({...newPromo, scope: e.target.value})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary">
                 <option value="global">Global</option>
                 <option value="local">Local</option>
               </select>
            </div>
          </div>

          {/* Theater Selection (Only for Local Scope) */}
          {newPromo.scope === 'local' && (
             <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                <label className="block text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">Applicable Cinemas</label>
                <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                   {theaters.map(t => (
                      <label key={t._id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:border-primary/30 transition-all group">
                         <input 
                           type="checkbox" 
                           checked={newPromo.theaterIds.includes(t._id)}
                           onChange={() => toggleTheater(t._id)}
                           className="w-4 h-4 rounded border-white/10 bg-surface accent-primary"
                         />
                         <div className="flex flex-col">
                            <span className="text-xs font-bold text-white/80 group-hover:text-white">{t.name}</span>
                            <span className="text-[8px] text-muted uppercase">{t.location}</span>
                         </div>
                      </label>
                   ))}
                </div>
             </div>
          )}

          <div className="flex gap-4">
            <div className="flex-1">
               <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1">Type</label>
               <select value={newPromo.type} onChange={e => setNewPromo({...newPromo, type: e.target.value})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary">
                 <option value="percentage">Percentage OFF</option>
                 <option value="flat">Flat ₹ OFF</option>
               </select>
            </div>
            <div className="flex-1">
               <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1">Value</label>
               <input type="number" required value={newPromo.value} onChange={e => setNewPromo({...newPromo, value: e.target.value})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary" placeholder="e.g. 50" />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
               <div className="flex items-center justify-between mb-1">
                 <label className="block text-xs font-bold text-muted uppercase tracking-widest">Limit (Uses)</label>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newPromo.isUnlimited} onChange={e => setNewPromo({...newPromo, isUnlimited: e.target.checked})} className="w-4 h-4 rounded border-white/10 bg-surface accent-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase">Unlimited</span>
                 </label>
               </div>
               <input type="number" disabled={newPromo.isUnlimited} required={!newPromo.isUnlimited} value={newPromo.limit} onChange={e => setNewPromo({...newPromo, limit: e.target.value})} className={`w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary ${newPromo.isUnlimited ? 'opacity-30' : ''}`} />
            </div>
            <div className="flex-1">
               <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1">Expiry Date</label>
               <input type="date" required value={newPromo.expiry} onChange={e => setNewPromo({...newPromo, expiry: e.target.value})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary" />
            </div>
          </div>
          <div className="pt-4 border-t border-white/10 flex justify-end">
             <Button type="submit">{currentPromo ? "Update Voucher" : "Mint Voucher"}</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default AdminPromotions;

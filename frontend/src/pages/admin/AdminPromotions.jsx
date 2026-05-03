import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Search, Tag, Percent, Edit2, Trash2, CalendarDays, Activity, History, Clock, CheckCircle, Film, MapPin, User as UserIcon } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { fetchApi } from '../../services/api';

const AdminPromotions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [promotions, setPromotions] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isMintOpen, setIsMintOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('codes'); // 'codes' | 'history'
  
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

  const fetchUsageHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchApi('/promotions/usage-history');
      setUsageHistory(data);
    } catch (err) {
      console.error("Error fetching usage history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchUsageHistory();
  }, [activeTab]);

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
    const authorizedIds = theaters.map(t => t._id.toString());
    return (p.theaterIds || []).some(id => authorizedIds.includes(id.toString()));
  });

  // Split into active and expired
  const today = new Date().toISOString().split('T')[0];
  const searchFiltered = filteredPromotions.filter(p => p.code.toLowerCase().includes(searchTerm.toLowerCase()));
  const activePromos = searchFiltered.filter(p => p.expiry >= today);
  const expiredPromos = searchFiltered.filter(p => p.expiry < today);

  // Render a promo table row
  const renderPromoRow = (promo, isExpired = false) => (
    <tr key={promo._id} className={`hover:bg-white/[0.02] transition-colors group ${isExpired ? 'opacity-50' : ''}`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded flex items-center justify-center ${isExpired ? 'bg-white/5 border border-white/10 text-white/30' : 'bg-primary/10 border border-primary/20 text-primary'}`}>
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
              className={`h-1.5 rounded-full ${(!promo.isUnlimited && promo.used >= promo.limit) ? 'bg-red-500' : isExpired ? 'bg-white/20' : 'bg-primary'}`} 
              style={{ width: `${promo.isUnlimited ? 0 : Math.min((promo.used / promo.limit) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`flex items-center gap-1.5 ${isExpired ? 'text-red-400' : 'text-white/70'}`}>
          <CalendarDays className="w-4 h-4 text-muted" /> {promo.expiry}
          {isExpired && <span className="text-[9px] font-black uppercase bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded ml-1">Expired</span>}
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
  );

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
        {activeTab === 'codes' && (
          <Button onClick={() => handleOpenModal()} className="flex items-center shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <Plus className="w-5 h-5 mr-2" /> Mint New Code
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-surface/30 border border-white/5 rounded-2xl p-2 w-fit">
        <button
          onClick={() => setActiveTab('codes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'codes' ? 'bg-primary text-white shadow-[0_10px_20px_rgba(244,63,94,0.3)]' : 'text-muted hover:text-white'}`}
        >
          <Tag className="w-4 h-4" /> Promo Codes
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-secondary text-white shadow-[0_10px_20px_rgba(139,92,246,0.3)]' : 'text-muted hover:text-white'}`}
        >
          <History className="w-4 h-4" /> Usage History
        </button>
      </div>

      {/* ── USAGE HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="bg-surface/30 border border-white/5 rounded-[2.5rem] overflow-hidden">
          {historyLoading ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-secondary border-t-transparent animate-spin mx-auto mb-4"></div>
              <p className="text-muted uppercase tracking-widest text-xs font-bold">Loading History...</p>
            </div>
          ) : usageHistory.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl m-8">
              <History className="w-16 h-16 text-white/10 mx-auto mb-4" />
              <p className="text-muted italic">No promo code usage recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted/40 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5">
                    <th className="px-6 py-5 text-left">Promo Code</th>
                    <th className="px-6 py-5 text-left">Customer</th>
                    <th className="px-6 py-5 text-left">Movie</th>
                    <th className="px-6 py-5 text-left">Theater</th>
                    <th className="px-6 py-5 text-left">Amount</th>
                    <th className="px-6 py-5 text-left">Used On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usageHistory.map(booking => (
                    <tr key={booking._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-primary font-bold text-sm bg-primary/10 px-2 py-1 rounded">{booking.promoCode}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <UserIcon className="w-3.5 h-3.5 text-white/40" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{booking.user?.name}</div>
                            <div className="text-[10px] text-muted">{booking.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Film className="w-3.5 h-3.5 text-primary" />
                          <span className="font-bold text-white text-xs">{booking.showtime?.movie?.title || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-secondary" />
                          <span className="text-xs text-white/70">{booking.showtime?.theater?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-green-400">₹{booking.totalAmount?.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-muted text-xs">
                        {new Date(booking.createdAt).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PROMO CODES TAB ── */}
      {activeTab === 'codes' && (
        <div className="space-y-8">
          {/* Toolbar */}
          <div className="bg-surface/50 border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
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

          {isLoading ? (
            <div className="bg-surface/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="px-6 py-10 text-center text-muted">
                <Activity className="w-6 h-6 animate-pulse mx-auto mb-2 text-primary" /> Syncing network configuration...
              </div>
            </div>
          ) : (
            <>
              {/* Active Promos Section */}
              {activePromos.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white/60">Active Codes ({activePromos.length})</h2>
                  </div>
                  <div className="bg-surface/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
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
                          {activePromos.map(promo => renderPromoRow(promo, false))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Expired Promos Section */}
              {expiredPromos.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-red-500/70"></div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white/40">Expired Codes ({expiredPromos.length})</h2>
                    <div className="flex-1 h-px bg-white/5"></div>
                  </div>
                  <div className="bg-surface/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl opacity-60">
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
                          {expiredPromos.map(promo => renderPromoRow(promo, true))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* No promos at all */}
              {activePromos.length === 0 && expiredPromos.length === 0 && (
                <div className="bg-surface/50 border border-dashed border-white/10 rounded-2xl py-20 text-center">
                  <Tag className="w-16 h-16 text-white/10 mx-auto mb-4" />
                  <p className="text-muted italic">No promo codes found.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

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
               <select disabled={user?.role !== 'admin' && !(currentPromo && currentPromo.scope === 'global')} value={newPromo.scope} onChange={e => setNewPromo({...newPromo, scope: e.target.value})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary">
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

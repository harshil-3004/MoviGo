import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Gift, 
  Image as ImageIcon, 
  Coins, 
  Search,
  X,
  History,
  CheckCircle,
  Clock
} from 'lucide-react';
import { fetchApi } from '../../services/api';
import Button from '../../components/common/Button';
import { useSelector } from 'react-redux';

const AdminLoyaltyStore = () => {
  const { user } = useSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'history'
  const [items, setItems] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointCost: '',
    category: 'Snacks',
    image: '',
    isAvailable: true
  });

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchRedemptions();
  }, [activeTab]);

  const fetchItems = async () => {
    try {
      const data = await fetchApi('/users/redeemable-items');
      setItems(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching items:', error);
      setIsLoading(false);
    }
  };

  const fetchRedemptions = async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchApi('/users/admin/redemptions');
      setRedemptions(data);
    } catch (error) {
      console.error('Error fetching redemptions:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description,
        pointCost: item.pointCost,
        category: item.category,
        image: item.image || '',
        isAvailable: item.isAvailable
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        pointCost: '',
        category: 'Snacks',
        image: '',
        isAvailable: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        pointCost: Number(formData.pointCost)
      };

      if (editingItem) {
        await fetchApi(`/users/admin/items/${editingItem._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchApi('/users/admin/items', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (error) {
      alert('Error saving item');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this artifact from the vault?')) {
      try {
        await fetchApi(`/users/admin/items/${id}`, { method: 'DELETE' });
        fetchItems();
      } catch (error) {
        alert('Error deleting item');
      }
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white font-outfit uppercase tracking-tighter">Loyalty Store Vault</h1>
          <p className="text-muted text-sm">Manage redeemable artifacts and track redemption history</p>
        </div>
        {activeTab === 'items' && user?.role === 'admin' && (
          <Button onClick={() => handleOpenModal()} className="shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <Plus className="w-5 h-5 mr-2" /> Add New Artifact
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-surface/30 border border-white/5 rounded-2xl p-2 w-fit">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'items' ? 'bg-primary text-white shadow-[0_10px_20px_rgba(244,63,94,0.3)]' : 'text-muted hover:text-white'}`}
        >
          <Gift className="w-4 h-4" /> Store Items
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-secondary text-white shadow-[0_10px_20px_rgba(139,92,246,0.3)]' : 'text-muted hover:text-white'}`}
        >
          <History className="w-4 h-4" /> Redemption History
        </button>
      </div>

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="bg-surface/30 border border-white/5 rounded-[2.5rem] overflow-hidden">
          {historyLoading ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-secondary border-t-transparent animate-spin mx-auto mb-4"></div>
              <p className="text-muted uppercase tracking-widest text-xs font-bold">Loading History...</p>
            </div>
          ) : redemptions.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl m-8">
              <History className="w-16 h-16 text-white/10 mx-auto mb-4" />
              <p className="text-muted italic">No redemptions recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted/40 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5">
                    <th className="px-6 py-5 text-left">Code</th>
                    <th className="px-6 py-5 text-left">Item</th>
                    <th className="px-6 py-5 text-left">Customer</th>
                    <th className="px-6 py-5 text-left">Points</th>
                    <th className="px-6 py-5 text-left">Redeemed At</th>
                    <th className="px-6 py-5 text-left">Status</th>
                    <th className="px-6 py-5 text-left">Theater</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {redemptions.map(r => (
                    <tr key={r._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-secondary font-bold text-sm">{r.uniqueCode}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{r.item?.name}</div>
                        <div className="text-[10px] text-muted uppercase">{r.item?.category}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white/80">{r.user?.name}</div>
                        <div className="text-[10px] text-muted">{r.user?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-white">{r.pointsSpent} pts</span>
                      </td>
                      <td className="px-6 py-4 text-muted text-xs">{new Date(r.createdAt).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        {r.isUsed ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                            <CheckCircle className="w-3.5 h-3.5" /> Used
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted text-xs">{r.usedByTheater?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STORE ITEMS TAB ── */}
      {activeTab === 'items' && (
        <div className="bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-3xl">
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="Search artifacts or categories..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
              <p className="text-muted uppercase tracking-widest text-xs font-bold">Scanning Vault...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
              <Gift className="w-16 h-16 text-white/10 mx-auto mb-4" />
              <p className="text-muted italic">No artifacts found in this sector.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <div key={item._id} className="bg-surface/50 border border-white/10 rounded-3xl overflow-hidden group hover:border-primary/40 transition-all border-glow">
                  <div className="h-48 relative overflow-hidden bg-black/40">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-white/10" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-secondary" />
                      <span className="text-sm font-black text-white">{item.pointCost}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-white font-outfit">{item.name}</h3>
                      <span className="text-[10px] font-black uppercase text-primary tracking-widest px-2 py-1 bg-primary/10 rounded-lg">{item.category}</span>
                    </div>
                    <p className="text-xs text-muted line-clamp-2 mb-6 h-8">{item.description}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.isAvailable ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">{item.isAvailable ? 'In Stock' : 'Out of Stock'}</span>
                      </div>
                      {user?.role === 'admin' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleOpenModal(item)} className="p-2 bg-white/5 hover:bg-primary/20 text-white/40 hover:text-primary rounded-xl transition-all border border-white/5">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item._id)} className="p-2 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 rounded-xl transition-all border border-white/5">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-surface border border-white/10 w-full max-w-xl rounded-[2.5rem] overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white font-outfit uppercase tracking-tighter">
                {editingItem ? 'Edit Artifact' : 'New Artifact Acquisition'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Artifact Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Description</label>
                    <textarea 
                      rows="3"
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Point Cost</label>
                    <input 
                      type="number" 
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary font-mono"
                      value={formData.pointCost}
                      onChange={(e) => setFormData({...formData, pointCost: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Category</label>
                    <select 
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="Snacks">Snacks</option>
                      <option value="Drinks">Drinks</option>
                      <option value="Merchandise">Merchandise</option>
                      <option value="Tickets">Tickets</option>
                      <option value="Experiences">Experiences</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-widest">Image URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary"
                      value={formData.image}
                      onChange={(e) => setFormData({...formData, image: e.target.value})}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="isAvailable"
                      className="w-5 h-5 rounded-lg border-white/10 bg-black/40 text-primary focus:ring-0"
                      checked={formData.isAvailable}
                      onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})}
                    />
                    <label htmlFor="isAvailable" className="text-sm text-white font-bold">Currently Available for Exchange</label>
                  </div>
                </div>
              </div>
              
              <div className="p-8 border-t border-white/10 flex justify-end gap-4 bg-black/20">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 text-xs font-black uppercase tracking-widest text-muted hover:text-white transition-all"
                >
                  Cancel
                </button>
                <Button type="submit" className="px-10 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                  {editingItem ? 'Update Vault' : 'Add to Vault'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoyaltyStore;

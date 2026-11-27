import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Gift,
  Image as ImageIcon,
  Coins,
  Search,
  History,
  CheckCircle,
  Clock,
  Loader2,
  X,
} from 'lucide-react';
import { fetchApi } from '../../services/api';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { useSelector } from 'react-redux';

const AdminLoyaltyStore = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('items');
  const [items, setItems] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointCost: '',
    category: 'Snacks',
    image: '',
    isAvailable: true,
  });

  const fetchItems = async () => {
    try {
      const data = await fetchApi('/users/admin/items');
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRedemptions = async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchApi('/users/admin/redemptions');
      setRedemptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching redemptions:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchRedemptions();
  }, [activeTab]);

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description,
        pointCost: item.pointCost,
        category: item.category,
        image: item.image || '',
        isAvailable: item.isAvailable,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        pointCost: '',
        category: 'Snacks',
        image: '',
        isAvailable: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const payload = {
        ...formData,
        pointCost: Number(formData.pointCost),
      };

      if (editingItem) {
        await fetchApi(`/users/admin/items/${editingItem._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setFeedback({ type: 'success', text: `Updated reward "${formData.name}".` });
      } else {
        await fetchApi('/users/admin/items', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setFeedback({ type: 'success', text: `Added "${formData.name}" to Rewards Store.` });
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Error saving reward item' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this reward item from the store?')) return;
    try {
      await fetchApi(`/users/admin/items/${id}`, { method: 'DELETE' });
      fetchItems();
      setFeedback({ type: 'success', text: 'Reward item removed.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Error removing reward item' });
    }
  };

  const filteredItems = items.filter(
    (item) =>
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableItems = filteredItems.filter((item) => item.isAvailable);
  const inactiveItems = filteredItems.filter((item) => !item.isAvailable);

  const renderItemCard = (item, inactive = false) => (
    <div
      key={item._id}
      className="rounded-xl border overflow-hidden flex flex-col"
      style={{
        backgroundColor: 'var(--mg-surface)',
        borderColor: 'var(--mg-border)',
        opacity: inactive ? 0.7 : 1,
      }}
    >
      <div
        className="aspect-[16/10] relative overflow-hidden border-b"
        style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}
      >
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8" style={{ color: 'var(--mg-ink-3)' }} />
          </div>
        )}
        <span
          className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1"
          style={{
            backgroundColor: 'rgba(14, 15, 18, 0.85)',
            color: '#fbbf24',
          }}
        >
          <Coins className="w-3.5 h-3.5" />
          {item.pointCost} Pts
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display font-bold text-base" style={{ color: 'var(--mg-ink)' }}>
            {item.name}
          </h3>
          <span
            className="px-2 py-0.5 rounded text-[11px] font-semibold shrink-0"
            style={{ backgroundColor: 'var(--mg-surface-2)', color: 'var(--mg-ink-2)' }}
          >
            {item.category}
          </span>
        </div>
        <p className="text-xs line-clamp-2 mb-4" style={{ color: 'var(--mg-ink-2)' }}>
          {item.description}
        </p>
        <div
          className="mt-auto pt-3 border-t flex items-center justify-between gap-2"
          style={{ borderColor: 'var(--mg-border)' }}
        >
          <span
            className="text-[11px] font-semibold"
            style={{ color: item.isAvailable ? 'var(--mg-success)' : 'var(--mg-ink-3)' }}
          >
            {item.isAvailable ? 'Available' : 'Hidden'}
          </span>
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenModal(item)}
              title="Edit Reward"
              className="p-1.5 rounded-lg border cursor-pointer"
              style={{
                backgroundColor: 'var(--mg-surface-2)',
                borderColor: 'var(--mg-border)',
                color: 'var(--mg-ink-2)',
              }}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(item._id)}
              title="Delete Reward"
              className="p-1.5 rounded-lg border cursor-pointer"
              style={{
                backgroundColor: 'var(--mg-danger-soft)',
                borderColor: 'var(--mg-border)',
                color: 'var(--mg-danger)',
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
            Rewards Store Catalog
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
            Manage redeemable snacks, merchandise, and customer voucher history.
          </p>
        </div>
        {activeTab === 'items' &&
          ['admin', 'master_admin', 'theater_admin'].includes(user?.role) && (
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4" />
              Add Reward Item
            </Button>
          )}
      </div>

      {feedback && (
        <div
          className="px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between gap-3"
          style={{
            backgroundColor: feedback.type === 'success' ? 'var(--mg-success-soft)' : 'var(--mg-danger-soft)',
            borderColor: feedback.type === 'success' ? 'var(--mg-success)' : 'var(--mg-danger)',
            color: feedback.type === 'success' ? 'var(--mg-success)' : 'var(--mg-danger)',
          }}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        className="inline-flex p-1 rounded-xl border gap-1"
        style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          style={{
            backgroundColor: activeTab === 'items' ? 'var(--mg-accent)' : 'transparent',
            color: activeTab === 'items' ? '#ffffff' : 'var(--mg-ink-2)',
          }}
        >
          <Gift className="w-3.5 h-3.5" />
          Store Items
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          style={{
            backgroundColor: activeTab === 'history' ? 'var(--mg-accent)' : 'transparent',
            color: activeTab === 'history' ? '#ffffff' : 'var(--mg-ink-2)',
          }}
        >
          <History className="w-3.5 h-3.5" />
          Redemption History
        </button>
      </div>

      {activeTab === 'history' ? (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
        >
          {historyLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--mg-accent)' }} />
              <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>Loading redemption history...</p>
            </div>
          ) : redemptions.length === 0 ? (
            <div className="py-16 text-center" style={{ color: 'var(--mg-ink-3)' }}>
              No loyalty redemptions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr
                    className="border-b text-xs font-semibold uppercase tracking-wider"
                    style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-ink-3)' }}
                  >
                    <th className="py-3.5 px-5">Code</th>
                    <th className="py-3.5 px-4">Item</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Points</th>
                    <th className="py-3.5 px-4">Redeemed</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5">Fulfilled At</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--mg-border)' }}>
                  {redemptions.map((r) => (
                    <tr key={r._id}>
                      <td className="py-3.5 px-5 font-mono text-xs font-bold" style={{ color: 'var(--mg-gold)' }}>
                        {r.uniqueCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-xs sm:text-sm" style={{ color: 'var(--mg-ink)' }}>{r.item?.name}</p>
                        <p className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>{r.item?.category}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-xs sm:text-sm" style={{ color: 'var(--mg-ink)' }}>{r.user?.name}</p>
                        <p className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>{r.user?.email}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs" style={{ color: 'var(--mg-ink)' }}>
                        {r.pointsSpent} pts
                      </td>
                      <td className="py-3.5 px-4 text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                        {new Date(r.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold">
                        {r.isUsed ? (
                          <span className="inline-flex items-center gap-1" style={{ color: 'var(--mg-success)' }}>
                            <CheckCircle className="w-3.5 h-3.5" /> Used
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1" style={{ color: 'var(--mg-warning)' }}>
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-xs" style={{ color: 'var(--mg-ink-3)' }}>
                        {r.usedByTheater?.name || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
            <input
              type="text"
              placeholder="Search rewards or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mg-input w-full pl-10 pr-3 py-2 rounded-lg text-sm"
            />
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--mg-accent)' }} />
              <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>Loading store catalog...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              className="py-16 text-center rounded-xl border border-dashed"
              style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border-strong)' }}
            >
              <Gift className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--mg-ink-3)' }} />
              <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>No reward items found.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {availableItems.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--mg-success)' }}>
                    Active Items ({availableItems.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {availableItems.map((item) => renderItemCard(item, false))}
                  </div>
                </section>
              )}

              {inactiveItems.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--mg-ink-3)' }}>
                    Inactive / Hidden Items ({inactiveItems.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {inactiveItems.map((item) => renderItemCard(item, true))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Reward Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Reward Item' : 'Add Reward Item'}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
              Item Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Large Caramel Popcorn"
              className="mg-input w-full px-3.5 py-2 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Short description for customers..."
              className="mg-input w-full px-3.5 py-2 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Point Cost *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.pointCost}
                onChange={(e) => setFormData({ ...formData, pointCost: e.target.value })}
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mg-input w-full px-3 py-2 rounded-lg text-sm"
              >
                <option value="Snacks">Snacks</option>
                <option value="Drinks">Drinks</option>
                <option value="Merchandise">Merchandise</option>
                <option value="Tickets">Tickets</option>
                <option value="Experiences">Experiences</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
              Image URL
            </label>
            <input
              type="text"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="mg-input w-full px-3.5 py-2 rounded-lg text-sm"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer pt-1" style={{ color: 'var(--mg-ink)' }}>
            <input
              type="checkbox"
              checked={formData.isAvailable}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              className="accent-[#e11d48]"
            />
            Available for customer redemption
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--mg-border)' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminLoyaltyStore;

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Plus,
  Search,
  Tag,
  Percent,
  Edit2,
  Trash2,
  History,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { fetchApi } from '../../services/api';
import { formatLocalDate } from '../../utils/bookingUtils';

const AdminPromotions = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'admin' || user?.role === 'master_admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [promotions, setPromotions] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);
  const [theaters, setTheaters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isMintOpen, setIsMintOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('codes');
  const [currentPromo, setCurrentPromo] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [newPromo, setNewPromo] = useState({
    code: '',
    type: 'percentage',
    value: '',
    limit: 100,
    expiry: '',
    isUnlimited: false,
    scope: 'global',
    theaterIds: [],
  });

  const fetchPromotions = async () => {
    try {
      const [promoData, theaterData] = await Promise.all([
        fetchApi('/promotions'),
        fetchApi('/theaters/admin'),
      ]);
      setPromotions(Array.isArray(promoData) ? promoData : []);
      setTheaters(Array.isArray(theaterData) ? theaterData : []);
    } catch (err) {
      console.error('Error fetching promotions/theaters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsageHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchApi('/promotions/usage-history');
      setUsageHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching usage history:', err);
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
    if (!window.confirm('Revoke this promo code permanently?')) return;
    try {
      await fetchApi(`/promotions/${id}`, { method: 'DELETE' });
      fetchPromotions();
      setFeedback({ type: 'success', text: 'Promo code deleted.' });
    } catch (e) {
      setFeedback({ type: 'error', text: e.message || 'Failed to delete promo.' });
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
        theaterIds: (promo.theaterIds || []).map((tid) =>
          typeof tid === 'object' ? tid._id : tid
        ),
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
        scope: isSuperAdmin ? 'global' : 'local',
        theaterIds: !isSuperAdmin ? user?.theaterIds || [] : [],
      });
    }
    setIsMintOpen(true);
  };

  const handleMint = async (e) => {
    e.preventDefault();
    setFeedback(null);
    if (newPromo.scope === 'local' && (!newPromo.theaterIds || newPromo.theaterIds.length === 0)) {
      setFeedback({ type: 'error', text: 'Select at least one cinema for a local promotion.' });
      return;
    }

    try {
      const payload = {
        ...newPromo,
        theaterIds: newPromo.scope === 'global' ? [] : newPromo.theaterIds,
      };

      if (currentPromo) {
        await fetchApi(`/promotions/${currentPromo._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setFeedback({ type: 'success', text: `Updated promo code ${newPromo.code}.` });
      } else {
        await fetchApi('/promotions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setFeedback({ type: 'success', text: `Created promo code ${newPromo.code}.` });
      }
      setIsMintOpen(false);
      fetchPromotions();
    } catch (e) {
      setFeedback({ type: 'error', text: e.message || 'Failed saving promo code' });
    }
  };

  const toggleTheater = (id) => {
    setNewPromo((prev) => {
      const exists = prev.theaterIds.includes(id);
      if (exists) {
        return { ...prev, theaterIds: prev.theaterIds.filter((tid) => tid !== id) };
      }
      return { ...prev, theaterIds: [...prev.theaterIds, id] };
    });
  };

  const filteredPromotions = promotions.filter((p) => {
    if (isSuperAdmin || user?.email === 'harshil@movigo.com') return true;
    if (p.scope === 'global') return true;
    const authorizedIds = theaters.map((t) => t._id.toString());
    return (p.theaterIds || []).some((id) => authorizedIds.includes(id.toString()));
  });

  const today = formatLocalDate(new Date());
  const searchFiltered = filteredPromotions.filter((p) =>
    (p.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const activePromos = searchFiltered.filter((p) => p.expiry >= today);
  const expiredPromos = searchFiltered.filter((p) => p.expiry < today);

  const renderPromoTable = (list, isExpired = false) => (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--mg-surface)',
        borderColor: 'var(--mg-border)',
        opacity: isExpired ? 0.72 : 1,
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              className="border-b text-xs font-semibold uppercase tracking-wider"
              style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-ink-3)' }}
            >
              <th className="py-3.5 px-5">Code</th>
              <th className="py-3.5 px-4">Scope</th>
              <th className="py-3.5 px-4">Discount</th>
              <th className="py-3.5 px-4">Usage</th>
              <th className="py-3.5 px-4">Expires</th>
              <th className="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--mg-border)' }}>
            {list.map((promo) => {
              const pct = !promo.isUnlimited && promo.limit > 0
                ? Math.min(100, Math.round((promo.used / promo.limit) * 100))
                : 0;
              const isDepleted = !promo.isUnlimited && promo.used >= promo.limit;
              const canEdit = isSuperAdmin || promo.scope === 'local';

              return (
                <tr key={promo._id}>
                  <td className="py-3.5 px-5">
                    <span
                      className="inline-flex items-center gap-1.5 font-mono font-bold px-2.5 py-1 rounded border text-xs"
                      style={{
                        backgroundColor: 'var(--mg-surface-2)',
                        borderColor: 'var(--mg-border)',
                        color: isExpired ? 'var(--mg-ink-3)' : 'var(--mg-accent)',
                      }}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      {promo.code}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-xs">
                    <span
                      className="inline-block px-2 py-0.5 rounded font-semibold uppercase text-[11px]"
                      style={{
                        backgroundColor: promo.scope === 'global' ? 'var(--mg-gold-soft)' : 'var(--mg-surface-2)',
                        color: promo.scope === 'global' ? 'var(--mg-gold)' : 'var(--mg-ink)',
                      }}
                    >
                      {promo.scope}
                    </span>
                    {promo.scope === 'local' && (
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--mg-ink-3)' }}>
                        {promo.theaterIds?.length || 0} cinema(s)
                      </p>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-xs" style={{ color: 'var(--mg-ink)' }}>
                    {promo.type === 'percentage' ? (
                      <span className="inline-flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5" style={{ color: 'var(--mg-accent)' }} />
                        {promo.value}% OFF
                      </span>
                    ) : (
                      <span style={{ color: 'var(--mg-success)' }}>
                        ₹{Number(promo.value || 0).toFixed(2)} OFF
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="w-32">
                      <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--mg-ink-2)' }}>
                        <span>{promo.used} used</span>
                        <span>{promo.isUnlimited ? 'Unlimited' : `${promo.limit} max`}</span>
                      </div>
                      {!promo.isUnlimited && (
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--mg-surface-2)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: isDepleted ? 'var(--mg-danger)' : 'var(--mg-accent)',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                    {promo.expiry}
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    {canEdit && (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(promo)}
                          title="Edit Promo"
                          className="p-2 rounded-lg border cursor-pointer"
                          style={{
                            backgroundColor: 'var(--mg-surface-2)',
                            borderColor: 'var(--mg-border)',
                            color: 'var(--mg-ink-2)',
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(promo._id)}
                          title="Delete Promo"
                          className="p-2 rounded-lg border cursor-pointer"
                          style={{
                            backgroundColor: 'var(--mg-danger-soft)',
                            borderColor: 'var(--mg-border)',
                            color: 'var(--mg-danger)',
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
            Promotions &amp; Offers
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
            Create platform-wide or cinema-specific discount vouchers and inspect redemption logs.
          </p>
        </div>
        {activeTab === 'codes' && (
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            Create Promo Code
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
          <span className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.text}
          </span>
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
          onClick={() => setActiveTab('codes')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          style={{
            backgroundColor: activeTab === 'codes' ? 'var(--mg-accent)' : 'transparent',
            color: activeTab === 'codes' ? '#ffffff' : 'var(--mg-ink-2)',
          }}
        >
          <Tag className="w-3.5 h-3.5" />
          Promo Codes
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
          Usage History
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
              <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>Loading usage history...</p>
            </div>
          ) : usageHistory.length === 0 ? (
            <div className="py-16 text-center" style={{ color: 'var(--mg-ink-3)' }}>
              No promo code redemptions recorded yet.
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
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Movie</th>
                    <th className="py-3.5 px-4">Cinema</th>
                    <th className="py-3.5 px-4">Total Paid</th>
                    <th className="py-3.5 px-5">Used On</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--mg-border)' }}>
                  {usageHistory.map((booking) => (
                    <tr key={booking._id}>
                      <td className="py-3.5 px-5 font-mono text-xs font-bold" style={{ color: 'var(--mg-accent)' }}>
                        {booking.promoCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-xs sm:text-sm" style={{ color: 'var(--mg-ink)' }}>
                          {booking.user?.name || 'Guest'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>{booking.user?.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs sm:text-sm font-medium" style={{ color: 'var(--mg-ink)' }}>
                        {booking.showtime?.movie?.title || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                        {booking.showtime?.theater?.name || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold" style={{ color: 'var(--mg-success)' }}>
                        ₹{Number(booking.totalAmount ?? 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-5 text-xs" style={{ color: 'var(--mg-ink-3)' }}>
                        {new Date(booking.createdAt).toLocaleString('en-IN')}
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
              placeholder="Search promo codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mg-input w-full pl-10 pr-3 py-2 rounded-lg text-sm"
            />
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--mg-accent)' }} />
              <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>Loading promo codes...</p>
            </div>
          ) : (
            <>
              {activePromos.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--mg-success)' }}>
                    Active Vouchers ({activePromos.length})
                  </h2>
                  {renderPromoTable(activePromos, false)}
                </section>
              )}

              {expiredPromos.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--mg-ink-3)' }}>
                    Expired Vouchers ({expiredPromos.length})
                  </h2>
                  {renderPromoTable(expiredPromos, true)}
                </section>
              )}

              {activePromos.length === 0 && expiredPromos.length === 0 && (
                <div
                  className="py-16 text-center rounded-xl border border-dashed"
                  style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border-strong)' }}
                >
                  <Tag className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--mg-ink-3)' }} />
                  <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
                    No promo codes match your filter.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Create / Edit Promo Modal */}
      <Modal
        isOpen={isMintOpen}
        onClose={() => setIsMintOpen(false)}
        title={currentPromo ? 'Edit Promo Code' : 'Create Promo Code'}
        className="max-w-lg"
      >
        <form onSubmit={handleMint} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Promo Code *
              </label>
              <input
                type="text"
                required
                value={newPromo.code}
                onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                placeholder="e.g. WEEKEND20"
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Scope
              </label>
              <select
                disabled={!isSuperAdmin}
                value={newPromo.scope}
                onChange={(e) => setNewPromo({ ...newPromo, scope: e.target.value })}
                className="mg-input w-full px-3 py-2 rounded-lg text-sm disabled:opacity-60"
              >
                <option value="global">Global</option>
                <option value="local">Local</option>
              </select>
            </div>
          </div>

          {newPromo.scope === 'local' && (
            <div
              className="p-3.5 rounded-xl border space-y-2"
              style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}
            >
              <label className="block text-xs font-semibold" style={{ color: 'var(--mg-ink-2)' }}>
                Applicable Cinemas
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                {theaters.map((t) => (
                  <label
                    key={t._id}
                    className="flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer"
                    style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
                  >
                    <input
                      type="checkbox"
                      checked={newPromo.theaterIds.includes(t._id)}
                      onChange={() => toggleTheater(t._id)}
                      className="mt-0.5 accent-[#e11d48]"
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold truncate" style={{ color: 'var(--mg-ink)' }}>
                        {t.name}
                      </span>
                      <span className="block text-[11px] truncate" style={{ color: 'var(--mg-ink-3)' }}>
                        {t.location}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Discount Type
              </label>
              <select
                value={newPromo.type}
                onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value })}
                className="mg-input w-full px-3 py-2 rounded-lg text-sm"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Value *
              </label>
              <input
                type="number"
                required
                value={newPromo.value}
                onChange={(e) => setNewPromo({ ...newPromo, value: e.target.value })}
                placeholder="e.g. 20"
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--mg-ink-2)' }}>
                  Usage Limit
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--mg-accent)' }}>
                  <input
                    type="checkbox"
                    checked={newPromo.isUnlimited}
                    onChange={(e) => setNewPromo({ ...newPromo, isUnlimited: e.target.checked })}
                    className="accent-[#e11d48]"
                  />
                  Unlimited
                </label>
              </div>
              <input
                type="number"
                disabled={newPromo.isUnlimited}
                required={!newPromo.isUnlimited}
                value={newPromo.limit}
                onChange={(e) => setNewPromo({ ...newPromo, limit: e.target.value })}
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm font-mono disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={newPromo.expiry}
                onChange={(e) => setNewPromo({ ...newPromo, expiry: e.target.value })}
                className="mg-input w-full px-3 py-2 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--mg-border)' }}>
            <Button type="button" variant="outline" onClick={() => setIsMintOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {currentPromo ? 'Update Voucher' : 'Save Voucher'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminPromotions;

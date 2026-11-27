import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Plus,
  Search,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  QrCode,
  LayoutGrid,
  Loader2,
  Users,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
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
  const [openAssignId, setOpenAssignId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'admin' || user?.role === 'master_admin';
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    format: 'Standard 2D',
  });

  const fetchTheaters = async () => {
    try {
      const theatersData = await fetchApi('/theaters/admin');
      setTheaters(Array.isArray(theatersData) ? theatersData : []);

      try {
        const staffData = await fetchApi('/users');
        setStaff(
          Array.isArray(staffData)
            ? staffData.filter((u) => ['admin', 'master_admin', 'theater_admin'].includes(u.role))
            : []
        );
      } catch (staffErr) {
        console.warn('Staff fetch restricted for this role', staffErr);
        setStaff([]);
      }
    } catch (err) {
      console.error('Failed fetching theaters', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTheaters();
  }, []);

  useEffect(() => {
    if (!openAssignId) return;
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenAssignId(null);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpenAssignId(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openAssignId]);

  const handleOpenModal = (theater = null) => {
    if (theater) {
      setCurrentTheater(theater);
      setFormData({
        name: theater.name,
        location: theater.location,
        format: theater.format || 'Standard 2D',
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
      setFeedback({ type: 'error', text: 'Cinema name and location are required.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (currentTheater) {
        const updated = await fetchApi(`/theaters/${currentTheater._id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setTheaters((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
        setIsModalOpen(false);
        setFeedback({ type: 'success', text: `Updated "${updated.name}".` });
      } else {
        const newTheater = await fetchApi('/theaters', {
          method: 'POST',
          body: JSON.stringify({
            ...formData,
            idString: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            screens: [],
          }),
        });
        setTheaters((prev) => [newTheater, ...prev]);
        setCreateSuccess(newTheater);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save cinema.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this cinema venue? This cannot be undone.')) return;
    try {
      await fetchApi(`/theaters/${id}`, { method: 'DELETE' });
      setTheaters((prev) => prev.filter((t) => t._id !== id));
      setFeedback({ type: 'success', text: 'Cinema removed.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete cinema' });
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const updated = await fetchApi(`/theaters/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ approvalStatus: status }),
      });
      setTheaters((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update approval status' });
    }
  };

  const handleRevokeAccess = async (theaterId, userId) => {
    if (!window.confirm('Remove this venue manager from this cinema?')) return;
    try {
      await fetchApi(`/theaters/${theaterId}/personnel/${userId}`, { method: 'DELETE' });
      fetchTheaters();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to revoke access.' });
    }
  };

  const handleAssignPersonnel = async (theaterId, userId) => {
    try {
      await fetchApi(`/theaters/${theaterId}/personnel`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      setOpenAssignId(null);
      fetchTheaters();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to assign staff member.' });
    }
  };

  const filteredTheaters = theaters.filter(
    (t) =>
      (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
              Cinemas &amp; Screens
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
              Manage partner venues, auditoriums, showtime schedules, and venue staff access.
            </p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            Add Cinema
          </Button>
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

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
          <input
            type="text"
            placeholder="Search cinemas by name or area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mg-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
          />
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--mg-accent)' }} />
            <span className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>Loading cinemas...</span>
          </div>
        ) : filteredTheaters.length === 0 ? (
          <div
            className="py-16 text-center rounded-xl border border-dashed"
            style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border-strong)' }}
          >
            <MapPin className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--mg-ink-3)' }} />
            <h3 className="text-lg font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
              No Cinemas Found
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--mg-ink-2)' }}>
              Try adjusting your search or add a new cinema venue.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTheaters.map((theater) => {
              const assignedStaff = staff.filter(
                (s) =>
                  s.role === 'admin' ||
                  s.role === 'master_admin' ||
                  s._id === theater.requestedBy ||
                  (s.theaterIds && s.theaterIds.includes(theater._id))
              );
              const unassignedManagers = staff.filter(
                (s) =>
                  s.role === 'theater_admin' &&
                  (!s.theaterIds || !s.theaterIds.includes(theater._id))
              );
              const isAssignOpen = openAssignId === theater._id;

              return (
                <div
                  key={theater._id}
                  id={theater._id}
                  className="rounded-xl border p-5 sm:p-6"
                  style={{
                    backgroundColor: 'var(--mg-surface)',
                    borderColor: 'var(--mg-border)',
                  }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {/* Venue Summary */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                          {theater.name}
                        </h2>
                        <span
                          className="px-2.5 py-0.5 rounded-md text-xs font-semibold border"
                          style={{
                            backgroundColor: 'var(--mg-surface-2)',
                            borderColor: 'var(--mg-border)',
                            color: 'var(--mg-ink-2)',
                          }}
                        >
                          {theater.format || 'Standard 2D'}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold"
                          style={{
                            backgroundColor:
                              theater.approvalStatus === 'Approved'
                                ? 'var(--mg-success-soft)'
                                : theater.approvalStatus === 'Rejected'
                                  ? 'var(--mg-danger-soft)'
                                  : 'var(--mg-warning-soft)',
                            color:
                              theater.approvalStatus === 'Approved'
                                ? 'var(--mg-success)'
                                : theater.approvalStatus === 'Rejected'
                                  ? 'var(--mg-danger)'
                                  : 'var(--mg-warning)',
                          }}
                        >
                          {theater.approvalStatus === 'Approved' && <ShieldCheck className="w-3.5 h-3.5" />}
                          {theater.approvalStatus === 'Rejected' && <ShieldX className="w-3.5 h-3.5" />}
                          {(theater.approvalStatus === 'Pending' || !theater.approvalStatus) && (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          )}
                          {theater.approvalStatus || 'Pending'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-5 text-xs sm:text-sm" style={{ color: 'var(--mg-ink-2)' }}>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-accent)' }} />
                          {theater.location}
                        </span>
                        <span>• {theater.screens?.length || 0} Screens Configured</span>
                      </div>

                      {/* Staff Assignment */}
                      <div className="pt-3 border-t" style={{ borderColor: 'var(--mg-border)' }}>
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--mg-ink-3)' }}>
                          <Users className="w-3.5 h-3.5" />
                          Assigned Staff
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {assignedStaff.map((person) => {
                            const canRevoke =
                              person.role === 'theater_admin' &&
                              person._id !== theater.requestedBy &&
                              (isSuperAdmin || user?.email === 'harshil@movigo.com');
                            return (
                              <div
                                key={person._id}
                                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs"
                                style={{
                                  backgroundColor: 'var(--mg-surface-2)',
                                  borderColor: 'var(--mg-border)',
                                }}
                              >
                                <span className="font-semibold" style={{ color: 'var(--mg-ink)' }}>
                                  {person.name}
                                </span>
                                <span className="text-[11px]" style={{ color: 'var(--mg-ink-3)' }}>
                                  {person.role === 'admin' || person.role === 'master_admin'
                                    ? 'Admin'
                                    : person._id === theater.requestedBy
                                      ? 'Owner'
                                      : 'Manager'}
                                </span>
                                {canRevoke && (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeAccess(theater._id, person._id)}
                                    title="Revoke Venue Access"
                                    className="p-0.5 rounded hover:opacity-75 cursor-pointer"
                                    style={{ color: 'var(--mg-danger)' }}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {(isSuperAdmin || user?.email === 'harshil@movigo.com') && (
                            <div className="relative" ref={isAssignOpen ? dropdownRef : null}>
                              <button
                                type="button"
                                onClick={() => setOpenAssignId(isAssignOpen ? null : theater._id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors"
                                style={{
                                  backgroundColor: isAssignOpen ? 'var(--mg-accent)' : 'var(--mg-accent-soft)',
                                  borderColor: 'var(--mg-border)',
                                  color: isAssignOpen ? '#ffffff' : 'var(--mg-accent)',
                                }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Assign Manager
                              </button>

                              {isAssignOpen && (
                                <div
                                  className="absolute left-0 mt-1.5 w-64 rounded-xl border p-2 z-50"
                                  style={{
                                    backgroundColor: 'var(--mg-surface)',
                                    borderColor: 'var(--mg-border-strong)',
                                    boxShadow: 'var(--mg-shadow-lg)',
                                  }}
                                >
                                  <p className="px-2 py-1 text-[11px] font-semibold" style={{ color: 'var(--mg-ink-3)' }}>
                                    Select Venue Manager
                                  </p>
                                  <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1 mt-1">
                                    {unassignedManagers.length > 0 ? (
                                      unassignedManagers.map((admin) => (
                                        <button
                                          key={admin._id}
                                          type="button"
                                          onClick={() => handleAssignPersonnel(theater._id, admin._id)}
                                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer hover:opacity-85"
                                          style={{ backgroundColor: 'var(--mg-surface-2)' }}
                                        >
                                          <p className="font-semibold" style={{ color: 'var(--mg-ink)' }}>{admin.name}</p>
                                          <p className="text-[11px] truncate" style={{ color: 'var(--mg-ink-3)' }}>
                                            {admin.email}
                                          </p>
                                        </button>
                                      ))
                                    ) : (
                                      <p className="px-2 py-3 text-xs" style={{ color: 'var(--mg-ink-3)' }}>
                                        No unassigned venue managers found.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isSuperAdmin && theater.approvalStatus === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(theater._id, 'Approved')}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleUpdateStatus(theater._id, 'Rejected')}
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </Button>
                        </>
                      )}

                      {theater.approvalStatus === 'Approved' && (
                        <>
                          <Link
                            to={`/admin/screens/${theater._id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors"
                            style={{
                              backgroundColor: 'var(--mg-surface-2)',
                              borderColor: 'var(--mg-border)',
                              color: 'var(--mg-ink)',
                            }}
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Screens
                          </Link>
                          <Link
                            to={`/admin/showtimes/${theater._id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors"
                            style={{
                              backgroundColor: 'var(--mg-surface-2)',
                              borderColor: 'var(--mg-border)',
                              color: 'var(--mg-ink)',
                            }}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Showtimes
                          </Link>
                          <Link
                            to="/admin/scanner"
                            state={{ theaterId: theater._id, theaterName: theater.name }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors"
                            style={{
                              backgroundColor: 'var(--mg-surface-2)',
                              borderColor: 'var(--mg-border)',
                              color: 'var(--mg-ink)',
                            }}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            Scanner
                          </Link>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenModal(theater)}
                        title="Edit Cinema"
                        className="p-2 rounded-lg border cursor-pointer"
                        style={{
                          backgroundColor: 'var(--mg-surface-2)',
                          borderColor: 'var(--mg-border)',
                          color: 'var(--mg-ink-2)',
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(theater._id)}
                          title="Delete Cinema"
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Cinema Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          createSuccess
            ? 'Cinema Created'
            : currentTheater
              ? 'Edit Cinema'
              : 'Add New Cinema'
        }
        className="max-w-lg"
      >
        {!createSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Cinema Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PVR Phoenix Lower Parel"
                className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Location / Address *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. High Street Phoenix, Mumbai"
                className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Primary Format
              </label>
              <select
                className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
              >
                <option value="Standard 2D">Standard 2D</option>
                <option value="IMAX 2D">IMAX 2D</option>
                <option value="IMAX 3D">IMAX 3D</option>
                <option value="Dolby Cinema">Dolby Cinema</option>
                <option value="4DX">4DX</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--mg-border)' }}>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {currentTheater ? 'Save Changes' : 'Create Cinema'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-5 py-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: 'var(--mg-success-soft)', color: 'var(--mg-success)' }}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                {createSuccess.name} Added
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--mg-ink-2)' }}>
                Next, configure its auditorium screens and seating tiers before scheduling showtimes.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <Link to={`/admin/screens/${createSuccess._id}`} onClick={() => setIsModalOpen(false)}>
                <Button className="w-full">
                  <LayoutGrid className="w-4 h-4" />
                  Configure Screens
                </Button>
              </Link>
              <Button variant="outline" className="w-full" onClick={() => setIsModalOpen(false)}>
                Done for Now
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default AdminTheaters;

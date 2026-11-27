import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import {
  createShowtime,
  updateShowtime,
  deleteShowtime,
} from '../../services/showtimeService';
import { getTrendingMovies } from '../../services/movieService';
import { fetchApi } from '../../services/api';
import { formatLocalDate } from '../../utils/bookingUtils';

const AdminShowtimeManagement = () => {
  const { theaterId } = useParams();
  const navigate = useNavigate();

  const [theater, setTheater] = useState(null);
  const [movies, setMovies] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShowtime, setEditingShowtime] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [formData, setFormData] = useState({
    movie: '',
    screenNumber: 1,
    date: formatLocalDate(new Date()),
    endDate: '',
    time: '10:00',
  });

  const formatTime = (t) => {
    if (!t) return t;
    if (/AM|PM/i.test(t)) return t;
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${suffix}`;
  };

  const formatDate = (d) => {
    if (!d) return d;
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const loadData = useCallback(async () => {
    try {
      const [theatersData, moviesRes, showtimesData] = await Promise.all([
        fetchApi('/theaters/admin'),
        getTrendingMovies(),
        fetchApi(`/showtimes/theater/${theaterId}`),
      ]);
      const theatersList = Array.isArray(theatersData) ? theatersData : [];
      const foundTheater = theatersList.find((t) => t._id === theaterId);
      setTheater(foundTheater);
      setMovies(Array.isArray(moviesRes) ? moviesRes : []);
      setShowtimes(Array.isArray(showtimesData) ? showtimesData : []);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [theaterId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      if (editingShowtime) {
        await updateShowtime(editingShowtime._id, { ...formData, theater: theaterId });
        setFeedback({ type: 'success', text: 'Showtime updated.' });
      } else {
        await createShowtime({ ...formData, theater: theaterId });
        setFeedback({ type: 'success', text: 'Screening schedule added.' });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Scheduling conflict or error.' });
    }
  };

  const handleDeleteSlot = async (slotShows) => {
    if (!window.confirm(`Delete all ${slotShows.length} scheduled show(s) in this slot?`)) return;
    setFeedback(null);
    try {
      for (const s of slotShows) await deleteShowtime(s._id);
      setShowtimes((prev) => prev.filter((s) => !slotShows.find((x) => x._id === s._id)));
      setFeedback({ type: 'success', text: 'Showtime slot deleted.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete showtime.' });
    }
  };

  const handleEditSingleShow = (show) => {
    const movieId = typeof show.movie === 'object' ? show.movie._id : show.movie;
    setEditingShowtime(show);
    setFormData({
      movie: movieId || '',
      screenNumber: show.screenNumber || 1,
      date: show.date || formatLocalDate(new Date()),
      endDate: '',
      time: show.time || '10:00',
    });
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--mg-accent)' }} />
        <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>Loading showtime schedule...</p>
      </div>
    );
  }

  if (!theater) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--mg-danger)' }}>
          Cinema not found or permission denied.
        </p>
      </div>
    );
  }

  const todayStr = formatLocalDate(new Date());

  const grouped = showtimes.reduce((acc, s) => {
    if (!s.movie) return acc;
    const mId = typeof s.movie === 'object' ? s.movie._id : s.movie;
    if (!mId) return acc;
    if (!acc[mId]) acc[mId] = { movie: s.movie, slots: {} };
    const slotKey = `${s.time}__screen${s.screenNumber}`;
    if (!acc[mId].slots[slotKey]) {
      acc[mId].slots[slotKey] = { time: s.time, screenNumber: s.screenNumber, shows: [] };
    }
    acc[mId].slots[slotKey].shows.push(s);
    return acc;
  }, {});

  const screenOptions =
    theater.screens?.length > 0
      ? theater.screens.map((s) => ({ number: s.number, label: s.name || `Screen ${s.number}` }))
      : [1, 2, 3, 4, 5].map((n) => ({ number: n, label: `Screen ${n}` }));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-medium mb-2 cursor-pointer hover:opacity-80"
            style={{ color: 'var(--mg-ink-2)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Cinemas
          </button>
          <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
            Showtime Schedule
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
            Managing screening windows for <strong style={{ color: 'var(--mg-ink)' }}>{theater.name}</strong>
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingShowtime(null);
            setFormData({
              movie: '',
              screenNumber: screenOptions[0]?.number || 1,
              date: todayStr,
              endDate: '',
              time: '10:00',
            });
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Showtime
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
          <span className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.text}
          </span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showtimes.length === 0 ? (
        <div
          className="py-16 text-center rounded-xl border border-dashed"
          style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border-strong)' }}
        >
          <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--mg-ink-3)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--mg-ink-2)' }}>
            No showtimes scheduled for this cinema yet.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([mId, group]) => (
            <div
              key={mId}
              className="rounded-xl border p-5 sm:p-6 flex flex-col lg:flex-row gap-6"
              style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
            >
              <div className="lg:w-56 flex lg:flex-col gap-4 items-center lg:items-start shrink-0">
                <img
                  src={group.movie.poster}
                  alt={group.movie.title}
                  className="w-20 lg:w-36 aspect-[2/3] object-cover rounded-lg border shrink-0"
                  style={{ borderColor: 'var(--mg-border)' }}
                />
                <div>
                  <h2 className="text-lg font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                    {group.movie.title}
                  </h2>
                  {group.movie.duration && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--mg-ink-2)' }}>
                      <Clock className="w-3.5 h-3.5" />
                      {group.movie.duration}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--mg-ink-3)' }}>
                  Scheduled Time Slots
                </p>
                {Object.entries(group.slots).map(([slotKey, slot]) => {
                  const sorted = [...slot.shows].sort((a, b) =>
                    (a.date || '').localeCompare(b.date || '')
                  );
                  const firstDate = sorted[0]?.date;
                  const lastDate = sorted[sorted.length - 1]?.date;
                  const dateRange =
                    firstDate === lastDate
                      ? formatDate(firstDate)
                      : `${formatDate(firstDate)} → ${formatDate(lastDate)}`;

                  return (
                    <div
                      key={slotKey}
                      className="rounded-lg border px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                      style={{
                        backgroundColor: 'var(--mg-surface-2)',
                        borderColor: 'var(--mg-border)',
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-mono font-bold text-base" style={{ color: 'var(--mg-ink)' }}>
                          {formatTime(slot.time)}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ backgroundColor: 'var(--mg-accent-soft)', color: 'var(--mg-accent)' }}
                        >
                          Screen {slot.screenNumber}
                        </span>
                        <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                          <Calendar className="w-3.5 h-3.5" />
                          {dateRange}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>
                          ({slot.shows.length} {slot.shows.length === 1 ? 'day' : 'days'})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {slot.shows.length === 1 && (
                          <button
                            type="button"
                            onClick={() => handleEditSingleShow(slot.shows[0])}
                            title="Edit showtime"
                            className="p-2 rounded-lg border cursor-pointer"
                            style={{
                              backgroundColor: 'var(--mg-surface)',
                              borderColor: 'var(--mg-border)',
                              color: 'var(--mg-ink-2)',
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(slot.shows)}
                          title="Delete slot"
                          className="p-2 rounded-lg border cursor-pointer"
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
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Showtime Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingShowtime ? 'Edit Showtime' : 'Schedule New Showtime'}
        className="max-w-lg"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
              Movie *
            </label>
            <select
              className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
              value={formData.movie}
              onChange={(e) => setFormData({ ...formData, movie: e.target.value })}
              required
            >
              <option value="">Select a Now Showing movie...</option>
              {movies
                .filter((m) => {
                  const isUpcomingDb = m.isUpcoming;
                  const isFutureDate = m.releaseDate ? m.releaseDate > todayStr : false;
                  return !isUpcomingDb && !isFutureDate;
                })
                .map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.title} ({m.duration})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Screen *
              </label>
              <select
                className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
                value={formData.screenNumber}
                onChange={(e) =>
                  setFormData({ ...formData, screenNumber: parseInt(e.target.value, 10) })
                }
              >
                {screenOptions.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Start Time *
              </label>
              <input
                type="time"
                required
                className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                {editingShowtime ? 'Show Date *' : 'Start Date *'}
              </label>
              <input
                type="date"
                required
                min={todayStr}
                className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            {!editingShowtime && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                  End Date (Optional Range)
                </label>
                <input
                  type="date"
                  min={formData.date || todayStr}
                  className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--mg-border)' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingShowtime ? 'Update Showtime' : 'Schedule Showtime'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminShowtimeManagement;

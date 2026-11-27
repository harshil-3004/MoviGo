import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Star,
  Clock,
  Crown,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { fetchApi } from '../../services/api';
import { formatLocalDate, toYouTubeEmbedUrl } from '../../utils/bookingUtils';

const EMPTY_FORM = {
  title: '',
  description: '',
  poster: '',
  backdrop: '',
  genre: '',
  duration: '',
  releaseDate: '',
  rating: 4.5,
  trailerUrl: '',
};

const AdminMovies = () => {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'admin' || user?.role === 'master_admin';

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const loadMovies = async () => {
    try {
      const data = await fetchApi('/movies');
      setMovies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load movies', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const handleOpenModal = (movie = null) => {
    if (movie) {
      setCurrentMovie(movie);
      setFormData({
        title: movie.title || '',
        description: movie.description || '',
        poster: movie.poster || '',
        backdrop: movie.backdrop || '',
        genre: movie.genre || '',
        duration: movie.duration || '',
        releaseDate: movie.releaseDate || '',
        rating: movie.rating ?? 4.5,
        trailerUrl: movie.trailerUrl || '',
      });
    } else {
      setCurrentMovie(null);
      setFormData(EMPTY_FORM);
    }
    setIsModalOpen(true);
  };

  const handleSetFeatured = async (movie) => {
    if (movie.isFeatured) return;
    setFeedback(null);
    try {
      await fetchApi(`/movies/${movie._id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...movie, isFeatured: true }),
      });
      await loadMovies();
      setFeedback({ type: 'success', text: `"${movie.title}" set as featured homepage movie.` });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Could not update featured movie.' });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    const todayStr = formatLocalDate(new Date());
    const trailerUrl = toYouTubeEmbedUrl(formData.trailerUrl);

    const payload = {
      ...formData,
      trailerUrl,
      isUpcoming: formData.releaseDate ? formData.releaseDate > todayStr : false,
    };

    try {
      if (currentMovie) {
        const updated = await fetchApi(`/movies/${currentMovie._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMovies((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
        setFeedback({ type: 'success', text: `Updated "${updated.title}".` });
      } else {
        const created = await fetchApi('/movies', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMovies((prev) => [created, ...prev]);
        setFeedback({ type: 'success', text: `Added "${created.title}" to catalog.` });
      }
      setIsModalOpen(false);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Error saving movie: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this movie? Scheduled showtimes referencing it may be affected.')) return;
    setFeedback(null);
    try {
      await fetchApi(`/movies/${id}`, { method: 'DELETE' });
      setMovies((prev) => prev.filter((m) => m._id !== id));
      setFeedback({ type: 'success', text: 'Movie removed from catalog.' });
    } catch (err) {
      setFeedback({ type: 'error', text: 'Error deleting movie: ' + err.message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--mg-accent)' }} />
        <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>Loading movie catalog...</p>
      </div>
    );
  }

  const todayStr = formatLocalDate(new Date());
  const filteredMovies = movies.filter((m) =>
    (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.genre || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
            Movies Catalog
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
            Manage theatrical releases, upcoming titles, trailers, and homepage spotlight.
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            Add Movie
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

      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--mg-surface)',
          borderColor: 'var(--mg-border)',
        }}
      >
        <div
          className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ borderColor: 'var(--mg-border)', backgroundColor: 'var(--mg-surface-2)' }}
        >
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or genre..."
              className="mg-input w-full pl-10 pr-3 py-2 rounded-lg text-sm"
            />
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--mg-ink-3)' }}>
            {filteredMovies.length} {filteredMovies.length === 1 ? 'title' : 'titles'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="border-b text-xs font-semibold uppercase tracking-wider"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-ink-3)' }}
              >
                <th className="py-3.5 px-5">Movie</th>
                <th className="py-3.5 px-4">Genre &amp; Runtime</th>
                <th className="py-3.5 px-4">Release Status</th>
                <th className="py-3.5 px-4">Rating</th>
                {isSuperAdmin && <th className="py-3.5 px-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--mg-border)' }}>
              {filteredMovies.map((movie) => {
                const isUpcoming = movie.isUpcoming || (movie.releaseDate && movie.releaseDate > todayStr);
                return (
                  <tr key={movie._id} className="transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="w-10 h-14 object-cover rounded border shrink-0"
                          style={{ borderColor: 'var(--mg-border)', backgroundColor: 'var(--mg-surface-2)' }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-sm" style={{ color: 'var(--mg-ink)' }}>
                              {movie.title}
                            </span>
                            {movie.isFeatured && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                                style={{ backgroundColor: 'var(--mg-gold-soft)', color: 'var(--mg-gold)' }}
                              >
                                <Crown className="w-3 h-3" />
                                Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                      <p className="font-medium" style={{ color: 'var(--mg-ink)' }}>{movie.genre}</p>
                      <p className="flex items-center gap-1 mt-0.5" style={{ color: 'var(--mg-ink-3)' }}>
                        <Clock className="w-3 h-3" /> {movie.duration}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <span
                        className="inline-block px-2 py-0.5 rounded font-semibold"
                        style={{
                          backgroundColor: isUpcoming ? 'var(--mg-gold-soft)' : 'var(--mg-success-soft)',
                          color: isUpcoming ? 'var(--mg-gold)' : 'var(--mg-success)',
                        }}
                      >
                        {isUpcoming ? 'Coming Soon' : 'Now Showing'}
                      </span>
                      {movie.releaseDate && (
                        <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--mg-ink-3)' }}>
                          {movie.releaseDate}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1" style={{ color: 'var(--mg-gold)' }}>
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {movie.rating ?? '—'}
                      </span>
                    </td>

                    {isSuperAdmin && (
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetFeatured(movie)}
                            disabled={movie.isFeatured}
                            title={movie.isFeatured ? 'Currently Featured' : 'Set as Hero Movie'}
                            className="p-2 rounded-lg border transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-default"
                            style={{
                              backgroundColor: movie.isFeatured ? 'var(--mg-gold-soft)' : 'var(--mg-surface-2)',
                              borderColor: 'var(--mg-border)',
                              color: movie.isFeatured ? 'var(--mg-gold)' : 'var(--mg-ink-2)',
                            }}
                          >
                            <Crown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenModal(movie)}
                            title="Edit Movie"
                            className="p-2 rounded-lg border transition-colors cursor-pointer"
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
                            onClick={() => handleDelete(movie._id)}
                            title="Delete Movie"
                            className="p-2 rounded-lg border transition-colors cursor-pointer"
                            style={{
                              backgroundColor: 'var(--mg-danger-soft)',
                              borderColor: 'var(--mg-border)',
                              color: 'var(--mg-danger)',
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredMovies.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 5 : 4} className="py-12 text-center text-sm" style={{ color: 'var(--mg-ink-3)' }}>
                    No movies match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Movie Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentMovie ? 'Edit Movie' : 'Add New Movie'}
        className="max-w-3xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Dune: Part Two"
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Genre *
              </label>
              <input
                type="text"
                required
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                placeholder="Sci-Fi, Drama"
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Runtime *
              </label>
              <input
                type="text"
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="2h 46m"
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Release Date
              </label>
              <input
                type="date"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Rating (0–10)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Trailer URL (YouTube)
              </label>
              <input
                type="url"
                value={formData.trailerUrl}
                onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Poster Image URL *
              </label>
              <input
                type="url"
                required
                value={formData.poster}
                onChange={(e) => setFormData({ ...formData, poster: e.target.value })}
                placeholder="https://..."
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Backdrop Image URL
              </label>
              <input
                type="url"
                value={formData.backdrop}
                onChange={(e) => setFormData({ ...formData, backdrop: e.target.value })}
                placeholder="https://..."
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                Synopsis
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Movie overview..."
                className="mg-input w-full px-3.5 py-2 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--mg-border)' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {currentMovie ? 'Save Changes' : 'Create Movie'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminMovies;

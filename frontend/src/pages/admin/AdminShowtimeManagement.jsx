import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Calendar, Clock, Monitor, Trash2, Edit2, Film, CheckCircle, X, Activity } from 'lucide-react';
import Button from '../../components/common/Button';
import { createShowtime, updateShowtime, deleteShowtime } from '../../services/showtimeService';
import { getTrendingMovies } from '../../services/movieService';
import { fetchApi } from '../../services/api';

const AdminShowtimeManagement = () => {
  const { theaterId } = useParams();
  const navigate = useNavigate();
  
  const [theater, setTheater] = useState(null);
  const [movies, setMovies] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShowtime, setEditingShowtime] = useState(null);
  
  const [formData, setFormData] = useState({
    movie: '',
    screenNumber: 1,
    date: new Date().toISOString().split('T')[0],
    endDate: '',
    time: '10:00'
  });

  // Convert 24h "HH:MM" → "H:MM AM/PM"
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

  // Convert ISO "YYYY-MM-DD" → "DD-MM-YYYY"
  const formatDate = (d) => {
    if (!d) return d;
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [theatersData, moviesRes, showtimesData] = await Promise.all([
          fetchApi('/theaters/admin'),
          getTrendingMovies(),
          fetchApi(`/showtimes/theater/${theaterId}`)
        ]);
        const foundTheater = theatersData.find(t => t._id === theaterId);
        setTheater(foundTheater);
        setMovies(moviesRes);
        setShowtimes(showtimesData);
        setIsLoading(false);
      } catch (err) {
        console.error('Fetch Error:', err);
        setIsLoading(false);
      }
    };
    fetchData();
  }, [theaterId]);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editingShowtime) {
        await updateShowtime(editingShowtime._id, { ...formData, theater: theaterId });
      } else {
        await createShowtime({ ...formData, theater: theaterId });
      }
      window.location.reload();
    } catch (err) {
      alert('Scheduling conflict or network error.');
    }
  };

  const handleDeleteSlot = async (slotShows) => {
    if (!window.confirm(`Delete all ${slotShows.length} shows in this time slot?`)) return;
    try {
      for (const s of slotShows) await deleteShowtime(s._id);
      setShowtimes(prev => prev.filter(s => !slotShows.find(x => x._id === s._id)));
    } catch (err) {
      alert('Failed to delete showtime.');
    }
  };

  if (isLoading) return <div className="p-10 text-center text-muted">Syncing chronometer...</div>;
  if (!theater) return <div className="p-10 text-center text-red-500">Theater not found. Access Denied.</div>;

  // Group showtimes: first by movie, then by time+screen slot
  const grouped = showtimes.reduce((acc, s) => {
    if (!s.movie) return acc;
    const mId = typeof s.movie === 'object' ? s.movie._id : s.movie;
    if (!mId) return acc;
    if (!acc[mId]) acc[mId] = { movie: s.movie, slots: {} };
    const slotKey = `${s.time}__screen${s.screenNumber}`;
    if (!acc[mId].slots[slotKey]) acc[mId].slots[slotKey] = { time: s.time, screenNumber: s.screenNumber, shows: [] };
    acc[mId].slots[slotKey].shows.push(s);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-10 w-full animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-muted hover:text-white transition-colors mb-4 cursor-pointer">
            <ChevronLeft className="w-5 h-5 mr-1" /> Back
          </button>
          <h1 className="text-3xl font-bold font-outfit text-white mb-2">Theater Schedule</h1>
          <p className="text-muted">Allocating screening windows for <span className="text-secondary font-bold">{theater.name}</span></p>
        </div>
        <Button onClick={() => { setEditingShowtime(null); setFormData({ movie: '', screenNumber: 1, date: new Date().toISOString().split('T')[0], endDate: '', time: '10:00' }); setIsModalOpen(true); }} className="shadow-[0_0_20px_rgba(139,92,246,0.3)] bg-secondary hover:bg-secondary/80">
          <Plus className="w-5 h-5 mr-2" /> Add Screening
        </Button>
      </div>

      <div className="space-y-10">
        {showtimes.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center bg-surface/20 border border-dashed border-white/10 rounded-[2.5rem]">
            <Calendar className="w-16 h-16 text-muted mb-4 opacity-20" />
            <p className="text-white/40 font-bold uppercase tracking-widest text-sm">No shows scheduled for this branch</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(grouped).map(([mId, group]) => (
              <div key={mId} className="bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 flex flex-col lg:flex-row gap-10 hover:bg-surface/40 transition-all">
                
                {/* Movie Info */}
                <div className="lg:w-1/4">
                  <div className="aspect-[2/3] rounded-2xl overflow-hidden mb-6 border border-white/10 shadow-2xl relative group">
                    <img src={group.movie.poster} alt={group.movie.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <span className="text-xs font-bold text-white flex items-center gap-2"><Clock className="w-3 h-3" /> {group.movie.duration}</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold font-outfit text-white mb-2">{group.movie.title}</h3>
                  <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                    <Clock className="w-3 h-3" /> {group.movie.duration}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="lg:w-3/4">
                  <div className="flex items-center gap-2 mb-6 text-muted font-black text-[10px] uppercase tracking-[0.2em]">
                    <Activity className="w-4 h-4 text-secondary" /> Allocated Screenings
                  </div>

                  <div className="flex flex-col gap-4">
                    {Object.entries(group.slots).map(([slotKey, slot]) => {
                      const sorted = [...slot.shows].sort((a, b) => new Date(a.date) - new Date(b.date));
                      const firstDate = sorted[0]?.date;
                      const lastDate = sorted[sorted.length - 1]?.date;
                      const dateRange = firstDate === lastDate
                        ? formatDate(firstDate)
                        : `${formatDate(firstDate)} → ${formatDate(lastDate)}`;

                      return (
                        <div key={slotKey} className="bg-black/20 border border-white/5 rounded-2xl p-5 group/item hover:border-secondary/30 transition-all relative">
                          <div className="flex flex-wrap items-center gap-4">
                            {/* Time in AM/PM */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-secondary" />
                              </div>
                              <span className="text-2xl font-black text-white">{formatTime(slot.time)}</span>
                            </div>

                            <div className="h-8 w-px bg-white/10" />

                            {/* Date Range */}
                            <div className="flex items-center gap-2 text-sm font-bold text-white/70">
                              <Calendar className="w-4 h-4 text-secondary" />
                              {dateRange}
                            </div>

                            <div className="h-8 w-px bg-white/10" />

                            {/* Screen */}
                            <span className="bg-secondary/10 text-secondary text-[9px] font-black px-3 py-1 rounded-full border border-secondary/20">
                              Screen {slot.screenNumber}
                            </span>

                            {/* Count */}
                            <span className="ml-auto text-[9px] font-black text-muted uppercase tracking-widest">
                              {slot.shows.length} show{slot.shows.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Delete slot */}
                          <div className="absolute top-4 right-4 opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDeleteSlot(slot.shows)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-base/90 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
          <form
            onSubmit={handleCreateOrUpdate}
            className="relative bg-surface border border-white/10 rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300"
          >
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-muted hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-black font-outfit mb-8 flex items-center gap-4 text-white uppercase tracking-tighter">
              <Film className="w-8 h-8 text-secondary" />
              {editingShowtime ? 'Modify Show' : 'New Screening'}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-[0.2em] pl-1">Assign Cinematic Asset</label>
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white appearance-none focus:outline-none focus:border-secondary transition-all"
                  value={formData.movie}
                  onChange={(e) => setFormData({ ...formData, movie: e.target.value })}
                  required
                >
                  <option value="">Select a movie...</option>
                  {movies
                    .filter(m => {
                      const isUpcomingDb = m.isUpcoming;
                      const isFutureDate = m.releaseDate ? new Date(m.releaseDate) > new Date() : false;
                      return !isUpcomingDb && !isFutureDate;
                    })
                    .map(m => <option key={m._id} value={m._id}>{m.title} ({m.duration})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-[0.2em] pl-1">Projection Screen</label>
                  <select
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white appearance-none focus:outline-none focus:border-secondary transition-all"
                    value={formData.screenNumber}
                    onChange={(e) => setFormData({ ...formData, screenNumber: parseInt(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Screen {n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-[0.2em] pl-1">Showtime Clock</label>
                  <input
                    type="time"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-secondary transition-all [color-scheme:dark]"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-[0.2em] pl-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-secondary transition-all [color-scheme:dark]"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-muted mb-2 tracking-[0.2em] pl-1">End Date (Bulk)</label>
                  <input
                    type="date"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-secondary transition-all [color-scheme:dark]"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.date}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-16 bg-secondary shadow-[0_20px_50px_rgba(139,92,246,0.3)] mt-4 uppercase font-black tracking-widest">
                <CheckCircle className="w-6 h-6 mr-3" />
                {editingShowtime ? 'Commit Changes' : 'Initialize Screening'}
              </Button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default AdminShowtimeManagement;

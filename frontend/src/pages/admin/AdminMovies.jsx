import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Loader2, Save, Image as ImageIcon, Film, Calendar, Star, Clock, Activity, TrendingUp, Crown } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { fetchApi } from '../../services/api';

const AdminMovies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    poster: '',
    backdrop: '',
    genre: '',
    duration: '',
    releaseDate: '',
    rating: 4.5,
    trailerUrl: ''
  });

  const loadMovies = async () => {
    try {
      const data = await fetchApi('/movies');
      setMovies(data);
    } catch (err) {
      console.error("Failed to load movies", err);
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
        rating: movie.rating || 4.5,
        trailerUrl: movie.trailerUrl || ''
      });
    } else {
      setCurrentMovie(null);
      setFormData({
        title: '',
        description: '',
        poster: '',
        backdrop: '',
        genre: '',
        duration: '',
        releaseDate: '',
        rating: 4.5,
        trailerUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSetFeatured = async (movie) => {
    if (movie.isFeatured) return;
    try {
      await fetchApi(`/movies/${movie._id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...movie, isFeatured: true })
      });
      loadMovies();
    } catch (err) {
      alert("Error setting featured movie: " + err.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Ensure correct upcoming status based on date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let trailerUrl = formData.trailerUrl;
    if (trailerUrl && trailerUrl.includes('youtube.com/watch?v=')) {
      trailerUrl = trailerUrl.replace('watch?v=', 'embed/');
    } else if (trailerUrl && trailerUrl.includes('youtu.be/')) {
      const videoId = trailerUrl.split('youtu.be/')[1];
      trailerUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    const payload = {
      ...formData,
      trailerUrl,
      isUpcoming: formData.releaseDate ? new Date(formData.releaseDate) > today : false
    };

    try {
      if (currentMovie) {
        // Update
        const updated = await fetchApi(`/movies/${currentMovie._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setMovies(prev => prev.map(m => m._id === updated._id ? updated : m));
      } else {
        // Create
        const created = await fetchApi('/movies', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setMovies(prev => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert("Error saving movie: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this movie? This will affect scheduled showtimes.")) return;
    try {
      await fetchApi(`/movies/${id}`, { method: 'DELETE' });
      setMovies(prev => prev.filter(m => m._id !== id));
    } catch (err) {
      alert("Error deleting movie: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-base">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted text-[10px] font-black uppercase tracking-[0.3em]">Accessing Movie Archive...</p>
      </div>
    );
  }

  const filteredMovies = movies.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 w-full animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-outfit text-white mb-2 tracking-tighter uppercase">Media Assets</h1>
          <p className="text-muted text-xs uppercase tracking-widest font-bold border-l-2 border-primary pl-4 ml-1">Global platform film management protocols.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center h-14 px-8 bg-primary text-white shadow-[0_20px_50px_rgba(244,63,94,0.2)] hover:scale-105 active:scale-95 transition-all">
          <Plus className="w-5 h-5 mr-2" /> Add Cinematic Asset
        </Button>
      </div>

      <div className="bg-surface/30 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
        
        {/* Toolbar */}
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row gap-6 justify-between items-center bg-white/[0.01]">
          <div className="relative w-full sm:w-[450px]">
            <Search className="w-5 h-5 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Filter assets by title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm placeholder:text-muted/50 focus:outline-none focus:border-primary/50 transition-all focus:bg-black/60"
            />
          </div>
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted">
             <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
             Vault Connected: {filteredMovies.length} Records
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted/40 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5">
                <th className="px-8 py-6">Cinematic Asset</th>
                <th className="px-8 py-6">Release Epoch</th>
                <th className="px-8 py-6">Sector / Genre</th>
                <th className="px-8 py-6">Critical Rating</th>
                <th className="px-8 py-6 text-right">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMovies.map((movie) => (
                <tr key={movie._id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-20 bg-black/40 rounded-xl overflow-hidden shadow-2xl border border-white/10 shrink-0 group-hover:scale-105 transition-transform duration-500">
                        <img src={movie.poster} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-black text-white text-lg tracking-tighter uppercase leading-tight group-hover:text-primary transition-colors">{movie.title}</div>
                        <div className="text-[10px] text-muted mt-1 font-black uppercase tracking-widest flex items-center gap-2">
                          UID: {movie._id.slice(-10).toUpperCase()}
                          {movie.isFeatured && (
                            <span className="flex items-center gap-1 text-primary animate-pulse">
                              <Crown className="w-2.5 h-2.5" /> HERO
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                     <div className="text-white/80 font-mono text-xs">{movie.releaseDate || 'NO DATE'}</div>
                     <div className="text-[9px] text-muted uppercase mt-1 font-black">{movie.duration}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-[9px] font-black text-primary uppercase tracking-widest">
                      {movie.genre}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="font-black text-sm">{movie.rating || 0}</span>
                       </div>
                       <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500/50" style={{ width: `${(movie.rating/5)*100}%` }}></div>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button 
                        onClick={() => handleSetFeatured(movie)}
                        disabled={movie.isFeatured}
                        className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center border ${movie.isFeatured ? 'bg-primary text-white border-primary cursor-default' : 'bg-white/5 hover:bg-primary/20 text-white/40 hover:text-primary border-white/5 hover:border-primary/30'}`} 
                        title={movie.isFeatured ? "Currently Hero Movie" : "Set as Hero Movie"}
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleOpenModal(movie)}
                        className="w-10 h-10 bg-white/5 hover:bg-primary/20 rounded-xl text-white/40 hover:text-primary transition-all flex items-center justify-center border border-white/5 hover:border-primary/30" 
                        title="Modify Asset"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(movie._id)}
                        className="w-10 h-10 bg-rose-500/5 hover:bg-rose-500/20 rounded-xl text-rose-500/40 hover:text-rose-500 transition-all flex items-center justify-center border border-white/5 hover:border-rose-500/30" 
                        title="Purge Asset"
                      >
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

      {/* Movie Form Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={currentMovie ? 'Modify Media Asset' : 'Secure New Media Asset'}
        className="max-w-4xl"
      >
        <form onSubmit={handleSave}>
          <div className="p-8 space-y-8 max-h-[55vh] overflow-y-auto custom-scrollbar">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Title */}
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 pl-1 flex items-center gap-2">
                      <Film className="w-3 h-3" /> Asset Title
                   </label>
                   <input 
                     type="text" 
                     required
                     value={formData.title}
                     onChange={(e) => setFormData({...formData, title: e.target.value})}
                     className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary transition-all"
                     placeholder="e.g. Inception: Prime"
                   />
                </div>

                {/* Genre */}
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 pl-1 flex items-center gap-2">
                      <Activity className="w-3 h-3" /> Genre / Category
                   </label>
                   <input 
                     type="text" 
                     required
                     value={formData.genre}
                     onChange={(e) => setFormData({...formData, genre: e.target.value})}
                     className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary transition-all"
                     placeholder="Action, Sci-Fi, etc."
                   />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 pl-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Runtime Duration
                   </label>
                   <input 
                     type="text" 
                     required
                     value={formData.duration}
                     onChange={(e) => setFormData({...formData, duration: e.target.value})}
                     className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary transition-all"
                     placeholder="e.g. 2h 28m"
                   />
                </div>

                {/* Release Date */}
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 pl-1 flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> Release Epoch
                   </label>
                   <input 
                     type="date" 
                     value={formData.releaseDate}
                     onChange={(e) => setFormData({...formData, releaseDate: e.target.value})}
                     className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary transition-all [color-scheme:dark]"
                   />
                </div>
                
                {/* Backdrop URL */}
                <div className="space-y-2 md:col-span-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 pl-1 flex items-center gap-2">
                      <ImageIcon className="w-3 h-3" /> Cinematic Backdrop URL
                   </label>
                   <input 
                     type="url" 
                     value={formData.backdrop}
                     onChange={(e) => setFormData({...formData, backdrop: e.target.value})}
                     className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary transition-all font-mono text-xs"
                     placeholder="https://images.tmdb.org/t/p/original/..."
                   />
                </div>

                {/* Poster URL */}
                <div className="space-y-2 md:col-span-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 pl-1 flex items-center gap-2">
                      <ImageIcon className="w-3 h-3" /> Primary Poster URL
                   </label>
                   <input 
                     type="url" 
                     required
                     value={formData.poster}
                     onChange={(e) => setFormData({...formData, poster: e.target.value})}
                     className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary transition-all font-mono text-xs"
                     placeholder="https://images.tmdb.org/..."
                   />
                </div>

                {/* Trailer URL */}
                <div className="space-y-2 md:col-span-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 pl-1 flex items-center gap-2">
                      <TrendingUp className="w-3 h-3" /> Trailer Embed URL (YouTube)
                   </label>
                    <input 
                      type="url" 
                      value={formData.trailerUrl}
                      onChange={(e) => setFormData({...formData, trailerUrl: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary transition-all font-mono text-xs"
                      placeholder="Paste YouTube Link (e.g. youtube.com/watch?v=...)"
                    />
                    <p className="text-[9px] text-muted/40 uppercase tracking-widest pl-1">Link will be auto-converted for direct playback</p>
                </div>

                {/* Description */}
                <div className="space-y-2 md:col-span-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted/60 pl-1 flex items-center gap-2">
                      <Activity className="w-3 h-3" /> Asset Intelligence (Synopsis)
                   </label>
                   <textarea 
                     rows="4"
                     value={formData.description}
                     onChange={(e) => setFormData({...formData, description: e.target.value})}
                     className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-primary transition-all resize-none text-sm"
                     placeholder="Enter detailed movie information..."
                   />
                </div>
             </div>
          </div>

          <div className="p-8 border-t border-white/5 bg-black/20 flex justify-end gap-4 rounded-b-[2rem]">
             <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="h-14 px-10">
                Abort Mission
             </Button>
             <Button type="submit" disabled={isSaving} className="h-14 px-12 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                {isSaving ? 'Encrypting...' : currentMovie ? 'Update Protocols' : 'Instate Asset'}
             </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminMovies;

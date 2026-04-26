import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Play, Star, Clock, Calendar, ChevronLeft, Ticket, Bell } from 'lucide-react';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { getMovieDetails } from '../services/movieService';
import { startBooking } from '../store/bookingSlice';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [movie, setMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    getMovieDetails(id).then((data) => {
      setMovie(data);
      setIsLoading(false);
    });
  }, [id]);

  const handleBookNow = () => {
    const movieId = movie._id || movie.id;
    dispatch(startBooking({ movieId }));
    navigate(`/theaters/${movieId}`);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center pt-20"><div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div></div>;
  }

  if (!movie) {
    return <div className="min-h-screen flex flex-col items-center justify-center"><h2 className="text-2xl font-bold mb-4">Movie not found</h2><Button onClick={() => navigate('/')}>Go Home</Button></div>;
  }

  const isUpcoming = movie.releaseDate ? (
    isNaN(new Date(movie.releaseDate).getTime()) ? false : new Date(movie.releaseDate) > new Date()
  ) : false;

  return (
    <div className="w-full -mt-24 pb-20">
      {/* Hero Header with Backdrop */}
      <div className="relative h-[65vh] min-h-[500px] w-full flex items-end pb-12">
        <div className="absolute inset-0 z-0">
          <img src={movie.backdrop || movie.poster} alt={movie.title} className="w-full h-full object-cover opacity-60 mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-t from-base via-base/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-base via-base/60 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-muted hover:text-white transition-colors mb-8 cursor-pointer">
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </button>

          <div className="flex flex-col md:flex-row gap-8 items-end md:items-stretch">
            {/* Poster */}
            <div className="flex-shrink-0 w-48 md:w-64 -mb-24 shadow-2xl rounded-2xl overflow-hidden border border-white/10 group relative z-20">
              <img src={movie.poster} alt={movie.title} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>

            {/* Info */}
            <div className="flex-grow pb-4 md:pb-0 z-20">
              <h1 className="text-5xl md:text-6xl font-bold font-outfit mb-4">{movie.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/80 font-medium mb-6">
                {!isUpcoming && (
                  <span className="flex items-center bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1.5" />
                    {movie.rating}
                  </span>
                )}
                <span className="flex items-center bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {movie.duration || '2h 30m'}
                </span>
                <span className="flex items-center bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  {movie.releaseDate || 'TBA'}
                </span>
                <span className="bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/5">
                  {movie.genre}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex flex-col gap-4 w-full md:w-auto z-20 pb-2">
              {isUpcoming ? (
                <Button size="lg" className="w-full md:w-48 shadow-[0_0_20px_rgba(59,130,246,0.4)] !bg-blue-600 hover:!bg-blue-700 !border-blue-500">
                  <Bell className="w-5 h-5 mr-2" />
                  Notify Me
                </Button>
              ) : (
                <Button size="lg" className="w-full md:w-48 shadow-[0_0_20px_rgba(244,63,94,0.4)]" onClick={handleBookNow}>
                  <Ticket className="w-5 h-5 mr-2" />
                  Book Tickets
                </Button>
              )}
              <Button variant="secondary" size="lg" className="w-full md:w-48" onClick={() => setTrailerOpen(true)}>
                <Play className="w-5 h-5 mr-2" />
                Watch Trailer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32 md:mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Main Content (Left) */}
          <div className="lg:col-span-2 space-y-12">

            {isUpcoming && (
              <section className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden shadow-[0_20px_50px_rgba(59,130,246,0.15)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-blue-400 mb-3 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                      <Clock className="w-3.5 h-3.5" /> Early Access
                    </div>
                    <h2 className="text-3xl font-bold font-outfit text-white mb-2 flex items-center justify-center sm:justify-start">
                      Arriving on {movie.releaseDate}
                    </h2>
                    <p className="text-blue-100/70 max-w-md">Be the absolute first to know when advance tickets drop. Join the exclusive waitlist and secure the best seats.</p>
                  </div>
                  <Button className="w-full sm:w-auto px-8 !bg-white !text-blue-900 hover:!bg-blue-50 !border-none shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-transform hover:scale-105">
                    Join Waitlist
                  </Button>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-2xl font-bold font-outfit mb-4">Storyline</h2>
              <p className="text-muted leading-relaxed text-lg">
                {movie.description || 'Experience the cinematic masterpiece taking the world by storm. Plunge into a journey of discovery and destiny in this visually stunning and emotionally gripping blockbuster.'}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold font-outfit mb-6">Top Cast</h2>
              <div className="flex gap-6 overflow-x-auto pb-4 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-3 snap-start min-w-[100px]">
                    <div className="w-20 h-20 rounded-full bg-surface border border-white/10 overflow-hidden shadow-lg">
                      <img src={`https://i.pravatar.cc/150?img=${i + 10}`} alt="Actor" className="w-full h-full object-cover opacity-80" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white/90">Actor Name</p>
                      <p className="text-xs text-muted">Character</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar (Right) */}
          <div className="space-y-8">
            <div className="bg-surface/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-bold font-outfit mb-4">About the Movie</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-muted block mb-1">Director</span>
                  <span className="font-medium text-white/90">Famed Visionary</span>
                </div>
                <div>
                  <span className="text-muted block mb-1">Writer</span>
                  <span className="font-medium text-white/90">Creative Genius</span>
                </div>
                <div>
                  <span className="text-muted block mb-1">Format</span>
                  <span className="font-medium inline-block bg-white/10 px-2 py-0.5 rounded mr-2">IMAX 2D</span>
                  <span className="font-medium inline-block bg-white/10 px-2 py-0.5 rounded">Dolby Atmos</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Trailer Modal */}
      <Modal isOpen={trailerOpen} onClose={() => setTrailerOpen(false)} title={`${movie.title} - Official Trailer`} className="max-w-4xl w-[95vw] md:w-[80vw] lg:w-[50vw]">
        <div className="aspect-video w-full rounded-xl overflow-hidden relative bg-black shadow-[0_0_50px_rgba(244,63,94,0.1)] border border-white/5">
          {movie.trailerUrl ? (
            <iframe
              width="100%"
              height="100%"
              src={`${movie.trailerUrl}${movie.trailerUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted">
              <p>Trailer not available</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MovieDetails;

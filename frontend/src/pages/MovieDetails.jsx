import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Play, Star, Clock, Calendar, ChevronLeft, Ticket, Bell, CheckCircle2, MapPin } from 'lucide-react';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { getMovieDetails } from '../services/movieService';
import { getShowtimesByMovie } from '../services/showtimeService';
import { startBooking, setShowtime } from '../store/bookingSlice';
import { formatLocalDate, toYouTubeEmbedUrl, evaluateBookingWindow } from '../utils/bookingUtils';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [isWaitlisted, setIsWaitlisted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    Promise.all([getMovieDetails(id), getShowtimesByMovie(id)])
      .then(([movieData, showtimeData]) => {
        setMovie(movieData);
        setShowtimes(Array.isArray(showtimeData) ? showtimeData : []);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleBookNow = () => {
    const movieId = movie._id || movie.id;
    dispatch(startBooking({ movieId }));
    navigate(`/theaters/${movieId}`);
  };

  const handleQuickShowtime = (showtime) => {
    const movieId = movie._id || movie.id;
    dispatch(startBooking({ movieId }));
    dispatch(setShowtime({
      id: showtime._id,
      showtimeId: showtime._id,
      theater: showtime.theater._id,
      theaterId: showtime.theater._id,
      theaterName: showtime.theater.name,
      date: showtime.date,
      time: showtime.time,
      screenNumber: showtime.screenNumber || 1,
    }));
    navigate(`/seat-selection/${movieId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <h2 className="text-2xl font-bold font-display mb-3">Movie not found</h2>
        <Button onClick={() => navigate('/movies')}>Browse Movies</Button>
      </div>
    );
  }

  const todayStr = formatLocalDate(new Date());
  const isUpcoming = movie.releaseDate ? movie.releaseDate > todayStr : Boolean(movie.isUpcoming);
  const embedTrailerUrl = toYouTubeEmbedUrl(movie.trailerUrl);

  // Group today's / upcoming bookable showtimes by theater for quick preview
  const previewTheaters = Object.values(
    showtimes.reduce((acc, s) => {
      if (!s.theater || !evaluateBookingWindow(s.date, s.time).canBook) return acc;
      const tId = s.theater._id;
      if (!acc[tId]) {
        acc[tId] = { theater: s.theater, shows: [] };
      }
      if (acc[tId].shows.length < 4) {
        acc[tId].shows.push(s);
      }
      return acc;
    }, {})
  ).slice(0, 3);

  return (
    <div className="w-full pb-20">
      {/* Theme-Aware Backdrop Showcase Header */}
      <section
        className="relative border-b overflow-hidden"
        style={{
          backgroundColor: 'var(--mg-hero-bg)',
          color: 'var(--mg-hero-ink)',
          borderColor: 'var(--mg-border)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={movie.backdrop || movie.poster}
            alt=""
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0" style={{ background: 'var(--mg-hero-scrim)' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-75 mb-8 cursor-pointer"
            style={{ color: 'var(--mg-hero-ink-2)' }}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
            {/* Poster */}
            <div
              className="w-40 sm:w-52 aspect-[2/3] rounded-xl overflow-hidden border shrink-0 shadow-2xl"
              style={{ borderColor: 'var(--mg-hero-pill-border)', backgroundColor: 'var(--mg-surface-2)' }}
            >
              <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
            </div>

            {/* Title & Metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-3 text-xs font-semibold">
                <span
                  className="px-2.5 py-1 rounded-md text-white"
                  style={{ backgroundColor: isUpcoming ? '#2563eb' : 'var(--mg-accent)' }}
                >
                  {isUpcoming ? 'Upcoming' : 'In Cinemas'}
                </span>
                {movie.genre && (
                  <span
                    className="px-2.5 py-1 rounded-md border backdrop-blur-sm"
                    style={{
                      backgroundColor: 'var(--mg-hero-pill-bg)',
                      borderColor: 'var(--mg-hero-pill-border)',
                      color: 'var(--mg-hero-ink)',
                    }}
                  >
                    {movie.genre}
                  </span>
                )}
              </div>

              <h1
                className="text-3xl sm:text-5xl font-bold font-display mb-4"
                style={{ color: 'var(--mg-hero-ink)' }}
              >
                {movie.title}
              </h1>

              <div
                className="flex flex-wrap items-center gap-5 text-sm mb-7 font-medium"
                style={{ color: 'var(--mg-hero-ink-2)' }}
              >
                {!isUpcoming && (
                  <span
                    className="inline-flex items-center gap-1.5 font-semibold"
                    style={{ color: 'var(--mg-hero-ink)' }}
                  >
                    <Star className="w-4 h-4 fill-current" style={{ color: 'var(--mg-gold)' }} />
                    {movie.rating || '4.5'} / 5
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 opacity-75" />
                  {movie.duration || '2h 30m'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 opacity-75" />
                  {movie.releaseDate || 'TBA'}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {isUpcoming ? (
                  <Button
                    size="lg"
                    onClick={() => setIsWaitlisted(true)}
                    className={isWaitlisted ? '!bg-emerald-600' : '!bg-blue-600 hover:!bg-blue-700'}
                  >
                    {isWaitlisted ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    {isWaitlisted ? 'Added to Waitlist' : 'Notify Me'}
                  </Button>
                ) : (
                  <Button size="lg" onClick={handleBookNow}>
                    <Ticket className="w-4 h-4" />
                    Book Tickets
                  </Button>
                )}
                <Button
                  variant="hero"
                  size="lg"
                  onClick={() => setTrailerOpen(true)}
                >
                  <Play className="w-4 h-4" />
                  Watch Trailer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-10">
            {isUpcoming && (
              <div
                className="rounded-xl p-6 border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
                    Advance Release Notice
                  </p>
                  <h2 className="text-lg font-bold font-display" style={{ color: 'var(--mg-ink)' }}>
                    Releasing on {movie.releaseDate}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--mg-ink-2)' }}>
                    Join the waitlist to get alerted as soon as ticket bookings open.
                  </p>
                </div>
                <Button
                  variant={isWaitlisted ? 'secondary' : 'primary'}
                  onClick={() => setIsWaitlisted(true)}
                  className="shrink-0"
                >
                  {isWaitlisted ? 'Waitlist Joined ✓' : 'Join Waitlist'}
                </Button>
              </div>
            )}

            <section>
              <h2 className="text-xl font-bold font-display mb-3" style={{ color: 'var(--mg-ink)' }}>
                About the Movie
              </h2>
              <p className="text-base leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
                {movie.description || 'Experience this theatrical presentation in select cinemas with digital surround sound.'}
              </p>
            </section>

            {/* Quick Showtimes Preview */}
            {!isUpcoming && previewTheaters.length > 0 && (
              <section className="pt-8 border-t" style={{ borderColor: 'var(--mg-border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold font-display" style={{ color: 'var(--mg-ink)' }}>
                      Available Showtimes
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
                      Pick a time directly or compare all dates
                    </p>
                  </div>
                  <Link
                    to={`/theaters/${movie._id || movie.id}`}
                    className="text-sm font-semibold hover:underline"
                    style={{ color: 'var(--mg-accent)' }}
                  >
                    All cinemas &amp; dates →
                  </Link>
                </div>

                <div className="space-y-3">
                  {previewTheaters.map(({ theater, shows }) => (
                    <div
                      key={theater._id}
                      className="rounded-xl p-4 mg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm" style={{ color: 'var(--mg-ink)' }}>
                          {theater.name}
                        </h3>
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
                          <MapPin className="w-3 h-3 shrink-0" style={{ color: 'var(--mg-accent)' }} />
                          {theater.location}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {shows.map((show) => (
                          <button
                            key={show._id}
                            type="button"
                            onClick={() => handleQuickShowtime(show)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer hover:border-primary"
                            style={{
                              backgroundColor: 'var(--mg-surface-2)',
                              borderColor: 'var(--mg-border-strong)',
                              color: 'var(--mg-ink)',
                            }}
                          >
                            <span>{show.time}</span>
                            <span className="ml-1.5 text-[10px]" style={{ color: 'var(--mg-ink-3)' }}>
                              ({show.date.slice(5)})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Cast & Crew */}
            <section className="pt-8 border-t" style={{ borderColor: 'var(--mg-border)' }}>
              <h2 className="text-xl font-bold font-display mb-4" style={{ color: 'var(--mg-ink)' }}>
                Featured Cast
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center sm:flex-col sm:text-center gap-3 sm:gap-2">
                    <div
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border shrink-0"
                      style={{ borderColor: 'var(--mg-border)', backgroundColor: 'var(--mg-surface-2)' }}
                    >
                      <img src={`https://i.pravatar.cc/150?img=${i + 10}`} alt="Cast member" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--mg-ink)' }}>Lead Cast {i}</p>
                      <p className="text-[11px]" style={{ color: 'var(--mg-ink-3)' }}>Starring</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Sidebar Specs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-xl p-6 mg-surface space-y-4">
              <h3 className="text-base font-bold font-display" style={{ color: 'var(--mg-ink)' }}>
                Screening Details
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 py-2 border-b" style={{ borderColor: 'var(--mg-border)' }}>
                  <dt style={{ color: 'var(--mg-ink-3)' }}>Genre</dt>
                  <dd className="font-medium text-right" style={{ color: 'var(--mg-ink)' }}>{movie.genre}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2 border-b" style={{ borderColor: 'var(--mg-border)' }}>
                  <dt style={{ color: 'var(--mg-ink-3)' }}>Runtime</dt>
                  <dd className="font-medium text-right" style={{ color: 'var(--mg-ink)' }}>{movie.duration || '2h 30m'}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2 border-b" style={{ borderColor: 'var(--mg-border)' }}>
                  <dt style={{ color: 'var(--mg-ink-3)' }}>Release Date</dt>
                  <dd className="font-medium text-right" style={{ color: 'var(--mg-ink)' }}>{movie.releaseDate || 'TBA'}</dd>
                </div>
                <div className="flex justify-between gap-4 pt-1">
                  <dt style={{ color: 'var(--mg-ink-3)' }}>Formats</dt>
                  <dd className="flex gap-1.5 flex-wrap justify-end">
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'var(--mg-surface-2)', color: 'var(--mg-ink)' }}>IMAX 2D</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'var(--mg-surface-2)', color: 'var(--mg-ink)' }}>Dolby Atmos</span>
                  </dd>
                </div>
              </dl>

              {!isUpcoming && (
                <Button className="w-full mt-2" onClick={handleBookNow}>
                  <Ticket className="w-4 h-4" /> Select Theater &amp; Time
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      <Modal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        title={`${movie.title} — Trailer`}
        className="max-w-4xl w-[95vw]"
      >
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
          {embedTrailerUrl ? (
            <iframe
              width="100%"
              height="100%"
              src={`${embedTrailerUrl}${embedTrailerUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1`}
              title="Movie trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">
              Trailer not available
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MovieDetails;

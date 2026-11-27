import React, { useEffect, useState, useRef } from 'react';
import { Play, ChevronRight, ChevronLeft, Star, Ticket, Bell, MapPin, Calendar, Clock, Sparkles } from 'lucide-react';
import Button from '../components/common/Button';
import { getTrendingMovies } from '../services/movieService';
import { getTheaters } from '../services/theaterService';
import { Link, useNavigate } from 'react-router-dom';
import Modal from '../components/common/Modal';
import { formatLocalDate, toYouTubeEmbedUrl } from '../utils/bookingUtils';

const GENRES = ['Action', 'Sci-Fi', 'Drama', 'Thriller', 'Animation', 'Comedy', 'Adventure'];

const PosterCard = ({ movie, isUpcoming = false }) => (
  <Link
    to={`/movie/${movie._id || movie.id}`}
    className="group w-44 sm:w-52 flex-shrink-0 snap-start block focus:outline-none"
  >
    <div
      className="relative aspect-[2/3] w-full rounded-xl overflow-hidden mb-3 border transition-transform duration-200 group-hover:-translate-y-1"
      style={{
        backgroundColor: 'var(--mg-surface-2)',
        borderColor: 'var(--mg-border)',
        boxShadow: 'var(--mg-shadow-sm)',
      }}
    >
      <img
        src={movie.poster}
        alt={movie.title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <div className="absolute top-2.5 right-2.5">
        {isUpcoming ? (
          <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-black/75 text-white backdrop-blur-sm">
            {movie.releaseDate}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-black/75 text-white backdrop-blur-sm">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            {movie.rating || '4.5'}
          </span>
        )}
      </div>
    </div>

    <h3
      className="text-sm sm:text-base font-bold font-display truncate group-hover:text-primary transition-colors"
      style={{ color: 'var(--mg-ink)' }}
    >
      {movie.title}
    </h3>
    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
      {movie.genre || 'Cinema'}{movie.duration ? ` • ${movie.duration}` : ''}
    </p>
  </Link>
);

const Home = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [theaters, setTheaters] = useState([]);
  const [featured, setFeatured] = useState({});
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef(null);

  const scrollContainer = (direction) => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -Math.max(300, current.offsetWidth * 0.75) : Math.max(300, current.offsetWidth * 0.75);
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    Promise.all([getTrendingMovies(), getTheaters()])
      .then(([moviesData, theatersData]) => {
        const list = Array.isArray(moviesData) ? moviesData : [];
        const todayStr = formatLocalDate(new Date());

        const released = list.filter((m) => (!m.releaseDate ? !m.isUpcoming : m.releaseDate <= todayStr));
        const upcoming = list.filter((m) => (!m.releaseDate ? Boolean(m.isUpcoming) : m.releaseDate > todayStr));

        setMovies(released);
        setUpcomingMovies(upcoming);
        setTheaters(Array.isArray(theatersData) ? theatersData.slice(0, 4) : []);

        const featuredMovie = list.find((m) => m.isFeatured) || released[0] || list[0];
        setFeatured(
          featuredMovie || {
            title: 'Discover Cinema Near You',
            description: 'Browse current releases, pick your preferred screen format, and reserve seats in seconds.',
            backdrop: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070',
          }
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  const todayStr = formatLocalDate(new Date());
  const isFeaturedUpcoming = Boolean(featured.releaseDate && featured.releaseDate > todayStr);
  const embedTrailerUrl = toYouTubeEmbedUrl(featured.trailerUrl);
  const heroCandidates = movies.slice(0, 4);

  return (
    <div className="w-full">
      {/* Editorial Spotlight Hero */}
      <section
        className="relative w-full border-b overflow-hidden"
        style={{
          backgroundColor: 'var(--mg-hero-bg)',
          color: 'var(--mg-hero-ink)',
          borderColor: 'var(--mg-border)',
        }}
      >
        {/* Full-bleed backdrop image + theme-aware minimal scrim */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {featured.backdrop && (
            <img
              src={featured.backdrop}
              alt={featured.title}
              className="w-full h-full object-cover opacity-85"
            />
          )}
          <div className="absolute inset-0" style={{ background: 'var(--mg-hero-scrim)' }} />
        </div>

        <div className="relative z-10 min-h-[460px] sm:min-h-[520px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col justify-end">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5 mb-4 text-xs font-semibold">
                <span
                  className="px-2.5 py-1 rounded-md uppercase tracking-wider text-white"
                  style={{ backgroundColor: isFeaturedUpcoming ? '#2563eb' : 'var(--mg-accent)' }}
                >
                  {isFeaturedUpcoming ? 'Coming Soon' : 'Featured Release'}
                </span>
                {featured.genre && (
                  <span
                    className="px-2.5 py-1 rounded-md border backdrop-blur-sm"
                    style={{
                      backgroundColor: 'var(--mg-hero-pill-bg)',
                      borderColor: 'var(--mg-hero-pill-border)',
                      color: 'var(--mg-hero-ink)',
                    }}
                  >
                    {featured.genre}
                  </span>
                )}
                {featured.duration && (
                  <span
                    className="inline-flex items-center gap-1 font-medium"
                    style={{ color: 'var(--mg-hero-ink-2)' }}
                  >
                    <Clock className="w-3.5 h-3.5" /> {featured.duration}
                  </span>
                )}
                {!isFeaturedUpcoming && featured.rating > 0 && (
                  <span
                    className="inline-flex items-center gap-1 font-semibold"
                    style={{ color: 'var(--mg-gold)' }}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" /> {featured.rating}
                  </span>
                )}
              </div>

              <h1
                className="text-3xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight mb-4 leading-[1.08]"
                style={{ color: 'var(--mg-hero-ink)' }}
              >
                {featured.title}
              </h1>

              <p
                className="text-sm sm:text-base mb-7 max-w-xl leading-relaxed line-clamp-2 font-medium"
                style={{ color: 'var(--mg-hero-ink-2)' }}
              >
                {featured.description}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {(featured._id || featured.id) && (
                  isFeaturedUpcoming ? (
                    <Button
                      size="lg"
                      onClick={() => navigate(`/movie/${featured._id || featured.id}`)}
                      className="!bg-blue-600 hover:!bg-blue-700"
                    >
                      <Bell className="w-4 h-4" />
                      Notify Me
                    </Button>
                  ) : (
                    <Link to={`/theaters/${featured._id || featured.id}`}>
                      <Button size="lg">
                        <Ticket className="w-4 h-4" />
                        Book Tickets
                      </Button>
                    </Link>
                  )
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

            {/* Quick Spotlight Switcher */}
            {heroCandidates.length > 1 && (
              <div className="lg:col-span-4 flex lg:flex-col items-start lg:items-end gap-2">
                <span
                  className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border backdrop-blur-sm hidden lg:inline-block"
                  style={{
                    backgroundColor: 'var(--mg-hero-pill-bg)',
                    borderColor: 'var(--mg-hero-pill-border)',
                    color: 'var(--mg-hero-ink)',
                  }}
                >
                  In Theaters
                </span>
                <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
                  {heroCandidates.map((m) => {
                    const isSelected = (featured._id || featured.id) === (m._id || m.id);
                    return (
                      <button
                        key={m._id || m.id}
                        type="button"
                        onClick={() => setFeatured(m)}
                        aria-label={`Spotlight ${m.title}`}
                        className={`w-12 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                          isSelected ? 'border-[#e11d48] scale-105' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={!isSelected ? { borderColor: 'var(--mg-hero-pill-border)' } : undefined}
                      >
                        <img src={m.poster} alt={m.title} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        {/* Now Showing Carousel */}
        <section>
          <div className="flex items-end justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display" style={{ color: 'var(--mg-ink)' }}>
                Now Showing
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--mg-ink-2)' }}>
                Movies playing in cinemas today
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollContainer('left')}
                aria-label="Scroll left"
                className="hidden sm:inline-flex p-2 rounded-lg border transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--mg-surface)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-ink-2)',
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollContainer('right')}
                aria-label="Scroll right"
                className="hidden sm:inline-flex p-2 rounded-lg border transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--mg-surface)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-ink-2)',
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <Link
                to="/movies"
                className="inline-flex items-center gap-1 text-sm font-semibold ml-2 hover:underline"
                style={{ color: 'var(--mg-accent)' }}
              >
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="flex gap-5 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-44 sm:w-52 shrink-0">
                  <div className="aspect-[2/3] rounded-xl animate-pulse mb-3" style={{ backgroundColor: 'var(--mg-surface-2)' }} />
                  <div className="h-4 w-3/4 rounded animate-pulse mb-2" style={{ backgroundColor: 'var(--mg-surface-2)' }} />
                  <div className="h-3 w-1/2 rounded animate-pulse" style={{ backgroundColor: 'var(--mg-surface-2)' }} />
                </div>
              ))}
            </div>
          ) : movies.length > 0 ? (
            <div
              ref={scrollRef}
              className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory hide-scrollbar"
            >
              {movies.map((movie, idx) => (
                <PosterCard key={`${movie._id || movie.id}-${idx}`} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl p-10 text-center mg-surface">
              <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
                No movies are currently listed. Check back soon.
              </p>
            </div>
          )}
        </section>

        {/* Genre Discovery & Active Cinemas Strip */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 rounded-2xl p-6 mg-surface">
            <h2 className="text-lg font-bold font-display mb-1" style={{ color: 'var(--mg-ink)' }}>
              Browse by Genre
            </h2>
            <p className="text-xs mb-5" style={{ color: 'var(--mg-ink-2)' }}>
              Jump straight to films matching your mood
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <Link
                  key={genre}
                  to={`/movies?genre=${encodeURIComponent(genre)}`}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors hover:border-primary"
                  style={{
                    backgroundColor: 'var(--mg-surface-2)',
                    borderColor: 'var(--mg-border)',
                    color: 'var(--mg-ink)',
                  }}
                >
                  {genre}
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl p-6 mg-surface">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold font-display" style={{ color: 'var(--mg-ink)' }}>
                  Partner Cinemas
                </h2>
                <p className="text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                  View schedules directly by venue
                </p>
              </div>
              <Link to="/cinemas" className="text-xs font-semibold hover:underline" style={{ color: 'var(--mg-accent)' }}>
                All venues
              </Link>
            </div>

            {theaters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {theaters.map((theater) => (
                  <Link
                    key={theater._id}
                    to={`/cinema/${theater._id}/shows`}
                    className="p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-colors hover:border-primary"
                    style={{
                      backgroundColor: 'var(--mg-surface-2)',
                      borderColor: 'var(--mg-border)',
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--mg-ink)' }}>
                        {theater.name}
                      </p>
                      <p className="text-xs flex items-center gap-1 mt-1 truncate" style={{ color: 'var(--mg-ink-2)' }}>
                        <MapPin className="w-3 h-3 shrink-0" style={{ color: 'var(--mg-accent)' }} />
                        {theater.location}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--mg-ink-3)' }} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
                Explore partner locations on the Cinemas page.
              </p>
            )}
          </div>
        </section>

        {/* Coming Soon Section */}
        {upcomingMovies.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-6 gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold font-display" style={{ color: 'var(--mg-ink)' }}>
                  Coming Soon
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--mg-ink-2)' }}>
                  Upcoming theatrical releases
                </p>
              </div>
              <Link
                to="/movies"
                className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                style={{ color: 'var(--mg-accent)' }}
              >
                Explore all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMovies.map((movie, mIdx) => (
                <Link
                  key={`upcoming-${movie._id || movie.id}-${mIdx}`}
                  to={`/movie/${movie._id || movie.id}`}
                  className="group flex gap-4 p-4 rounded-xl mg-surface transition-colors hover:border-primary"
                >
                  <div className="w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: 'var(--mg-surface-2)' }}>
                    <img src={movie.poster} alt={movie.title} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-accent)' }}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{movie.releaseDate || 'TBA'}</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold font-display truncate group-hover:text-primary transition-colors" style={{ color: 'var(--mg-ink)' }}>
                        {movie.title}
                      </h3>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--mg-ink-2)' }}>
                        {movie.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 text-xs" style={{ color: 'var(--mg-ink-3)' }}>
                      <span>{movie.genre}</span>
                      <span className="font-semibold" style={{ color: 'var(--mg-ink)' }}>View details →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Inner Circle Membership Strip */}
        <section
          className="rounded-2xl p-6 sm:p-8 border flex flex-col md:flex-row md:items-center justify-between gap-6"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border)',
          }}
        >
          <div className="space-y-2 max-w-xl">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md"
              style={{ backgroundColor: 'var(--mg-gold-soft)', color: 'var(--mg-gold)' }}
            >
              <Sparkles className="w-3.5 h-3.5" /> MoviGo Inner Circle
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-display" style={{ color: 'var(--mg-ink)' }}>
              Zero convenience fees &amp; 10% off every booking
            </h2>
            <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
              Join for ₹199/month and earn loyalty points on every ticket to exchange for snacks, merchandise, and passes.
            </p>
          </div>
          <Link to="/profile" className="shrink-0">
            <Button size="lg">Explore Membership</Button>
          </Link>
        </section>
      </div>

      {/* Trailer Modal */}
      <Modal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        title={`${featured.title} — Trailer`}
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

export default Home;

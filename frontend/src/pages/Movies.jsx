import React, { useEffect, useState, useMemo } from 'react';
import { Search, Star, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/common/Button';
import { getTrendingMovies } from '../services/movieService';
import { formatLocalDate } from '../utils/bookingUtils';

const GENRES = ['All', 'Action', 'Sci-Fi', 'Thriller', 'Animation', 'Drama', 'Adventure', 'Comedy'];

const MovieGridCard = ({ movie, isUpcoming = false }) => {
  if (!movie) return null;
  return (
    <Link to={`/movie/${movie._id || movie.id}`} className="group block focus:outline-none">
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
          alt={movie.title || 'Movie'}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="absolute top-2.5 right-2.5">
          {isUpcoming ? (
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-black/75 text-white">
              {movie.releaseDate || 'Coming Soon'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-black/75 text-white">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {movie.rating || '4.5'}
            </span>
          )}
        </div>
      </div>

      <h3
        className="text-base font-bold font-display truncate group-hover:text-primary transition-colors"
        style={{ color: 'var(--mg-ink)' }}
      >
        {movie.title || 'Untitled Movie'}
      </h3>
      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
        {movie.genre || 'Drama'}{movie.duration ? ` • ${movie.duration}` : ''}
      </p>
    </Link>
  );
};

const Movies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [statusTab, setStatusTab] = useState('now'); // 'now' | 'upcoming' | 'all'
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'rating' | 'title'
  const [isLoading, setIsLoading] = useState(true);

  const search = searchParams.get('search') || '';
  const selectedGenre = searchParams.get('genre') || 'All';

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || (k === 'genre' && v === 'All')) next.delete(k);
      else next.set(k, v);
    });
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    getTrendingMovies()
      .then((data) => {
        if (!Array.isArray(data)) {
          setMovies([]);
          setUpcomingMovies([]);
        } else {
          const todayStr = formatLocalDate(new Date());
          setMovies(data.filter((m) => (!m.releaseDate ? !m.isUpcoming : m.releaseDate <= todayStr)));
          setUpcomingMovies(data.filter((m) => (!m.releaseDate ? Boolean(m.isUpcoming) : m.releaseDate > todayStr)));
        }
      })
      .catch((err) => console.error('Error loading movies:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredReleased = useMemo(() => {
    let list = [...movies];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.title?.toLowerCase().includes(q) || m.genre?.toLowerCase().includes(q));
    }
    if (selectedGenre !== 'All') {
      const g = selectedGenre.toLowerCase();
      list = list.filter((m) => m.genre?.toLowerCase().includes(g));
    }
    if (sortBy === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortBy === 'title') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return list;
  }, [movies, search, selectedGenre, sortBy]);

  const filteredUpcoming = useMemo(() => {
    let list = [...upcomingMovies];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.title?.toLowerCase().includes(q) || m.genre?.toLowerCase().includes(q));
    }
    if (selectedGenre !== 'All') {
      const g = selectedGenre.toLowerCase();
      list = list.filter((m) => m.genre?.toLowerCase().includes(g));
    }
    if (sortBy === 'title') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return list;
  }, [upcomingMovies, search, selectedGenre, sortBy]);

  const showNow = statusTab === 'now' || statusTab === 'all';
  const showUpcoming = statusTab === 'upcoming' || statusTab === 'all';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b" style={{ borderColor: 'var(--mg-border)' }}>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display" style={{ color: 'var(--mg-ink)' }}>
            Movies
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--mg-ink-2)' }}>
            Browse theatrical releases and upcoming premieres.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
            <input
              type="text"
              placeholder="Search title or genre..."
              value={search}
              onChange={(e) => updateParams({ search: e.target.value })}
              className="mg-input pl-9 pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => updateParams({ search: '' })}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--mg-ink-3)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort movies"
            className="sm:w-44"
          >
            <option value="default">Sort: Featured</option>
            <option value="rating">Sort: Top Rated</option>
            <option value="title">Sort: Title (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Filter Bar: Tabs + Genre Chips */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-6">
        <div
          className="inline-flex p-1 rounded-lg border w-fit"
          style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
        >
          {[
            { id: 'now', label: `Now Showing (${filteredReleased.length})` },
            { id: 'upcoming', label: `Coming Soon (${filteredUpcoming.length})` },
            { id: 'all', label: 'All' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              style={{
                backgroundColor: statusTab === tab.id ? 'var(--mg-surface-2)' : 'transparent',
                color: statusTab === tab.id ? 'var(--mg-ink)' : 'var(--mg-ink-2)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          {GENRES.map((genre) => {
            const active = selectedGenre === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => updateParams({ genre })}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors cursor-pointer"
                style={{
                  backgroundColor: active ? 'var(--mg-accent)' : 'var(--mg-surface)',
                  borderColor: active ? 'var(--mg-accent)' : 'var(--mg-border)',
                  color: active ? '#ffffff' : 'var(--mg-ink-2)',
                }}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 py-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[2/3] rounded-xl animate-pulse mb-3" style={{ backgroundColor: 'var(--mg-surface-2)' }} />
              <div className="h-4 w-3/4 rounded animate-pulse mb-2" style={{ backgroundColor: 'var(--mg-surface-2)' }} />
              <div className="h-3 w-1/2 rounded animate-pulse" style={{ backgroundColor: 'var(--mg-surface-2)' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-14">
          {showNow && (
            <section>
              {filteredReleased.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {filteredReleased.map((movie) => (
                    <MovieGridCard key={movie._id || movie.id} movie={movie} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 rounded-2xl mg-surface">
                  <Search className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--mg-ink-3)' }} />
                  <h3 className="text-lg font-bold font-display mb-1" style={{ color: 'var(--mg-ink)' }}>
                    No matching movies found
                  </h3>
                  <p className="text-sm mb-5" style={{ color: 'var(--mg-ink-2)' }}>
                    Try clearing your search query or switching genre filters.
                  </p>
                  <Button variant="secondary" onClick={() => setSearchParams({}, { replace: true })}>
                    Reset Filters
                  </Button>
                </div>
              )}
            </section>
          )}

          {showUpcoming && filteredUpcoming.length > 0 && (
            <section className={showNow ? 'pt-10 border-t' : ''} style={{ borderColor: 'var(--mg-border)' }}>
              <div className="mb-6">
                <h2 className="text-2xl font-bold font-display" style={{ color: 'var(--mg-ink)' }}>
                  Coming Soon
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
                  Upcoming releases arriving in theaters
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredUpcoming.map((movie, mIdx) => (
                  <MovieGridCard key={`upcoming-${movie._id || movie.id}-${mIdx}`} movie={movie} isUpcoming />
                ))}
              </div>
            </section>
          )}

          {statusTab === 'upcoming' && filteredUpcoming.length === 0 && (
            <div className="text-center py-16 rounded-2xl mg-surface">
              <p className="text-sm mb-4" style={{ color: 'var(--mg-ink-2)' }}>
                No upcoming movies match the current filter.
              </p>
              <Button variant="secondary" onClick={() => setSearchParams({}, { replace: true })}>
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Movies;

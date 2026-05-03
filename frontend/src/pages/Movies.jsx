import React, { useEffect, useState } from 'react';
import { Search, Filter, Star, Ticket } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '../components/common/Card';
import Button from '../components/common/Button';
import { getTrendingMovies } from '../services/movieService';

const MovieCard = ({ movie, isUpcoming = false }) => {
  if (!movie) return null;
  
  return (
    <Link to={`/movie/${movie._id || movie.id}`} className="group/card relative w-full cursor-pointer">
      <Card className="h-[450px] w-full relative group-hover/card:shadow-[0_0_30px_rgba(244,63,94,0.2)] transition-all duration-500 overflow-hidden" glass={false}>
        <div className="absolute inset-0 bg-surface/50"></div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/30 to-transparent z-10 transition-opacity duration-300 group-hover/card:opacity-90"></div>
        <div className="absolute inset-0 z-0">
           <img src={movie.poster} alt={movie.title || 'Movie'} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110 opacity-90" onError={(e) => {e.target.style.display='none'}} />
        </div>
        
        <div className="absolute inset-x-0 bottom-0 p-6 z-20 flex flex-col justify-end bg-gradient-to-t from-base via-base/80 to-transparent">
          <h3 className="text-xl font-bold font-outfit mb-1 text-white truncate group-hover/card:text-primary transition-colors duration-300">{movie.title || 'Untitled Movie'}</h3>
          
          <div className="flex items-center space-x-2 text-sm text-white/70 mb-0 group-hover/card:mb-3 transition-all duration-500 delay-75">
            {isUpcoming ? (
              <span className="text-primary font-semibold">{movie.releaseDate || 'Coming Soon'}</span>
            ) : (
              <>
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span>{movie.rating || "4.5"}</span>
              </>
            )}
            <span>•</span>
            <span>{movie.genre || "Drama"}</span>
          </div>

          <div className="overflow-hidden max-h-0 opacity-0 group-hover/card:max-h-12 group-hover/card:opacity-100 transition-all duration-500 delay-100 pointer-events-none group-hover/card:pointer-events-auto">
            <Button className="w-full shadow-lg pointer-events-auto" variant={isUpcoming ? "secondary" : "primary"} size="sm">
              {isUpcoming ? "Notify Me" : "Book Ticket"}
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
};

const Movies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  const genres = ['All', 'Action', 'Sci-Fi', 'Thriller', 'Animation', 'Drama', 'Adventure'];

  useEffect(() => {
    console.log("Starting movie fetch...");
    getTrendingMovies()
      .then(data => {
        console.log("Data received:", data);
        if (!Array.isArray(data)) {
          console.error("Data is not an array:", data);
          setMovies([]);
          setFilteredMovies([]);
          setUpcomingMovies([]);
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const released = data.filter(m => {
            if (!m.releaseDate) return true;
            const rDate = new Date(m.releaseDate);
            if (isNaN(rDate.getTime())) return true;
            return rDate <= today;
          });
          
          const upcoming = data.filter(m => {
            if (!m.releaseDate) return false;
            const rDate = new Date(m.releaseDate);
            if (isNaN(rDate.getTime())) return false;
            return rDate > today;
          });
          
          setMovies(released);
          setFilteredMovies(released);
          setUpcomingMovies(upcoming);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Fatal error in Movies page:", err);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = movies;
    if (search) {
      result = result.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));
    }
    if (selectedGenre !== 'All') {
      result = result.filter(m => m.genre && m.genre.toLowerCase().includes(selectedGenre.toLowerCase()));
    }
    setFilteredMovies(result);
  }, [search, selectedGenre, movies]);

  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null) {
      setSearch(query);
    }
  }, [searchParams]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-outfit mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 text-shadow-lg">
            Explore Movies
          </h1>
          <p className="text-muted text-lg max-w-xl">
            Browse through our collection of the latest blockbusters and trending hits.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search movies..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface/50 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white w-full sm:w-64 focus:outline-none focus:border-primary/50 transition-all backdrop-blur-md"
            />
          </div>

          {/* Genre Filter */}
          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
            <select 
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="appearance-none bg-surface/50 border border-white/10 rounded-2xl py-3 pl-11 pr-10 text-white w-full sm:w-48 focus:outline-none focus:border-primary/50 transition-all backdrop-blur-md cursor-pointer"
            >
              {genres.map(g => <option key={g} value={g} className="bg-base">{g}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">▼</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
           <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
           <p className="text-muted font-outfit animate-pulse">Fetching Blockbusters...</p>
        </div>
      ) : filteredMovies.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredMovies.map(movie => (
            <MovieCard key={movie._id || movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-surface/20 rounded-3xl border border-white/5 backdrop-blur-sm">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 font-outfit">No movies found</h3>
          <p className="text-muted">Try adjusting your search or filters to find what you're looking for.</p>
          <Button variant="secondary" className="mt-8" onClick={() => { setSearch(''); setSelectedGenre('All'); }}>
            Clear All Filters
          </Button>
        </div>
      )}

      {/* Upcoming Section */}
      <section className="mt-20 pt-16 border-t border-white/10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold font-outfit mb-2">Upcoming Releases</h2>
            <p className="text-muted">Highly anticipated movies coming soon</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {upcomingMovies.map((movie, mIdx) => (
            <MovieCard key={`upcoming-${movie._id || movie.id}-${mIdx}`} movie={movie} isUpcoming={true} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Movies;

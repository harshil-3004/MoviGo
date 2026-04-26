import React, { useEffect, useState, useRef } from 'react';
import { Play, ChevronRight, ChevronLeft, Star, Ticket, Bell } from 'lucide-react';
import Button from '../components/common/Button';
import { Card } from '../components/common/Card';
import { getTrendingMovies } from '../services/movieService';
import { Link } from 'react-router-dom';
import Modal from '../components/common/Modal';

const MovieCard = ({ movie, isUpcoming = false }) => (
  <Link to={`/movie/${movie._id || movie.id}`} className="group/card relative w-64 flex-shrink-0 cursor-pointer snap-start">
    <Card className="h-96 w-full relative group-hover/card:shadow-[0_0_30px_rgba(244,63,94,0.2)] transition-all duration-500 overflow-hidden" glass={false}>
      <div className="absolute inset-0 bg-surface/50"></div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-base via-base/30 to-transparent z-10 transition-opacity duration-300 group-hover/card:opacity-90"></div>
      <div className="absolute inset-0 z-0">
         <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110 opacity-90" onError={(e) => {e.target.style.display='none'}} />
      </div>
      
      <div className="absolute inset-x-0 bottom-0 p-6 z-20 flex flex-col justify-end bg-gradient-to-t from-base via-base/80 to-transparent">
        <h3 className="text-xl font-bold font-outfit mb-1 text-white truncate group-hover/card:text-primary transition-colors duration-300">{movie.title}</h3>
        
        <div className="flex items-center space-x-2 text-sm text-white/70 mb-0 group-hover/card:mb-3 transition-all duration-500 delay-75">
          {isUpcoming ? (
            <span className="text-primary font-semibold">{movie.releaseDate}</span>
          ) : (
            <>
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span>{movie.rating || "4.5"}</span>
            </>
          )}
          <span>•</span>
          <span>{movie.genre || "Action"}</span>
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

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [featured, setFeatured] = useState({});
  const [trailerOpen, setTrailerOpen] = useState(false);
  const scrollRef = useRef(null);

  const scrollContainer = (direction) => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth + 100 : current.offsetWidth - 100;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  useEffect(() => {
    getTrendingMovies().then(data => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Split into released and upcoming based on date
      const released = data.filter(m => {
        if (!m.releaseDate) return true;
        const rDate = new Date(m.releaseDate);
        if (isNaN(rDate.getTime())) return true; // Default to released if invalid date
        return rDate <= today;
      });

      const upcoming = data.filter(m => {
        if (!m.releaseDate) return false;
        const rDate = new Date(m.releaseDate);
        if (isNaN(rDate.getTime())) return false;
        return rDate > today;
      });
      
      setMovies(released);
      setUpcomingMovies(upcoming);

      // Select featured movie: either the one marked isFeatured, or the first released movie
      const featuredMovie = data.find(m => m.isFeatured) || released[0];
      setFeatured(featuredMovie || {
        title: 'Welcome to MoviGo',
        description: 'Discover the latest blockbusters and secure your seats today.',
        backdrop: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070'
      });
    });
  }, []);

  return (
    <div className="w-full -mt-24">
      
      {/* Hero Banner */}
      <div className="relative h-screen min-h-[600px] max-h-[900px] w-full flex items-center">
        {/* Background Image / Gradient */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-base via-base/90 to-transparent z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-base via-transparent to-base/20 z-10"></div>
          
          <div className="w-full h-full bg-base/40 flex items-center justify-center relative">
             {featured.backdrop && (
               <img src={featured.backdrop} alt={featured.title} className="absolute inset-0 w-full h-full object-cover opacity-80 transition-opacity duration-1000 mix-blend-screen" />
             )}
             <div className="absolute right-[-10%] top-[-10%] w-[60%] h-[120%] bg-gradient-to-bl from-primary/30 to-secondary/30 blur-[120px] rounded-full"></div>
             {/* Poster mockup background */}
             <div className="absolute inset-0 opacity-50 right-0 left-auto w-1/2 bg-gradient-to-l from-white/10 to-transparent mix-blend-overlay"></div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-surface/80 border border-white/10 backdrop-blur-md mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse mr-2.5 shadow-[0_0_10px_rgba(244,63,94,1)]"></span>
              <span className="text-xs font-semibold tracking-[0.15em] uppercase text-white/90">Now Showing</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold font-outfit mb-6 leading-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 line-clamp-2">
              {featured.title}
            </h1>
            
            <p className="text-lg text-muted mb-10 max-w-xl leading-relaxed line-clamp-2">
              {featured.description}
            </p>
            
            <div className="flex flex-wrap items-center gap-5">
              {featured.releaseDate && new Date(featured.releaseDate) > new Date() ? (
                <Button size="lg" className="px-8 shadow-[0_0_20px_rgba(59,130,246,0.4)] !bg-blue-600 hover:!bg-blue-700 !border-blue-500">
                  <Bell className="w-5 h-5 mr-3" />
                  Notify Me
                </Button>
              ) : (
                <Link to={`/theaters/${featured._id || featured.id}`}>
                  <Button size="lg" className="px-8 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                    <Ticket className="w-5 h-5 mr-3" />
                    Get Tickets
                  </Button>
                </Link>
              )}
              <Button variant="secondary" size="lg" className="px-8" onClick={() => setTrailerOpen(true)}>
                <Play className="w-5 h-5 mr-3 text-white" />
                Watch Trailer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-30 pb-20">
        
        {/* Trending Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold font-outfit mb-2">Trending Now</h2>
              <p className="text-muted">Most booked movies this week</p>
            </div>
            <Link to="/movies" className="hidden sm:flex items-center text-sm font-medium text-primary hover:text-white transition-colors cursor-pointer self-end pb-1">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="relative group/scroll">
            {/* Left Scroll Arrow */}
            <button 
              onClick={() => scrollContainer('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-black/60 hover:bg-black/90 text-primary hover:text-white p-3 rounded-full opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 disabled:opacity-0 focus:outline-none cursor-pointer -ml-6 shadow-xl"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div ref={scrollRef} className="flex overflow-x-auto gap-6 pb-12 pt-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 snap-x snap-mandatory hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {Array.from({ length: 4 }).flatMap((_, idx) => 
                 movies.map((movie, mIdx) => <MovieCard key={`${movie._id || movie.id}-${idx}-${mIdx}`} movie={movie} />)
              )}
            </div>

            {/* Right Scroll Arrow */}
            <button 
              onClick={() => scrollContainer('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-black/60 hover:bg-black/90 text-primary hover:text-white p-3 rounded-full opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 focus:outline-none cursor-pointer -mr-6 shadow-xl"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </section>

        {/* Upcoming Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold font-outfit mb-2">Upcoming Releases</h2>
              <p className="text-muted">Highly anticipated movies coming soon</p>
            </div>
            <Link to="/movies" className="hidden sm:flex items-center text-sm font-medium text-primary hover:text-white transition-colors cursor-pointer self-end pb-1">
              Explore All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="relative group/scroll2">
            <div className="flex overflow-x-auto gap-6 pb-12 pt-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 snap-x snap-mandatory hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {upcomingMovies.map((movie, mIdx) => (
                <MovieCard key={`upcoming-${movie._id || movie.id}-${mIdx}`} movie={movie} isUpcoming={true} />
              ))}
            </div>
          </div>
        </section>

      </div>

      <Modal isOpen={trailerOpen} onClose={() => setTrailerOpen(false)} title={`${featured.title} - Official Trailer`} className="max-w-4xl w-[95vw] md:w-[80vw] lg:w-[50vw]">
         <div className="aspect-video w-full rounded-xl overflow-hidden relative bg-black shadow-[0_0_50px_rgba(244,63,94,0.1)] border border-white/5">
            {featured.trailerUrl ? (
              <iframe
                width="100%"
                height="100%"
                src={`${featured.trailerUrl}${featured.trailerUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1`}
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

export default Home;

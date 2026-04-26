import React, { useEffect, useState } from 'react';
import { MapPin, Search, Info, Monitor, Globe, ChevronRight } from 'lucide-react';
import { Card } from '../components/common/Card';
import { getTheaters } from '../services/theaterService';
import { Link, useSearchParams } from 'react-router-dom';

const TheaterCard = ({ theater }) => (
  <Card className="p-6 h-full bg-surface/30 border border-white/5 transition-all hover:bg-surface/50 hover:border-white/20 hover:shadow-[0_0_30px_rgba(244,63,94,0.1)] group">
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
          <Monitor className="w-6 h-6" />
        </div>
        <div className="flex gap-2">
           {theater.format?.split(',').map(f => (
             <span key={f} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60">
               {f.trim()}
             </span>
           ))}
        </div>
      </div>

      <h3 className="text-xl font-bold font-outfit text-white mb-2 group-hover:text-primary transition-colors">
        {theater.name}
      </h3>
      
      <div className="flex items-start gap-2 text-muted text-sm mb-6">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="leading-relaxed">{theater.location || 'Location details pending'}</p>
      </div>

      <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.1em]">
        <span className="text-muted flex items-center gap-1.5 cursor-default">
          <Globe className="w-3.5 h-3.5" /> Site Map
        </span>
        <Link 
          to={`/cinema/${theater._id || theater.id}/shows`}
          className="text-primary hover:text-white transition-colors cursor-pointer flex items-center gap-1 group/link"
        >
          Explore Shows <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  </Card>
);

const Cinemas = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [theaters, setTheaters] = useState([]);
  const [filteredTheaters, setFilteredTheaters] = useState([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTheaters().then(data => {
      // If data is empty, use some mock data for better UX
      const finalData = data.length > 0 ? data : [
        { id: 1, name: 'Cineplex IMAX - City Center', location: '123 Main St, Downtown Market', format: 'IMAX, 3D, 2D' },
        { id: 2, name: 'Starlight Cinemas', location: 'North Mall, 3rd Floor, Riverside', format: 'Standard 2D' },
        { id: 3, name: 'Vue Grand Screens', location: 'Westside Avenue, Block B', format: 'Dolby Atmos, 2D' },
        { id: 4, name: 'Emerald Luxe Cinema', location: 'Platinum Heights, South Wing', format: 'Gold Class, 2D' }
      ];
      setTheaters(finalData);
      setFilteredTheaters(finalData);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    const result = theaters.filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) || 
      t.location.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredTheaters(result);
  }, [search, theaters]);

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
          <h1 className="text-4xl md:text-5xl font-bold font-outfit mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
            Our Cinemas
          </h1>
          <p className="text-muted text-lg max-w-xl">
            Find the nearest MoviGo location and experience cinema like never before.
          </p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search by name or city..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-surface/50 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white w-full focus:outline-none focus:border-primary/50 transition-all backdrop-blur-md"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
           <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
           <p className="text-muted font-outfit animate-pulse">Locating Theaters...</p>
        </div>
      ) : filteredTheaters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTheaters.map(theater => (
            <TheaterCard key={theater.id || theater._id} theater={theater} />
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-surface/20 rounded-3xl border border-white/5 backdrop-blur-sm">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 font-outfit">No cinemas found</h3>
          <p className="text-muted">Try searching for a different city or location.</p>
          <button className="text-primary hover:underline mt-4 font-semibold" onClick={() => setSearch('')}>
            View all locations
          </button>
        </div>
      )}

      {/* Map Placeholder for Rich Aesthetics */}
      <div className="mt-20 relative h-[400px] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
         <div className="absolute inset-0 bg-[#0a0b10] flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            <div className="relative z-10 text-center px-6">
               <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/40 animate-pulse">
                  <MapPin className="w-10 h-10 text-primary" />
               </div>
               <h3 className="text-2xl font-bold text-white mb-3 font-outfit">Interactive Map View</h3>
               <p className="text-muted max-w-md mx-auto">Explore all 34+ MoviGo locations across the country on our interactive global map.</p>
               <div className="mt-8 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full inline-block cursor-pointer transition-all font-semibold text-sm">
                  Enable Location Services
               </div>
            </div>
         </div>
         {/* Decorative elements */}
         <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 blur-[80px] rounded-full"></div>
         <div className="absolute bottom-10 right-10 w-40 h-40 bg-secondary/10 blur-[100px] rounded-full"></div>
      </div>
    </div>
  );
};

export default Cinemas;

import React, { useEffect, useState, useMemo } from 'react';
import { MapPin, Search, Monitor, ChevronRight, Navigation } from 'lucide-react';
import { getTheaters } from '../services/theaterService';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/common/Button';

const FORMAT_FILTERS = ['All', 'IMAX', 'Dolby', '4DX', 'Standard'];

const Cinemas = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [theaters, setTheaters] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('');

  const search = searchParams.get('search') || '';
  const setSearch = (val) => {
    setSearchParams(val ? { search: val } : {}, { replace: true });
  };

  useEffect(() => {
    getTheaters().then((data) => {
      setTheaters(Array.isArray(data) ? data : []);
      setIsLoading(false);
    });
  }, []);

  const filteredTheaters = useMemo(() => {
    const q = search.toLowerCase();
    return theaters.filter((t) => {
      const matchesText =
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.location?.toLowerCase().includes(q);
      const matchesFormat =
        selectedFormat === 'All' ||
        t.format?.toLowerCase().includes(selectedFormat.toLowerCase());
      return matchesText && matchesFormat;
    });
  }, [search, selectedFormat, theaters]);

  const handleEnableLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }
    setLocationStatus('Checking location permissions...');
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationStatus('Location enabled — showing all partner cinemas.');
      },
      () => {
        setLocationStatus('Location access declined. Search by city or area above.');
      }
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b" style={{ borderColor: 'var(--mg-border)' }}>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display" style={{ color: 'var(--mg-ink)' }}>
            Cinemas
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--mg-ink-2)' }}>
            Explore theater locations, screen formats, and daily show schedules.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
            <input
              type="text"
              placeholder="Search cinema or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mg-input pl-9"
            />
          </div>
          <Button variant="secondary" onClick={handleEnableLocation} className="shrink-0">
            <Navigation className="w-4 h-4" /> Near Me
          </Button>
        </div>
      </div>

      {locationStatus && (
        <div
          className="mt-4 px-4 py-2.5 rounded-lg text-xs font-medium border"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border)',
            color: 'var(--mg-ink-2)',
          }}
        >
          {locationStatus}
        </div>
      )}

      {/* Format Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-6">
        {FORMAT_FILTERS.map((fmt) => {
          const active = selectedFormat === fmt;
          return (
            <button
              key={fmt}
              type="button"
              onClick={() => setSelectedFormat(fmt)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--mg-accent)' : 'var(--mg-surface)',
                borderColor: active ? 'var(--mg-accent)' : 'var(--mg-border)',
                color: active ? '#ffffff' : 'var(--mg-ink-2)',
              }}
            >
              {fmt}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-xl animate-pulse mg-surface" />
          ))}
        </div>
      ) : filteredTheaters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTheaters.map((theater) => (
            <div
              key={theater._id || theater.id}
              className="rounded-xl p-6 mg-surface flex flex-col justify-between transition-colors hover:border-primary"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'var(--mg-accent-soft)', color: 'var(--mg-accent)' }}
                  >
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {theater.format?.split(/[,/]/).map((f) => (
                      <span
                        key={f}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--mg-surface-2)', color: 'var(--mg-ink-2)' }}
                      >
                        {f.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                <h2 className="text-lg font-bold font-display mb-1.5" style={{ color: 'var(--mg-ink)' }}>
                  {theater.name}
                </h2>
                <p className="text-sm flex items-start gap-1.5 mb-5" style={{ color: 'var(--mg-ink-2)' }}>
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--mg-accent)' }} />
                  <span>{theater.location || 'Location pending'}</span>
                </p>
              </div>

              <div
                className="pt-4 border-t flex items-center justify-between text-xs"
                style={{ borderColor: 'var(--mg-border)' }}
              >
                <span style={{ color: 'var(--mg-ink-3)' }}>
                  {theater.screens?.length || 1} Screen{(theater.screens?.length || 1) > 1 ? 's' : ''}
                </span>
                <Link
                  to={`/cinema/${theater._id || theater.id}/shows`}
                  className="inline-flex items-center gap-1 font-semibold hover:underline"
                  style={{ color: 'var(--mg-accent)' }}
                >
                  View Showtimes <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl mg-surface">
          <MapPin className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--mg-ink-3)' }} />
          <h3 className="text-lg font-bold font-display mb-1" style={{ color: 'var(--mg-ink)' }}>
            No cinemas found
          </h3>
          <p className="text-sm mb-5" style={{ color: 'var(--mg-ink-2)' }}>
            Try adjusting your search or format filter.
          </p>
          {(search || selectedFormat !== 'All') && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setSelectedFormat('All');
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Cinemas;

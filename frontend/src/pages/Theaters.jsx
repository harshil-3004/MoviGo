import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Film,
} from 'lucide-react';
import { getMovieDetails } from '../services/movieService';
import { getShowtimesByMovie } from '../services/showtimeService';
import { setShowtime, startBooking } from '../store/bookingSlice';
import Button from '../components/common/Button';
import BookingSteps from '../components/common/BookingSteps';
import {
  formatLocalDate,
  parseLocalISODate,
  getScreenForShowtime,
  evaluateBookingWindow,
} from '../utils/bookingUtils';

const getDescriptiveDate = (date) => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const targetDate = new Date(date);
  const targetISO = formatLocalDate(targetDate);

  if (formatLocalDate(today) === targetISO) return 'Today';
  if (formatLocalDate(tomorrow) === targetISO) return 'Tomorrow';

  return targetDate.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const buildInitialDates = () => {
  const list = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    list.push({
      iso: formatLocalDate(d),
      label:
        i === 0
          ? 'Today'
          : i === 1
            ? 'Tomorrow'
            : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
    });
  }
  return list;
};

const getShowCapacity = (show) => {
  const screen = getScreenForShowtime(show);
  if (screen?.layout?.length > 0) {
    let count = 0;
    for (const row of screen.layout) {
      for (const cell of row) {
        if (cell.type !== 'aisle' && !cell.isReserved) count += 1;
      }
    }
    return count || 120;
  }
  if (screen?.rows && screen?.cols) return screen.rows * screen.cols;
  return 120;
};

const Theaters = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [movie, setMovie] = useState(null);
  const [allShowtimes, setAllShowtimes] = useState([]);
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [availableDates, setAvailableDates] = useState(buildInitialDates);

  const calendarRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        const [movieData, showtimeData] = await Promise.all([
          getMovieDetails(id),
          getShowtimesByMovie(id),
        ]);
        setMovie(movieData);
        setAllShowtimes(Array.isArray(showtimeData) ? showtimeData : []);
      } catch (error) {
        console.error('Error loading theater data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!isCalendarOpen) return;
    const handleOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsCalendarOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isCalendarOpen]);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const blanks = Array.from({ length: firstDay }).map((_, i) => `blank-${i}`);
  const days = Array.from({ length: daysInMonth }).map((_, i) => {
    const d = new Date(year, month, i + 1);
    return {
      number: i + 1,
      iso: formatLocalDate(d),
      label: getDescriptiveDate(d),
    };
  });
  const monthYearRow = currentMonthDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handlePrevMonth = () =>
    setCurrentMonthDate(new Date(year, month - 1, 1));
  const handleNextMonth = () =>
    setCurrentMonthDate(new Date(year, month + 1, 1));

  const selectedISO = useMemo(() => {
    const found = availableDates.find((d) => d.label === selectedDate);
    return found ? found.iso : formatLocalDate(new Date());
  }, [availableDates, selectedDate]);

  const groupedTheaters = useMemo(() => {
    const grouped = {};
    allShowtimes
      .filter(
        (s) =>
          s.theater &&
          s.date === selectedISO &&
          evaluateBookingWindow(s.date, s.time).canBook
      )
      .forEach((s) => {
        const theaterId = s.theater._id;
        if (!grouped[theaterId]) {
          grouped[theaterId] = {
            _id: theaterId,
            name: s.theater.name,
            location: s.theater.location,
            format: s.theater.format || '2D',
            shows: [],
          };
        }
        grouped[theaterId].shows.push(s);
      });
    return Object.values(grouped);
  }, [allShowtimes, selectedISO]);

  const availableFormats = useMemo(() => {
    const set = new Set(['All']);
    groupedTheaters.forEach((t) => {
      String(t.format || '')
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean)
        .forEach((f) => set.add(f));
    });
    return Array.from(set);
  }, [groupedTheaters]);

  const visibleTheaters = useMemo(() => {
    if (selectedFormat === 'All') return groupedTheaters;
    return groupedTheaters.filter((t) =>
      String(t.format || '')
        .split(',')
        .map((f) => f.trim().toLowerCase())
        .includes(selectedFormat.toLowerCase())
    );
  }, [groupedTheaters, selectedFormat]);

  const handleSelectTiming = (showtime) => {
    dispatch(startBooking({ movieId: id }));
    dispatch(
      setShowtime({
        id: showtime._id,
        showtimeId: showtime._id,
        theater: showtime.theater._id,
        theaterId: showtime.theater._id,
        theaterName: showtime.theater.name,
        date: showtime.date,
        time: showtime.time,
        screenNumber: showtime.screenNumber || 1,
      })
    );
    navigate(`/seat-selection/${id}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="h-8 w-40 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--mg-surface-2)' }} />
        <div className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--mg-surface)' }} />
        <div className="h-44 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--mg-surface)' }} />
        <div className="h-44 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--mg-surface)' }} />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center px-6 text-center">
        <Film className="w-10 h-10 mb-3" style={{ color: 'var(--mg-ink-3)' }} />
        <h2 className="text-2xl font-display font-bold mb-2" style={{ color: 'var(--mg-ink)' }}>
          Movie Not Found
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--mg-ink-2)' }}>
          We couldn&apos;t load showtimes for this title.
        </p>
        <Button onClick={() => navigate('/movies')}>Browse Movies</Button>
      </div>
    );
  }

  const todayISO = formatLocalDate(new Date());

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 pb-24">
      {/* Top Bar & Booking Progress */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer hover:opacity-80"
          style={{ color: 'var(--mg-ink-2)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Movie
        </button>
        <BookingSteps currentStep={1} />
      </div>

      {/* Movie Summary Strip */}
      <div
        className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-xl border mb-6"
        style={{
          backgroundColor: 'var(--mg-surface)',
          borderColor: 'var(--mg-border)',
        }}
      >
        <img
          src={movie.poster}
          alt={movie.title}
          className="w-14 sm:w-16 aspect-[2/3] object-cover rounded-lg shrink-0 border"
          style={{ borderColor: 'var(--mg-border)' }}
        />
        <div className="min-w-0 flex-1">
          <h1
            className="text-2xl sm:text-3xl font-display font-bold tracking-tight truncate"
            style={{ color: 'var(--mg-ink)' }}
          >
            {movie.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs" style={{ color: 'var(--mg-ink-2)' }}>
            {movie.genre && (
              <span
                className="px-2.5 py-0.5 rounded-md font-medium"
                style={{ backgroundColor: 'var(--mg-surface-2)' }}
              >
                {movie.genre}
              </span>
            )}
            {movie.duration && <span>• {movie.duration}</span>}
            <span>• {movie.language || 'English'}</span>
          </div>
        </div>
      </div>

      {/* Sticky Date & Format Filter Bar */}
      <div
        className="sticky top-16 z-30 rounded-xl border p-3 sm:p-4 mb-8 backdrop-blur-md"
        style={{
          backgroundColor: 'var(--mg-nav-bg)',
          borderColor: 'var(--mg-border)',
          boxShadow: 'var(--mg-shadow-sm)',
        }}
      >
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Selector + Calendar */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar" ref={calendarRef}>
            <button
              type="button"
              onClick={() => setIsCalendarOpen((v) => !v)}
              aria-label="Choose date from calendar"
              aria-expanded={isCalendarOpen}
              className="flex-shrink-0 w-11 h-12 rounded-lg border flex items-center justify-center transition-colors cursor-pointer"
              style={{
                backgroundColor: isCalendarOpen ? 'var(--mg-accent)' : 'var(--mg-surface)',
                borderColor: isCalendarOpen ? 'var(--mg-accent)' : 'var(--mg-border)',
                color: isCalendarOpen ? '#ffffff' : 'var(--mg-ink)',
              }}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>

            {availableDates.map((date) => {
              const localDateObj = parseLocalISODate(date.iso);
              const monthLabel = localDateObj
                ? localDateObj.toLocaleString('default', { month: 'short' })
                : '';
              const isSelected = selectedDate === date.label;
              return (
                <button
                  key={date.iso}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date.label);
                    setSelectedFormat('All');
                  }}
                  className="flex-shrink-0 px-4 py-2 rounded-lg border text-left transition-colors cursor-pointer min-w-[92px]"
                  style={{
                    backgroundColor: isSelected ? 'var(--mg-accent)' : 'var(--mg-surface)',
                    borderColor: isSelected ? 'var(--mg-accent)' : 'var(--mg-border)',
                    color: isSelected ? '#ffffff' : 'var(--mg-ink)',
                  }}
                >
                  <span
                    className="block text-[10px] font-semibold uppercase tracking-wide"
                    style={{ opacity: isSelected ? 0.9 : 0.65 }}
                  >
                    {date.iso.split('-')[2]} {monthLabel}
                  </span>
                  <span className="text-xs font-bold whitespace-nowrap">{date.label}</span>
                </button>
              );
            })}

            {/* Calendar Popover */}
            {isCalendarOpen && (
              <div
                className="fixed sm:absolute top-20 sm:top-14 left-4 right-4 sm:right-auto sm:w-80 rounded-xl border p-4 z-50"
                style={{
                  backgroundColor: 'var(--mg-surface)',
                  borderColor: 'var(--mg-border-strong)',
                  boxShadow: 'var(--mg-shadow-lg)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous month"
                    className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer"
                    style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-ink-2)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                    {monthYearRow}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                    className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer"
                    style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-ink-2)' }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {weekdays.map((d) => (
                    <div
                      key={d}
                      className="text-[11px] font-semibold uppercase"
                      style={{ color: 'var(--mg-ink-3)' }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {blanks.map((b) => (
                    <div key={b} />
                  ))}
                  {days.map((dayInfo) => {
                    const isPast = dayInfo.iso < todayISO;
                    const isPicked = selectedISO === dayInfo.iso;
                    return (
                      <button
                        key={dayInfo.number}
                        type="button"
                        disabled={isPast}
                        onClick={() => {
                          if (isPast) return;
                          const baseInitial = buildInitialDates();
                          const alreadyInBase = baseInitial.find((d) => d.iso === dayInfo.iso);
                          if (!alreadyInBase) {
                            setAvailableDates([...baseInitial, { iso: dayInfo.iso, label: dayInfo.label }]);
                          } else {
                            setAvailableDates(baseInitial);
                          }
                          setSelectedDate(dayInfo.label);
                          setSelectedFormat('All');
                          setIsCalendarOpen(false);
                        }}
                        className="w-9 h-9 rounded-lg text-xs font-semibold mx-auto flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: isPicked ? 'var(--mg-accent)' : 'transparent',
                          color: isPicked ? '#ffffff' : 'var(--mg-ink)',
                        }}
                      >
                        {dayInfo.number}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Format Filters */}
          {availableFormats.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0">
              {availableFormats.map((fmt) => {
                const active = selectedFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setSelectedFormat(fmt)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: active ? 'var(--mg-ink)' : 'var(--mg-surface)',
                      color: active ? 'var(--mg-bg)' : 'var(--mg-ink-2)',
                      borderColor: active ? 'var(--mg-ink)' : 'var(--mg-border)',
                    }}
                  >
                    {fmt}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Theaters & Showtimes List */}
      <div className="space-y-4">
        {visibleTheaters.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-dashed text-center"
            style={{
              backgroundColor: 'var(--mg-surface)',
              borderColor: 'var(--mg-border-strong)',
            }}
          >
            <Clock className="w-9 h-9 mb-3" style={{ color: 'var(--mg-ink-3)' }} />
            <h3 className="text-lg font-display font-bold mb-1" style={{ color: 'var(--mg-ink)' }}>
              No Showtimes Available
            </h3>
            <p className="text-sm max-w-md" style={{ color: 'var(--mg-ink-2)' }}>
              There are no screenings scheduled for{' '}
              <strong style={{ color: 'var(--mg-ink)' }}>{selectedDate}</strong>
              {selectedFormat !== 'All' ? ` in ${selectedFormat}` : ''}. Try another date or format.
            </p>
          </div>
        ) : (
          visibleTheaters.map((theater) => (
            <div
              key={theater._id}
              className="rounded-xl border p-5 sm:p-6 transition-colors"
              style={{
                backgroundColor: 'var(--mg-surface)',
                borderColor: 'var(--mg-border)',
              }}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                {/* Cinema Info */}
                <div className="md:w-1/3 space-y-2">
                  <h2
                    className="text-lg sm:text-xl font-display font-bold"
                    style={{ color: 'var(--mg-ink)' }}
                  >
                    {theater.name}
                  </h2>
                  <p className="text-xs sm:text-sm flex items-start gap-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--mg-accent)' }} />
                    <span>{theater.location}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {String(theater.format || '2D')
                      .split(',')
                      .map((f) => f.trim())
                      .filter(Boolean)
                      .map((f) => (
                        <span
                          key={f}
                          className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold border"
                          style={{
                            backgroundColor: 'var(--mg-surface-2)',
                            borderColor: 'var(--mg-border)',
                            color: 'var(--mg-ink-2)',
                          }}
                        >
                          {f}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Showtimes */}
                <div className="md:w-2/3 flex flex-wrap gap-3">
                  {theater.shows.map((show) => {
                    const capacity = getShowCapacity(show);
                    const bookedCount = Array.isArray(show.bookedSeats) ? show.bookedSeats.length : 0;
                    const isFull = bookedCount >= capacity;
                    const fillRatio = capacity > 0 ? bookedCount / capacity : 0;
                    const isFillingFast = !isFull && fillRatio >= 0.7;

                    return (
                      <button
                        key={show._id}
                        type="button"
                        onClick={() => !isFull && handleSelectTiming(show)}
                        disabled={isFull}
                        className="relative px-4 py-2.5 rounded-lg border text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed hover:-translate-y-0.5"
                        style={{
                          backgroundColor: isFull ? 'var(--mg-surface-2)' : 'var(--mg-bg)',
                          borderColor: isFull
                            ? 'var(--mg-border)'
                            : isFillingFast
                              ? 'var(--mg-warning)'
                              : 'var(--mg-border-strong)',
                        }}
                      >
                        <span
                          className={`block text-sm font-mono font-bold ${isFull ? 'line-through' : ''}`}
                          style={{
                            color: isFull
                              ? 'var(--mg-ink-3)'
                              : isFillingFast
                                ? 'var(--mg-warning)'
                                : 'var(--mg-success)',
                          }}
                        >
                          {show.time}
                        </span>
                        <span className="block text-[11px] mt-0.5" style={{ color: 'var(--mg-ink-3)' }}>
                          Screen {show.screenNumber || 1}
                        </span>
                        {!isFull && evaluateBookingWindow(show.date, show.time).hasStarted && (
                          <span
                            className="inline-block mt-1 text-[10px] font-semibold"
                            style={{ color: 'var(--mg-warning)' }}
                          >
                            Live • Closes {evaluateBookingWindow(show.date, show.time).cutoffFormatted}
                          </span>
                        )}
                        {isFull && (
                          <span
                            className="inline-block mt-1 text-[10px] font-bold uppercase"
                            style={{ color: 'var(--mg-danger)' }}
                          >
                            Sold Out
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Theaters;

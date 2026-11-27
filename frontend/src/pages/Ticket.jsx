import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Download,
  ChevronLeft,
  MapPin,
  Calendar,
  Clock,
  Ticket as TicketIcon,
  Loader2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getBookingById, downloadBookingPDF } from '../services/bookingService';
import Button from '../components/common/Button';

const Ticket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticketDetails, setTicketDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchTicket = async () => {
      try {
        const data = await getBookingById(id);
        setTicketDetails(data);
      } catch (err) {
        console.error('Failed to load ticket', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTicket();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--mg-accent)' }} />
      </div>
    );
  }

  if (!ticketDetails) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center px-6 text-center">
        <TicketIcon className="w-10 h-10 mb-3" style={{ color: 'var(--mg-ink-3)' }} />
        <h2 className="text-2xl font-display font-bold mb-2" style={{ color: 'var(--mg-ink)' }}>
          Booking Not Found
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--mg-ink-2)' }}>
          We couldn&apos;t locate this reservation. Check your account booking history.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/profile')}>My Bookings</Button>
          <Button onClick={() => navigate('/')}>Home</Button>
        </div>
      </div>
    );
  }

  const { showtime, seats, totalAmount, bookingIdString, status = 'Confirmed' } = ticketDetails;
  const movie = showtime?.movie;
  const theater = showtime?.theater;
  const isConfirmed = status === 'Confirmed';

  const handleDownloadPDF = async () => {
    setDownloadError('');
    try {
      setIsDownloading(true);
      await downloadBookingPDF(
        ticketDetails._id,
        `MoviGo_Ticket_${bookingIdString || id}.pdf`
      );
    } catch (err) {
      console.error(err);
      setDownloadError('Could not generate PDF right now. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Non-confirmed bookings (Failed / Cancelled / Pending) must NOT display any ticket or entry pass
  if (!isConfirmed) {
    const isPending = status === 'Pending';
    const isCancelled = status === 'Cancelled';
    const statusColor = isPending ? 'var(--mg-warning)' : 'var(--mg-danger)';
    const statusBg = isPending ? 'var(--mg-warning-soft)' : 'var(--mg-danger-soft)';

    const heading = isCancelled
      ? 'Ticket Cancelled'
      : isPending
        ? 'Booking Incomplete'
        : 'Booking Failed';

    const subtitle = isCancelled
      ? 'This ticket has been cancelled and is no longer valid for cinema entry.'
      : isPending
        ? 'Payment was not completed for this reservation, so no ticket or entry pass was issued.'
        : 'This booking failed to complete or the seat hold expired before payment confirmation. No ticket was issued.';

    return (
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-14 pb-24">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 cursor-pointer hover:opacity-80"
          style={{ color: 'var(--mg-ink-2)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div
          className="rounded-2xl border p-8 sm:p-10 text-center space-y-5"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border-strong)',
            boxShadow: 'var(--mg-shadow-md)',
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto border"
            style={{
              backgroundColor: statusBg,
              borderColor: statusColor,
              color: statusColor,
            }}
          >
            {isPending ? <Clock className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
          </div>

          <div className="space-y-2">
            <span
              className="inline-block px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{ backgroundColor: statusBg, color: statusColor }}
            >
              {status}
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
              {heading}
            </h1>
            <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
              {subtitle}
            </p>
          </div>

          <div
            className="rounded-xl border p-4 text-left text-xs space-y-1.5 max-w-md mx-auto"
            style={{
              backgroundColor: 'var(--mg-surface-2)',
              borderColor: 'var(--mg-border)',
              color: 'var(--mg-ink-2)',
            }}
          >
            <div className="flex justify-between gap-4">
              <span style={{ color: 'var(--mg-ink-3)' }}>Reference ID</span>
              <span className="font-mono font-bold" style={{ color: 'var(--mg-ink)' }}>
                {bookingIdString || ticketDetails._id}
              </span>
            </div>
            {movie?.title && (
              <div className="flex justify-between gap-4">
                <span style={{ color: 'var(--mg-ink-3)' }}>Movie</span>
                <span className="font-semibold text-right" style={{ color: 'var(--mg-ink)' }}>
                  {movie.title}
                </span>
              </div>
            )}
            {theater?.name && (
              <div className="flex justify-between gap-4">
                <span style={{ color: 'var(--mg-ink-3)' }}>Cinema</span>
                <span className="text-right" style={{ color: 'var(--mg-ink)' }}>
                  {theater.name}
                </span>
              </div>
            )}
            {showtime?.date && (
              <div className="flex justify-between gap-4">
                <span style={{ color: 'var(--mg-ink-3)' }}>Showtime</span>
                <span className="font-mono" style={{ color: 'var(--mg-ink)' }}>
                  {showtime.date} • {showtime.time}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {movie?._id ? (
              <Link to={`/theaters/${movie._id}`}>
                <Button>Book Tickets Again</Button>
              </Link>
            ) : (
              <Link to="/movies">
                <Button>Browse Movies</Button>
              </Link>
            )}
            <Link to="/profile">
              <Button variant="outline">Back to Bookings</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12 pb-24">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 cursor-pointer no-print hover:opacity-80"
        style={{ color: 'var(--mg-ink-2)' }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Home
      </button>

      {/* Confirmation Heading */}
      <div className="flex flex-col items-center text-center mb-8 no-print">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4 border"
          style={{
            backgroundColor: 'var(--mg-success-soft)',
            borderColor: 'var(--mg-success)',
            color: 'var(--mg-success)',
          }}
        >
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-display font-bold mb-1.5" style={{ color: 'var(--mg-ink)' }}>
          Booking Confirmed
        </h1>
        <p className="text-sm max-w-md" style={{ color: 'var(--mg-ink-2)' }}>
          Show this digital pass or download the PDF to scan at the cinema entrance.
        </p>
      </div>

      {/* Digital Cinema Boarding Pass */}
      <div
        id="digital-ticket"
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--mg-surface)',
          borderColor: 'var(--mg-border-strong)',
          boxShadow: 'var(--mg-shadow-md)',
        }}
      >
        {/* Top Strip */}
        <div
          className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--mg-surface-2)',
            borderColor: 'var(--mg-border)',
          }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--mg-ink-3)' }}>
              Booking ID
            </p>
            <p className="font-mono text-base font-bold" style={{ color: 'var(--mg-ink)' }}>
              {bookingIdString || ticketDetails._id}
            </p>
          </div>
          <span
            className="px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'var(--mg-success-soft)',
              borderColor: 'var(--mg-success)',
              color: 'var(--mg-success)',
            }}
          >
            {status}
          </span>
        </div>

        {/* Main Content Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Show Info */}
          <div className="md:col-span-7 space-y-5">
            <div className="flex gap-4 items-start">
              {movie?.poster && (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-lg border shrink-0"
                  style={{ borderColor: 'var(--mg-border)' }}
                />
              )}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--mg-ink-3)' }}>
                  Presentation
                </p>
                <h2 className="text-xl sm:text-2xl font-display font-bold leading-snug" style={{ color: 'var(--mg-ink)' }}>
                  {movie?.title || 'Movie Screening'}
                </h2>
                {showtime?.screenNumber && (
                  <p className="text-xs font-medium mt-1" style={{ color: 'var(--mg-ink-2)' }}>
                    Screen {showtime.screenNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm" style={{ borderColor: 'var(--mg-border)' }}>
              <div>
                <p className="text-[11px] font-semibold uppercase flex items-center gap-1 mb-0.5" style={{ color: 'var(--mg-ink-3)' }}>
                  <Calendar className="w-3 h-3" /> Date
                </p>
                <p className="font-semibold" style={{ color: 'var(--mg-ink)' }}>
                  {showtime?.date || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase flex items-center gap-1 mb-0.5" style={{ color: 'var(--mg-ink-3)' }}>
                  <Clock className="w-3 h-3" /> Showtime
                </p>
                <p className="font-mono font-bold" style={{ color: 'var(--mg-accent)' }}>
                  {showtime?.time || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase flex items-center gap-1 mb-0.5" style={{ color: 'var(--mg-ink-3)' }}>
                  <MapPin className="w-3 h-3" /> Cinema
                </p>
                <p className="font-semibold" style={{ color: 'var(--mg-ink)' }}>
                  {theater?.name || 'Main Cinema'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase flex items-center gap-1 mb-0.5" style={{ color: 'var(--mg-ink-3)' }}>
                  <TicketIcon className="w-3 h-3" /> Seats
                </p>
                <p className="font-mono font-bold" style={{ color: 'var(--mg-ink)' }}>
                  {seats?.join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* QR Code Stub */}
          <div
            className="md:col-span-5 flex flex-col items-center justify-center pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-dashed relative md:pl-8"
            style={{ borderColor: 'var(--mg-border-strong)' }}
          >
            <div
              className="bg-white p-4 rounded-xl border"
              style={{ borderColor: 'var(--mg-border)' }}
            >
              <QRCodeSVG
                value={JSON.stringify({
                  id: ticketDetails._id,
                  uid: bookingIdString,
                  seats,
                  user: ticketDetails.user?.name,
                })}
                size={140}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--mg-ink-3)' }}>
              Scan at Cinema Entry
            </p>
          </div>
        </div>

        {/* Footer Strip */}
        <div
          className="px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs"
          style={{
            backgroundColor: 'var(--mg-surface-2)',
            borderColor: 'var(--mg-border)',
          }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold" style={{ color: 'var(--mg-ink)' }}>
              Amount Paid:{' '}
              <span className="font-mono font-bold" style={{ color: 'var(--mg-accent)' }}>
                ₹{Number(totalAmount ?? 0).toFixed(2)}
              </span>
            </span>
            <span style={{ color: 'var(--mg-ink-3)' }}>
              Booked {new Date(ticketDetails.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            {ticketDetails.isScanned && (
              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--mg-success)' }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Scanned {new Date(ticketDetails.scannedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
          </div>
          <span style={{ color: 'var(--mg-ink-3)' }}>
            Arrive 15 minutes before showtime
          </span>
        </div>
      </div>

      {downloadError && (
        <p className="mt-4 text-center text-xs font-medium flex items-center justify-center gap-1.5 no-print" style={{ color: 'var(--mg-danger)' }}>
          <AlertCircle className="w-3.5 h-3.5" />
          {downloadError}
        </p>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-wrap justify-center gap-3 no-print">
        <Button
          variant="secondary"
          onClick={handleDownloadPDF}
          isLoading={isDownloading}
        >
          <Download className="w-4 h-4" />
          Download PDF Ticket
        </Button>
        <Link to="/profile">
          <Button>View My Bookings</Button>
        </Link>
      </div>
    </div>
  );
};

export default Ticket;

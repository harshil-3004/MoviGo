import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  FileSpreadsheet,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { fetchApi } from '../../services/api';
import { downloadBookingPDF } from '../../services/bookingService';
import { formatLocalDate } from '../../utils/bookingUtils';

const AdminBookings = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await fetchApi('/bookings');
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching bookings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) =>
        (b.bookingIdString || '').toLowerCase().includes(q) ||
        (b.user?.name || '').toLowerCase().includes(q) ||
        (b.user?.email || '').toLowerCase().includes(q) ||
        (b.showtime?.movie?.title || '').toLowerCase().includes(q) ||
        (b.showtime?.theater?.name || '').toLowerCase().includes(q)
    );
  }, [bookings, searchTerm]);

  const handleExportCSV = () => {
    if (bookings.length === 0) return;

    const headers = [
      'Booking ID',
      'Customer',
      'Email',
      'Movie',
      'Theater',
      'Date',
      'Time',
      'Amount',
      'Status',
    ];
    const rows = bookings.map((b) => [
      b.bookingIdString,
      `"${b.user?.name || 'Unknown'}"`,
      b.user?.email || 'N/A',
      `"${b.showtime?.movie?.title || 'N/A'}"`,
      `"${b.showtime?.theater?.name || 'N/A'}"`,
      b.showtime?.date || 'N/A',
      b.showtime?.time || 'N/A',
      b.totalAmount,
      b.status,
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MoviGo_Bookings_${formatLocalDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleViewReceipt = (booking) => {
    setDownloadError('');
    setSelectedBooking(booking);
    setIsReceiptOpen(true);
  };

  const getStatusStyle = (status) => {
    if (status === 'Confirmed') {
      return { bg: 'var(--mg-success-soft)', color: 'var(--mg-success)' };
    }
    if (status === 'Pending') {
      return { bg: 'var(--mg-warning-soft)', color: 'var(--mg-warning)' };
    }
    if (status === 'Cancelled') {
      return { bg: 'var(--mg-surface-2)', color: 'var(--mg-ink-3)' };
    }
    return { bg: 'var(--mg-danger-soft)', color: 'var(--mg-danger)' };
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
            Bookings Ledger
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
            Review customer reservations, payment status, and downloadable PDF receipts.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={bookings.length === 0}>
          <FileSpreadsheet className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
      >
        <div
          className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ borderColor: 'var(--mg-border)', backgroundColor: 'var(--mg-surface-2)' }}
        >
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--mg-ink-3)' }} />
            <input
              type="text"
              placeholder="Search booking ID, customer, movie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mg-input w-full pl-10 pr-3 py-2 rounded-lg text-sm"
            />
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--mg-ink-3)' }}>
            {filteredBookings.length} {filteredBookings.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr
                className="border-b text-xs font-semibold uppercase tracking-wider"
                style={{ borderColor: 'var(--mg-border)', color: 'var(--mg-ink-3)' }}
              >
                <th className="py-3.5 px-5">Booking ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Movie &amp; Venue</th>
                <th className="py-3.5 px-4">Seats</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--mg-border)' }}>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center" style={{ color: 'var(--mg-ink-2)' }}>
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: 'var(--mg-accent)' }} />
                    Loading bookings...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center" style={{ color: 'var(--mg-ink-3)' }}>
                    No bookings found.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => {
                  const st = getStatusStyle(booking.status);
                  return (
                    <tr key={booking._id}>
                      <td className="py-3.5 px-5 font-mono text-xs font-bold" style={{ color: 'var(--mg-ink)' }}>
                        {booking.bookingIdString}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-xs sm:text-sm" style={{ color: 'var(--mg-ink)' }}>
                          {booking.user?.name || 'Guest'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>
                          {booking.user?.email || '—'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-xs sm:text-sm" style={{ color: 'var(--mg-ink)' }}>
                          {booking.showtime?.movie?.title || 'N/A'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                          {booking.showtime?.theater?.name || 'N/A'} • {booking.showtime?.date} {booking.showtime?.time}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold" style={{ color: 'var(--mg-ink)' }}>
                        {booking.seats?.join(', ') || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold" style={{ color: 'var(--mg-ink)' }}>
                        ₹{Number(booking.totalAmount ?? 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase"
                          style={{ backgroundColor: st.bg, color: st.color }}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(booking)}
                          title="View Receipt"
                          className="p-2 rounded-lg border cursor-pointer"
                          style={{
                            backgroundColor: 'var(--mg-surface-2)',
                            borderColor: 'var(--mg-border)',
                            color: 'var(--mg-ink-2)',
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      <Modal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title="Booking Receipt"
        className="max-w-xl"
      >
        {selectedBooking && (
          <div id="booking-receipt" className="space-y-5">
            <div
              className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b"
              style={{ borderColor: 'var(--mg-border)' }}
            >
              <div>
                <p className="font-mono text-sm font-bold" style={{ color: 'var(--mg-ink)' }}>
                  {selectedBooking.bookingIdString}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--mg-ink-3)' }}>
                  Booked on {new Date(selectedBooking.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <span
                className="px-2.5 py-0.5 rounded text-xs font-bold uppercase"
                style={{
                  backgroundColor: getStatusStyle(selectedBooking.status).bg,
                  color: getStatusStyle(selectedBooking.status).color,
                }}
              >
                {selectedBooking.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase" style={{ color: 'var(--mg-ink-3)' }}>
                  Customer
                </p>
                <p className="font-bold mt-0.5" style={{ color: 'var(--mg-ink)' }}>
                  {selectedBooking.user?.name || 'N/A'}
                </p>
                <p className="text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                  {selectedBooking.user?.email || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase" style={{ color: 'var(--mg-ink-3)' }}>
                  Cinema Venue
                </p>
                <p className="font-bold mt-0.5" style={{ color: 'var(--mg-ink)' }}>
                  {selectedBooking.showtime?.theater?.name || 'N/A'}
                </p>
                <p className="text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                  {selectedBooking.showtime?.theater?.location || 'N/A'}
                </p>
              </div>
            </div>

            <div
              className="rounded-xl border p-4 space-y-3"
              style={{
                backgroundColor: 'var(--mg-surface-2)',
                borderColor: 'var(--mg-border)',
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase" style={{ color: 'var(--mg-ink-3)' }}>
                    Movie
                  </p>
                  <p className="font-display font-bold text-base" style={{ color: 'var(--mg-ink)' }}>
                    {selectedBooking.showtime?.movie?.title || 'N/A'}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-semibold uppercase" style={{ color: 'var(--mg-ink-3)' }}>
                    Seats
                  </p>
                  <p className="font-mono font-bold text-sm" style={{ color: 'var(--mg-accent)' }}>
                    {selectedBooking.seats?.join(', ') || 'N/A'}
                  </p>
                </div>
              </div>

              <div
                className="pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-sm"
                style={{ borderColor: 'var(--mg-border)' }}
              >
                <div className="flex gap-4 text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                  <span>Date: <strong style={{ color: 'var(--mg-ink)' }}>{selectedBooking.showtime?.date || 'N/A'}</strong></span>
                  <span>Time: <strong className="font-mono" style={{ color: 'var(--mg-ink)' }}>{selectedBooking.showtime?.time || 'N/A'}</strong></span>
                </div>
                <div className="font-mono text-lg font-bold" style={{ color: 'var(--mg-success)' }}>
                  ₹{Number(selectedBooking.totalAmount ?? 0).toFixed(2)}
                </div>
              </div>
            </div>

            {downloadError && (
              <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--mg-danger)' }}>
                <AlertCircle className="w-3.5 h-3.5" />
                {downloadError}
              </p>
            )}

            <div className="flex justify-center pt-1 no-print">
              {selectedBooking.status === 'Confirmed' ? (
                <Button
                  isLoading={isDownloading}
                  onClick={async () => {
                    setDownloadError('');
                    try {
                      setIsDownloading(true);
                      await downloadBookingPDF(
                        selectedBooking._id,
                        `Receipt_${selectedBooking.bookingIdString}.pdf`
                      );
                    } catch (err) {
                      setDownloadError(err.message || 'Download failed');
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                >
                  <Download className="w-4 h-4" />
                  Download PDF Receipt
                </Button>
              ) : (
                <p
                  className="text-xs px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--mg-warning-soft)',
                    borderColor: 'var(--mg-warning)',
                    color: 'var(--mg-warning)',
                  }}
                >
                  PDF receipt is only generated for Confirmed bookings.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminBookings;

import React, { useState, useEffect } from 'react';
import { Search, Download, FileSpreadsheet, Eye, Activity, Loader2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { fetchApi } from '../../services/api';
import { downloadBookingPDF } from '../../services/bookingService';

const AdminBookings = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await fetchApi('/bookings');
        setBookings(data);

      } catch (err) {
        console.error("Error fetching bookings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleExportCSV = () => {
    if (bookings.length === 0) {
      alert("No data available to export.");
      return;
    }
    
    const headers = ["Booking ID", "Customer", "Email", "Movie", "Theater", "Date", "Time", "Amount", "Status"];
    const rows = bookings.map(b => [
      b.bookingIdString,
      `"${b.user?.name || 'Unknown'}"`,
      b.user?.email || 'N/A',
      `"${b.showtime?.movie?.title || 'N/A'}"`,
      `"${b.showtime?.theater?.name || 'N/A'}"`,
      b.showtime?.date || 'N/A',
      b.showtime?.time || 'N/A',
      b.totalAmount,
      b.status
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MoviGo_Bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewReceipt = (booking) => {
    setSelectedBooking(booking);
    setIsReceiptOpen(true);
  };

  return (
    <div className="p-6 md:p-10 w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-white mb-2">Booking Transactions</h1>
          <p className="text-muted">Monitor and audit customer ticket reservations in real-time.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleExportCSV}
          className="flex items-center text-primary border-primary bg-primary/10 hover:bg-primary hover:text-white transition-colors"
        >
          <FileSpreadsheet className="w-5 h-5 mr-2" /> Export to CSV
        </Button>
      </div>

      <div className="bg-surface/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between bg-white/[0.02]">
          <div className="relative w-full sm:w-80">
            <Search className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by ID or customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-muted focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/20 text-muted uppercase text-[11px] tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Booking ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Movie / Location</th>
                <th className="px-6 py-4">Show Date</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && (
                 <tr>
                   <td colSpan="7" className="px-6 py-10 text-center text-muted">
                     <Activity className="w-6 h-6 animate-pulse mx-auto mb-2 text-primary" /> Syncing secure transaction logs...
                   </td>
                 </tr>
              )}
              
              {!isLoading && bookings.filter(b => b.bookingIdString?.toLowerCase().includes(searchTerm.toLowerCase()) || b.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((booking) => (
                <tr key={booking._id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-white/90">{booking.bookingIdString}</td>
                  <td className="px-6 py-4 text-white">
                    <div className="font-bold">{booking.user?.name || 'Unknown User'}</div>
                    <div className="text-xs opacity-50">{booking.user?.email || ''}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{booking.showtime?.movie?.title || 'Unknown Movie'}</div>
                    <div className="text-xs text-muted font-medium mt-0.5">{booking.showtime?.theater?.name || 'Unknown Location'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white/80">{booking.showtime?.date || 'N/A'}</div>
                    <div className="text-xs text-primary font-bold tracking-wider mt-0.5">{booking.showtime?.time || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-green-400 font-bold tracking-wide">
                    ₹{booking.totalAmount?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      booking.status === 'Confirmed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      booking.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      booking.status === 'Failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      booking.status === 'Cancelled' ? 'bg-white/5 text-white/40 border border-white/10' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleViewReceipt(booking)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer" title="View Transaction">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      <Modal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} title="Booking Receipt">
        {selectedBooking && (
          <div id="booking-receipt" className="space-y-6 text-white font-outfit p-1 bg-base">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
               <div>
                  <h3 className={`text-xl font-bold mb-1 ${
                    selectedBooking.status === 'Confirmed' ? 'text-green-400' : 
                    selectedBooking.status === 'Pending' ? 'text-amber-400' : 
                    selectedBooking.status === 'Failed' ? 'text-red-400' :
                    'text-white/60'
                  }`}>
                    Receipt {selectedBooking.status}
                  </h3>
                  <p className="text-[10px] uppercase tracking-widest text-muted">ID: {selectedBooking.bookingIdString}</p>
               </div>
               <div className="text-right">
                  <p className="text-xs text-muted">Transaction Date</p>
                  <p className="font-bold">{new Date(selectedBooking.createdAt).toLocaleDateString()}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
               <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted mb-2">Customer Intelligence</p>
                  <p className="font-bold text-lg">{selectedBooking.user?.name || 'N/A'}</p>
                  <p className="text-sm text-white/60">{selectedBooking.user?.email || 'N/A'}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-muted mb-2">Theater / Location</p>
                  <p className="font-bold text-lg">{selectedBooking.showtime?.theater?.name || 'N/A'}</p>
                  <p className="text-sm text-white/60">{selectedBooking.showtime?.theater?.location || 'N/A'}</p>
               </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
               <div className="flex justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Movie Presentation</p>
                    <p className="text-xl font-bold">{selectedBooking.showtime?.movie?.title || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Seats Allocated</p>
                    <p className="text-xl font-bold text-primary">{selectedBooking.seats?.join(', ') || 'N/A'}</p>
                  </div>
               </div>
               <div className="flex justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <div>
                       <p className="text-[10px] uppercase tracking-widest text-muted">Date</p>
                       <p className="font-bold">{selectedBooking.showtime?.date || 'N/A'}</p>
                    </div>
                    <div>
                       <p className="text-[10px] uppercase tracking-widest text-muted">Time</p>
                       <p className="font-bold">{selectedBooking.showtime?.time || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] uppercase tracking-widest text-muted">Total Paid</p>
                     <p className="text-2xl font-black text-green-400">₹{selectedBooking.totalAmount?.toFixed(2)}</p>
                  </div>
               </div>
            </div>

            <div className="flex justify-center pt-4 no-print">
               {selectedBooking.status === 'Confirmed' ? (
                 <Button 
                  onClick={async () => {
                    try {
                      setIsDownloading(true);
                      await downloadBookingPDF(selectedBooking._id, `Receipt_${selectedBooking.bookingIdString}.pdf`);
                    } catch (err) {
                      alert("Download failed");
                    } finally {
                      setIsDownloading(false);
                    }
                  }} 
                  disabled={isDownloading}
                  className="w-full sm:w-auto"
                 >
                   {isDownloading ? (
                     <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                   ) : (
                     <><Download className="w-4 h-4 mr-2" /> Download Offline PDF</>
                   )}
                 </Button>
               ) : (
                 <p className="text-sm text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                   PDF Download is only available for Confirmed bookings.
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

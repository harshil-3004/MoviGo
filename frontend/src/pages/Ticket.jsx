import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Download, ChevronLeft, MapPin, Calendar, Clock, Ticket as TicketIcon, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getBookingById, downloadBookingPDF } from '../services/bookingService';
import Button from '../components/common/Button';

const Ticket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticketDetails, setTicketDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const data = await getBookingById(id);
        setTicketDetails(data);
      } catch (err) {
        console.error("Failed to load ticket", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTicket();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!ticketDetails) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 px-6">
        <h2 className="text-3xl font-bold font-outfit mb-4">Ticket Not Found</h2>
        <Button onClick={() => navigate('/')}>Return to Lobby</Button>
      </div>
    );
  }

  const { showtime, seats, totalAmount, bookingIdString } = ticketDetails;
  const movie = showtime?.movie;
  const theater = showtime?.theater;

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      await downloadBookingPDF(ticketDetails._id, `MoviGo_Ticket_${bookingIdString || id}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-base pt-8 pb-32 px-4 sm:px-6 lg:px-8 relative">
      {/* Background ambient light */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/20 via-base to-base z-0 pointer-events-none no-print"></div>

      <div className="relative z-10 max-w-3xl mx-auto">
        <button onClick={() => navigate('/')} className="inline-flex items-center text-muted hover:text-white transition-colors mb-8 cursor-pointer no-print">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Home
        </button>

        <div className="flex flex-col items-center justify-center text-center mb-10 no-print">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] mb-6 animate-in slide-in-from-bottom duration-500 fade-in zoom-in">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-4xl font-bold font-outfit text-white mb-2">Booking Confirmed!</h1>
          <p className="text-muted">Your tickets are secure. Present this QR code at the cinema entrance.</p>
        </div>

        {/* Digital Ticket */}
        <div id="digital-ticket" className="bg-base border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
          
          {/* Ticket Header */}
          <div className="bg-surface/50 border-b border-white/5 p-6 flex justify-between items-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full"></div>
             <div>
               <p className="text-xs text-white/50 font-bold uppercase tracking-widest mb-1">Unique Ticket ID</p>
               <p className="font-mono text-lg text-white font-bold tracking-wider">{bookingIdString || ticketDetails._id}</p>
             </div>
             <div className="text-right">
               <span className="inline-block px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full text-xs font-bold uppercase tracking-widest">
                 Confirmed
               </span>
             </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
             {/* Left Meta */}
             <div className="space-y-6">
                <div>
                   <p className="text-xs text-white/40 font-bold uppercase tracking-widest mb-2">Movie</p>
                   <h3 className="text-2xl font-bold text-white leading-tight">{movie?.title || 'Unknown Presentation'}</h3>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 flex items-center"><Calendar className="w-3 h-3 mr-1"/> Date</p>
                    <p className="text-white font-medium text-sm">{showtime?.date}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 flex items-center"><Clock className="w-3 h-3 mr-1"/> Time</p>
                    <p className="text-white font-medium text-sm text-primary">{showtime?.time}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                     <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 flex items-center"><MapPin className="w-3 h-3 mr-1"/> Theater</p>
                     <p className="text-white font-medium text-sm">{theater?.name || 'Main Cinema'}</p>
                  </div>
                  <div className="flex-1">
                     <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 flex items-center"><TicketIcon className="w-3 h-3 mr-1"/> Seats</p>
                     <p className="text-white font-bold text-sm tracking-widest">{seats?.join(', ')}</p>
                  </div>
                </div>
             </div>

             {/* Right QR */}
             <div className="flex flex-col items-center justify-center md:border-l md:border-dashed border-white/20 relative">
                {/* Visual Cutouts for Ticket aesthetic */}
                <div className="absolute -top-11 -left-4 w-8 h-8 rounded-full bg-base hidden md:block"></div>
                <div className="absolute -bottom-11 -left-4 w-8 h-8 rounded-full bg-base hidden md:block"></div>

                <div className="bg-white p-5 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] group transition-all duration-500 hover:scale-105 border-4 border-primary/20">
                  <QRCodeSVG 
                    value={JSON.stringify({
                      id: ticketDetails._id,
                      uid: bookingIdString,
                      seats: seats,
                      user: ticketDetails.user?.name
                    })}
                    size={140}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p className="mt-4 text-[10px] text-white/40 uppercase tracking-[0.3em] font-black">Scan at Sector Gate</p>
             </div>
          </div>

          {/* Ticket Footer */}
          <div className="bg-primary/10 border-t border-white/5 p-5 flex flex-col gap-4">
             <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest">
                   <TicketIcon className="w-4 h-4" /> Final Price Paid: ₹{totalAmount}
                </div>
                <p className="text-[10px] text-muted italic">Please arrive 15 minutes before showtime.</p>
             </div>
             <div className="border-t border-white/5 pt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] text-muted">
                   <Clock className="w-3 h-3" />
                   <span>Booked: <span className="text-white/70 font-bold">{new Date(ticketDetails.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></span>
                </div>
                {ticketDetails.isScanned && (
                   <div className="flex items-center gap-2 text-[10px] text-green-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Scanned: <span className="font-bold">{new Date(ticketDetails.scannedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></span>
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4 no-print">
          <Button 
            variant="secondary" 
            className="flex items-center" 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Download PDF</>
            )}
          </Button>
          <Link to="/profile">
             <Button>View All Tickets</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Ticket;

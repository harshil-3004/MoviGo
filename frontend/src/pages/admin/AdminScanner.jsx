import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  QrCode, Ticket, Gift, CheckCircle, XCircle, AlertTriangle, 
  Search, Clock, MapPin, Loader2, RefreshCw, Camera, CameraOff,
  Maximize
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { fetchApi } from '../../services/api';

const AdminScanner = () => {
  const location = useLocation();
  const theaterContext = location.state; // { theaterId, theaterName } if launched from theater card

  const [activeTab, setActiveTab] = useState('ticket'); // 'ticket' | 'redemption'
  const [scanMode, setScanMode] = useState('manual'); // 'manual' | 'camera'

  // Camera state
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const scannerId = "qr-reader";

  // Ticket state
  const [ticketInput, setTicketInput] = useState('');
  const [ticketResult, setTicketResult] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketConfirmed, setTicketConfirmed] = useState(false);

  // Redemption state
  const [redeemInput, setRedeemInput] = useState('');
  const [redeemResult, setRedeemResult] = useState(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemConfirmed, setRedeemConfirmed] = useState(false);

  // Stop camera on tab change or unmount
  useEffect(() => {
    stopScanner();
    return () => stopScanner();
  }, [activeTab]);

  const startScanner = async () => {
    // SECURITY CHECK: Browsers block camera on non-HTTPS connections
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setCameraError("CRITICAL: Camera access requires a SECURE (HTTPS) connection. Mobile browsers block camera on standard HTTP.");
      setScanMode('camera');
      return;
    }

    setIsCameraStarting(true);
    setCameraError(null);
    setScanMode('camera');

    try {
      // 1. Get available cameras
      const devices = await Html5Qrcode.getCameras();
      
      if (devices && devices.length > 0) {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;
        
        // 2. Configuration for the lens
        const qrConfig = { 
          fps: 15, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        // 3. Start with back camera (environment)
        await html5QrCode.start(
          { facingMode: "environment" },
          qrConfig,
          (decodedText) => {
            handleDecodedText(decodedText);
          },
          (errorMessage) => {
            // Frame analysis - silent
          }
        );
      } else {
        setCameraError("No cameras detected. Ensure permissions are granted in your browser settings.");
      }
    } catch (err) {
      console.error("Camera error details:", err);
      if (err.toString().includes("NotAllowedError") || err.toString().includes("Permission denied")) {
        setCameraError("PERMISSION DENIED: Please allow camera access in your browser settings and refresh.");
      } else {
        setCameraError("FAILED TO INITIALIZE: Another app might be using the camera, or your browser is blocking it.");
      }
    } finally {
      setIsCameraStarting(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
    }
    setScanMode('manual');
  };

  const handleDecodedText = (text) => {
    let finalCode = text;
    let detectedTab = activeTab;
    
    // 1. Try to parse JSON (for tickets)
    if (text.startsWith('{')) {
      try {
        const json = JSON.parse(text);
        finalCode = json.bookingId || json.uid || json.id || text;
        detectedTab = 'ticket';
      } catch (e) {
        // Not JSON, continue to other checks
      }
    }

    // 2. Prefix based detection
    if (finalCode.startsWith('RDM-')) {
      detectedTab = 'redemption';
    } else if (finalCode.startsWith('BK-')) {
      detectedTab = 'ticket';
    }

    // Auto-switch tab for visual consistency
    setActiveTab(detectedTab);

    if (detectedTab === 'ticket') {
      setTicketInput(finalCode.toUpperCase());
      stopScanner();
      handleTicketScan(false, finalCode.toUpperCase());
    } else {
      setRedeemInput(finalCode.toUpperCase());
      stopScanner();
      handleRedeemScan(false, finalCode.toUpperCase());
    }
  };

  const handleTicketScan = async (confirm = false, overrideInput) => {
    const input = (overrideInput || ticketInput).trim();
    if (!input) return;
    
    setTicketLoading(true);
    try {
      const data = await fetchApi('/scan/ticket', {
        method: 'POST',
        body: JSON.stringify({ bookingId: input, confirm })
      });
      setTicketResult({ ...data, isError: false });
      if (confirm && data.confirmed) setTicketConfirmed(true);
    } catch (err) {
      setTicketResult({ isError: true, message: err.message || 'Validation failed.' });
    } finally {
      setTicketLoading(false);
    }
  };

  const handleRedeemScan = async (confirm = false, overrideInput) => {
    const input = (overrideInput || redeemInput).trim();
    if (!input) return;

    setRedeemLoading(true);
    try {
      const data = await fetchApi('/scan/redemption', {
        method: 'POST',
        body: JSON.stringify({ code: input, confirm })
      });
      setRedeemResult({ ...data, isError: false });
      if (confirm && data.confirmed) setRedeemConfirmed(true);
    } catch (err) {
      setRedeemResult({ isError: true, message: err.message || 'Validation failed.' });
    } finally {
      setRedeemLoading(false);
    }
  };

  const resetTicket = () => { setTicketInput(''); setTicketResult(null); setTicketConfirmed(false); };
  const resetRedeem = () => { setRedeemInput(''); setRedeemResult(null); setRedeemConfirmed(false); };

  return (
    <div className="p-6 md:p-10 w-full animate-in fade-in duration-700 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-black uppercase tracking-widest">Entry Control</span>
          {theaterContext?.theaterName && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
              <MapPin className="w-3 h-3" /> {theaterContext.theaterName}
            </span>
          )}
        </div>
        <h1 className="text-4xl md:text-5xl font-black font-outfit text-white tracking-tighter uppercase">Scanner Station</h1>
        <p className="text-muted mt-2">
          {theaterContext?.theaterName
            ? `Validate entries for ${theaterContext.theaterName}`
            : 'Validate tickets and loyalty redemptions for your cinema branch.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-10 bg-surface/30 border border-white/5 rounded-2xl p-2 w-fit">
        <button
          onClick={() => setActiveTab('ticket')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'ticket' ? 'bg-primary text-white shadow-[0_10px_30px_rgba(244,63,94,0.3)]' : 'text-muted hover:text-white'}`}
        >
          <Ticket className="w-4 h-4" /> Movie Tickets
        </button>
        <button
          onClick={() => setActiveTab('redemption')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'redemption' ? 'bg-secondary text-white shadow-[0_10px_30px_rgba(139,92,246,0.3)]' : 'text-muted hover:text-white'}`}
        >
          <Gift className="w-4 h-4" /> Loyalty Rewards
        </button>
      </div>

      {/* ── SCANNER INTERFACE ── */}
      <div className="space-y-8">
        
        {/* Input Card */}
        <div className="bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 overflow-hidden relative">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${activeTab === 'ticket' ? 'bg-primary/10 border-primary/20' : 'bg-secondary/10 border-secondary/20'}`}>
                {activeTab === 'ticket' ? <Ticket className={`w-6 h-6 ${activeTab === 'ticket' ? 'text-primary' : 'text-secondary'}`} /> : <Gift className="w-6 h-6 text-secondary" />}
              </div>
              <div>
                <h2 className="text-xl font-black text-white font-outfit uppercase">
                  {activeTab === 'ticket' ? 'Ticket Verification' : 'Loyalty Redemption'}
                </h2>
                <p className="text-muted text-xs">
                  {scanMode === 'manual' 
                    ? `Enter ${activeTab === 'ticket' ? 'Booking ID' : 'Redemption Code'} manually or use camera`
                    : 'Position the QR code within the frame to scan'
                  }
                </p>
              </div>
            </div>

            <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
              <button 
                onClick={stopScanner}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${scanMode === 'manual' ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`}
              >
                <Search className="w-3.5 h-3.5" /> Manual
              </button>
              <button 
                onClick={startScanner}
                disabled={isCameraStarting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${scanMode === 'camera' ? 'bg-emerald-500 text-white shadow-lg' : 'text-muted hover:text-white'} disabled:opacity-50`}
              >
                {isCameraStarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                Camera Scan
              </button>
            </div>
          </div>

          {scanMode === 'manual' ? (
            <div className="flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="relative flex-1">
                {activeTab === 'ticket' ? <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" /> : <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />}
                <input
                  type="text"
                  placeholder={activeTab === 'ticket' ? "e.g. BK-1005" : "e.g. RDM-XXXXXXXX"}
                  value={activeTab === 'ticket' ? ticketInput : redeemInput}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    if (activeTab === 'ticket') {
                      setTicketInput(val); setTicketResult(null); setTicketConfirmed(false);
                    } else {
                      setRedeemInput(val); setRedeemResult(null); setRedeemConfirmed(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      activeTab === 'ticket' ? handleTicketScan(false) : handleRedeemScan(false);
                    }
                  }}
                  className={`w-full bg-black/40 border border-white/10 rounded-2xl py-5 pl-12 pr-4 text-white text-lg font-mono placeholder:text-muted/40 focus:outline-none transition-all tracking-widest ${activeTab === 'ticket' ? 'focus:border-primary/60' : 'focus:border-secondary/60'}`}
                />
              </div>
              <button
                onClick={() => activeTab === 'ticket' ? handleTicketScan(false) : handleRedeemScan(false)}
                disabled={(activeTab === 'ticket' ? (ticketLoading || !ticketInput.trim()) : (redeemLoading || !redeemInput.trim()))}
                className={`px-8 py-5 rounded-2xl text-white font-black text-sm uppercase tracking-widest transition-all disabled:opacity-40 flex items-center gap-2 cursor-pointer ${activeTab === 'ticket' ? 'bg-primary hover:bg-primary/80' : 'bg-secondary hover:bg-secondary/80'}`}
              >
                {activeTab === 'ticket' ? (ticketLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />) : (redeemLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />)}
                Verify
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <div className="relative mx-auto max-w-sm rounded-[2rem] overflow-hidden border-4 border-white/10 bg-black aspect-square">
                <div id={scannerId} className="w-full h-full"></div>
                {isCameraStarting && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                    <Loader2 className={`w-10 h-10 animate-spin mb-4 ${activeTab === 'ticket' ? 'text-primary' : 'text-secondary'}`} />
                    <p className="text-white font-bold text-xs uppercase tracking-widest">Initializing Lens...</p>
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/20 backdrop-blur-md p-8 text-center">
                    <CameraOff className="w-12 h-12 text-rose-500 mb-4" />
                    <p className="text-white font-bold mb-4">{cameraError}</p>
                    <button onClick={startScanner} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all">
                      Retry Camera
                    </button>
                  </div>
                )}
                
                {/* Overlay guides */}
                {!isCameraStarting && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                    <div className="w-full h-full border-2 border-white/20 relative">
                       <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500"></div>
                       <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500"></div>
                       <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500"></div>
                       <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500"></div>
                       
                       <div className="absolute top-1/2 left-0 w-full h-0.5 bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-scan"></div>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-center mt-6 text-[10px] font-black uppercase text-muted tracking-widest">
                Camera Active • Environment Mode
              </p>
            </div>
          )}
        </div>

        {/* Results Sections */}
        {activeTab === 'ticket' ? (
          /* ── TICKET RESULT ── */
          ticketResult && (
            <div className={`rounded-[2.5rem] p-8 border transition-all animate-in fade-in zoom-in-95 duration-300 ${
              ticketConfirmed ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]' :
              ticketResult.isError ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.1)]' :
              ticketResult.alreadyScanned ? 'bg-amber-500/10 border-amber-500/30' :
              'bg-surface/40 border-white/10 shadow-2xl'
            }`}>
              {ticketResult.isError ? (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-6 h-6 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-rose-400 font-outfit uppercase mb-2">Invalid Ticket</h3>
                    <p className="text-rose-300/80">{ticketResult.message}</p>
                    <button onClick={resetTicket} className="mt-4 flex items-center gap-2 text-xs font-black uppercase text-muted hover:text-white transition-all">
                      <RefreshCw className="w-3 h-3" /> Try Another
                    </button>
                  </div>
                </div>
              ) : ticketConfirmed ? (
                <div className="text-center py-6">
                  <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                  </div>
                  <h3 className="text-3xl font-black text-emerald-400 font-outfit uppercase mb-2">Entry Granted</h3>
                  <p className="text-emerald-300/70">Customer has been admitted. Ticket marked as used.</p>
                  <button onClick={resetTicket} className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl inline-flex items-center gap-2 text-xs font-black uppercase text-white transition-all mx-auto border border-white/5">
                    <RefreshCw className="w-3 h-3" /> Scan Next
                  </button>
                </div>
              ) : (
                <>
                  {ticketResult.alreadyScanned && (
                    <div className="flex items-center gap-3 mb-6 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <span className="text-amber-300 font-bold text-sm">{ticketResult.message}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 mb-8">
                    <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    <h3 className="text-2xl font-black text-white font-outfit uppercase">Ticket Valid — Confirm Entry?</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="flex gap-6">
                      <div className="w-24 h-36 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 shadow-2xl">
                        <img src={ticketResult.booking.showtime?.movie?.poster} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-muted tracking-widest mb-2">Presentation</p>
                        <h4 className="text-xl font-bold text-white leading-tight">{ticketResult.booking.showtime?.movie?.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted mt-3">
                          <Clock className="w-4 h-4 text-secondary" />
                          {ticketResult.booking.showtime?.date} @ {ticketResult.booking.showtime?.time}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted mt-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          {ticketResult.booking.showtime?.theater?.name}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-xs font-black uppercase text-muted tracking-widest">Booking ID</span>
                        <span className="font-mono text-white font-bold tracking-wider">{ticketResult.booking.bookingIdString}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-xs font-black uppercase text-muted tracking-widest">Customer</span>
                        <span className="text-white font-bold">{ticketResult.booking.user?.name}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-xs font-black uppercase text-muted tracking-widest">Seats</span>
                        <span className="text-emerald-400 font-bold tracking-widest">{ticketResult.booking.seats?.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  {!ticketResult.booking?.isScanned && (
                    <div className="flex flex-col md:flex-row gap-4">
                      <button
                        onClick={() => handleTicketScan(true)}
                        disabled={ticketLoading}
                        className="flex-1 h-18 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm uppercase tracking-widest rounded-[1.5rem] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-[0_20px_50px_rgba(16,185,129,0.3)] group"
                      >
                        {ticketLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                        {ticketLoading ? 'Processing...' : 'Authorize Entry'}
                      </button>
                      <button
                        onClick={resetTicket}
                        className="px-10 h-18 bg-white/5 hover:bg-white/10 text-muted hover:text-white font-black text-xs uppercase tracking-widest rounded-[1.5rem] transition-all cursor-pointer border border-white/5"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        ) : (
          /* ── REDEMPTION RESULT ── */
          redeemResult && (
            <div className={`rounded-[2.5rem] p-8 border transition-all animate-in fade-in zoom-in-95 duration-300 ${
              redeemConfirmed ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]' :
              redeemResult.isError ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.1)]' :
              redeemResult.alreadyUsed ? 'bg-amber-500/10 border-amber-500/30' :
              'bg-surface/40 border-white/10 shadow-2xl'
            }`}>
              {redeemResult.isError ? (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-6 h-6 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-rose-400 font-outfit uppercase mb-2">Invalid Code</h3>
                    <p className="text-rose-300/80">{redeemResult.message}</p>
                    <button onClick={resetRedeem} className="mt-4 flex items-center gap-2 text-xs font-black uppercase text-muted hover:text-white transition-all">
                      <RefreshCw className="w-3 h-3" /> Try Another
                    </button>
                  </div>
                </div>
              ) : redeemConfirmed ? (
                <div className="text-center py-6">
                  <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                  </div>
                  <h3 className="text-3xl font-black text-emerald-400 font-outfit uppercase mb-2">Item Delivered</h3>
                  <p className="text-emerald-300/70">Redemption confirmed. Item has been handed to customer.</p>
                  <button onClick={resetRedeem} className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl inline-flex items-center gap-2 text-xs font-black uppercase text-white transition-all mx-auto border border-white/5">
                    <RefreshCw className="w-3 h-3" /> Scan Next
                  </button>
                </div>
              ) : (
                <>
                  {redeemResult.alreadyUsed && (
                    <div className="flex items-center gap-3 mb-6 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <span className="text-amber-300 font-bold text-sm">{redeemResult.message}</span>
                    </div>
                  )}

                  {!redeemResult.alreadyUsed && (
                    <div className="flex items-center gap-3 mb-8">
                      <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                      <h3 className="text-2xl font-black text-white font-outfit uppercase">Code Valid — Confirm Delivery?</h3>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="flex gap-6">
                      {redeemResult.redemption.item?.image && (
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 shadow-2xl">
                          <img src={redeemResult.redemption.item.image} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-black uppercase text-muted tracking-widest mb-1">Artifact</p>
                        <h4 className="text-xl font-bold text-white">{redeemResult.redemption.item?.name}</h4>
                        <p className="text-sm text-muted mt-2 line-clamp-2 italic">{redeemResult.redemption.item?.description}</p>
                        <span className="inline-block mt-3 text-[10px] font-black px-3 py-1 bg-secondary/10 text-secondary rounded-lg border border-secondary/20 uppercase tracking-widest">
                          {redeemResult.redemption.item?.category}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-xs font-black uppercase text-muted tracking-widest">Unique Code</span>
                        <span className="font-mono text-secondary font-bold tracking-wider">{redeemResult.redemption.uniqueCode}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-xs font-black uppercase text-muted tracking-widest">Customer</span>
                        <span className="text-white font-bold">{redeemResult.redemption.user?.name}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-xs font-black uppercase text-muted tracking-widest">Points Spent</span>
                        <span className="text-white font-bold">{redeemResult.redemption.pointsSpent} pts</span>
                      </div>
                    </div>
                  </div>

                  {!redeemResult.alreadyUsed && (
                    <div className="flex flex-col md:flex-row gap-4">
                      <button
                        onClick={() => handleRedeemScan(true)}
                        disabled={redeemLoading}
                        className="flex-1 h-18 bg-secondary hover:bg-secondary/80 text-white font-black text-sm uppercase tracking-widest rounded-[1.5rem] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-[0_20px_50px_rgba(139,92,246,0.3)] group"
                      >
                        {redeemLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Gift className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                        {redeemLoading ? 'Processing...' : 'Confirm & Deliver'}
                      </button>
                      <button
                        onClick={resetRedeem}
                        className="px-10 h-18 bg-white/5 hover:bg-white/10 text-muted hover:text-white font-black text-xs uppercase tracking-widest rounded-[1.5rem] transition-all cursor-pointer border border-white/5"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: 100%; }
        }
        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }
        #qr-reader {
          border: none !important;
        }
        #qr-reader__scan_region video {
          object-fit: cover !important;
          border-radius: 1.5rem;
        }
        #qr-reader img {
          display: none !important;
        }
      `}} />
    </div>
  );
};

export default AdminScanner;

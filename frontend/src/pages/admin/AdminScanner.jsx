import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Ticket,
  Gift,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Clock,
  MapPin,
  Loader2,
  RefreshCw,
  Camera,
  CameraOff,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { fetchApi } from '../../services/api';
import Button from '../../components/common/Button';

const AdminScanner = () => {
  const location = useLocation();
  const theaterContext = location.state;

  const [activeTab, setActiveTab] = useState('ticket');
  const [scanMode, setScanMode] = useState('manual');

  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const scannerId = 'qr-reader';

  const [ticketInput, setTicketInput] = useState('');
  const [ticketResult, setTicketResult] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketConfirmed, setTicketConfirmed] = useState(false);

  const [redeemInput, setRedeemInput] = useState('');
  const [redeemResult, setRedeemResult] = useState(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemConfirmed, setRedeemConfirmed] = useState(false);

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [activeTab]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
    setScanMode('manual');
  };

  const handleTicketScan = async (confirm = false, overrideInput) => {
    const input = (overrideInput || ticketInput).trim();
    if (!input) return;

    if (!confirm) setTicketConfirmed(false);
    setTicketLoading(true);
    try {
      const data = await fetchApi('/scan/ticket', {
        method: 'POST',
        body: JSON.stringify({ bookingId: input, confirm }),
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

    if (!confirm) setRedeemConfirmed(false);
    setRedeemLoading(true);
    try {
      const data = await fetchApi('/scan/redemption', {
        method: 'POST',
        body: JSON.stringify({ code: input, confirm }),
      });
      setRedeemResult({ ...data, isError: false });
      if (confirm && data.confirmed) setRedeemConfirmed(true);
    } catch (err) {
      setRedeemResult({ isError: true, message: err.message || 'Validation failed.' });
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleDecodedText = (text) => {
    let finalCode = text;
    let detectedTab = activeTab;

    if (text.startsWith('{')) {
      try {
        const json = JSON.parse(text);
        finalCode = json.bookingId || json.uid || json.id || text;
        detectedTab = 'ticket';
      } catch {
        // Not JSON
      }
    }

    if (finalCode.startsWith('RDM-')) {
      detectedTab = 'redemption';
    } else if (finalCode.startsWith('BK-')) {
      detectedTab = 'ticket';
    }

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

  const startScanner = async () => {
    if (
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setCameraError(
        'Camera scanning requires HTTPS. Switch to Manual Entry or open on localhost/HTTPS.'
      );
      setScanMode('camera');
      return;
    }

    setIsCameraStarting(true);
    setCameraError(null);
    setScanMode('camera');

    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (decodedText) => handleDecodedText(decodedText),
          () => {}
        );
      } else {
        setCameraError('No cameras detected on this device.');
      }
    } catch (err) {
      console.error('Camera error details:', err);
      if (err.toString().includes('NotAllowedError') || err.toString().includes('Permission denied')) {
        setCameraError('Camera permission denied. Allow camera access in your browser settings.');
      } else {
        setCameraError('Unable to initialize camera. Make sure no other tab is using it.');
      }
    } finally {
      setIsCameraStarting(false);
    }
  };

  const resetTicket = () => {
    setTicketInput('');
    setTicketResult(null);
    setTicketConfirmed(false);
  };

  const resetRedeem = () => {
    setRedeemInput('');
    setRedeemResult(null);
    setRedeemConfirmed(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span
            className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold"
            style={{ backgroundColor: 'var(--mg-accent-soft)', color: 'var(--mg-accent)' }}
          >
            Entry Check-In
          </span>
          {theaterContext?.theaterName && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold"
              style={{ backgroundColor: 'var(--mg-success-soft)', color: 'var(--mg-success)' }}
            >
              <MapPin className="w-3 h-3" />
              {theaterContext.theaterName}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
          Ticket &amp; Reward Scanner
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
          {theaterContext?.theaterName
            ? `Verify digital tickets and reward vouchers at ${theaterContext.theaterName}.`
            : 'Scan QR codes or enter booking and reward voucher codes manually.'}
        </p>
      </div>

      {/* Mode Tabs */}
      <div
        className="inline-flex p-1 rounded-xl border gap-1"
        style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('ticket')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          style={{
            backgroundColor: activeTab === 'ticket' ? 'var(--mg-accent)' : 'transparent',
            color: activeTab === 'ticket' ? '#ffffff' : 'var(--mg-ink-2)',
          }}
        >
          <Ticket className="w-3.5 h-3.5" />
          Movie Tickets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('redemption')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          style={{
            backgroundColor: activeTab === 'redemption' ? 'var(--mg-accent)' : 'transparent',
            color: activeTab === 'redemption' ? '#ffffff' : 'var(--mg-ink-2)',
          }}
        >
          <Gift className="w-3.5 h-3.5" />
          Loyalty Rewards
        </button>
      </div>

      {/* Scanner / Manual Card */}
      <div
        className="rounded-xl border p-5 sm:p-6 space-y-6"
        style={{ backgroundColor: 'var(--mg-surface)', borderColor: 'var(--mg-border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--mg-accent-soft)', color: 'var(--mg-accent)' }}
            >
              {activeTab === 'ticket' ? <Ticket className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                {activeTab === 'ticket' ? 'Verify Booking Pass' : 'Verify Reward Voucher'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>
                {scanMode === 'manual'
                  ? `Enter ${activeTab === 'ticket' ? 'Booking ID' : 'Voucher Code'} or switch to camera`
                  : 'Hold QR code steady inside the viewfinder'}
                {activeTab === 'ticket' ? ' • Window: 15m before start to 2.5 hrs after start' : ''}
              </p>
            </div>
          </div>

          <div
            className="inline-flex p-1 rounded-lg border gap-1"
            style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}
          >
            <button
              type="button"
              onClick={stopScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: scanMode === 'manual' ? 'var(--mg-surface)' : 'transparent',
                color: scanMode === 'manual' ? 'var(--mg-ink)' : 'var(--mg-ink-3)',
              }}
            >
              <Search className="w-3.5 h-3.5" />
              Manual
            </button>
            <button
              type="button"
              onClick={startScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: scanMode === 'camera' ? 'var(--mg-surface)' : 'transparent',
                color: scanMode === 'camera' ? 'var(--mg-ink)' : 'var(--mg-ink-3)',
              }}
            >
              <Camera className="w-3.5 h-3.5" />
              Camera
            </button>
          </div>
        </div>

        {scanMode === 'manual' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (activeTab === 'ticket') handleTicketScan(false);
              else handleRedeemScan(false);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              placeholder={
                activeTab === 'ticket'
                  ? 'Enter Booking ID (e.g. BK-491203)'
                  : 'Enter Voucher Code (e.g. RDM-ABC123)'
              }
              value={activeTab === 'ticket' ? ticketInput : redeemInput}
              onChange={(e) =>
                activeTab === 'ticket'
                  ? setTicketInput(e.target.value.toUpperCase())
                  : setRedeemInput(e.target.value.toUpperCase())
              }
              className="mg-input flex-1 px-4 py-2.5 rounded-lg text-sm font-mono uppercase"
            />
            <Button
              type="submit"
              isLoading={activeTab === 'ticket' ? ticketLoading : redeemLoading}
            >
              Verify Code
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <div
              className="relative mx-auto max-w-sm rounded-xl overflow-hidden border bg-black aspect-square"
              style={{ borderColor: 'var(--mg-border-strong)' }}
            >
              <div id={scannerId} className="w-full h-full" />
              {isCameraStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: 'var(--mg-accent)' }} />
                  <p className="text-xs font-semibold">Starting camera...</p>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center text-white">
                  <CameraOff className="w-9 h-9 mb-3" style={{ color: 'var(--mg-danger)' }} />
                  <p className="text-xs mb-4">{cameraError}</p>
                  <Button size="sm" onClick={startScanner}>Retry Camera</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ticket Verification Result */}
      {activeTab === 'ticket' && ticketResult && (
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: ticketConfirmed
              ? 'var(--mg-success)'
              : ticketResult.isError
                ? 'var(--mg-danger)'
                : ticketResult.alreadyScanned
                  ? 'var(--mg-warning)'
                  : 'var(--mg-border-strong)',
          }}
        >
          {ticketResult.isError ? (
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 shrink-0" style={{ color: 'var(--mg-danger)' }} />
              <div>
                <h3 className="font-display font-bold text-lg" style={{ color: 'var(--mg-danger)' }}>
                  Invalid Ticket
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--mg-ink-2)' }}>{ticketResult.message}</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={resetTicket}>
                  <RefreshCw className="w-3.5 h-3.5" /> Try Another
                </Button>
              </div>
            </div>
          ) : ticketConfirmed ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle className="w-12 h-12 mx-auto" style={{ color: 'var(--mg-success)' }} />
              <h3 className="font-display font-bold text-2xl" style={{ color: 'var(--mg-success)' }}>
                Entry Approved
              </h3>
              <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
                Guest checked in and ticket marked as scanned.
              </p>
              <Button variant="outline" onClick={resetTicket}>
                <RefreshCw className="w-4 h-4" /> Scan Next Ticket
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {ticketResult.alreadyScanned ? (
                <div
                  className="flex items-center gap-2.5 p-3.5 rounded-lg border text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--mg-warning-soft)',
                    borderColor: 'var(--mg-warning)',
                    color: 'var(--mg-warning)',
                  }}
                >
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{ticketResult.message}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 font-display font-bold text-lg" style={{ color: 'var(--mg-success)' }}>
                  <CheckCircle className="w-5 h-5" />
                  Valid Ticket — Ready to Admit
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="flex gap-4">
                  <img
                    src={ticketResult.booking.showtime?.movie?.poster}
                    alt=""
                    className="w-20 aspect-[2/3] object-cover rounded-lg border shrink-0"
                    style={{ borderColor: 'var(--mg-border)' }}
                  />
                  <div>
                    <h4 className="font-display font-bold text-lg" style={{ color: 'var(--mg-ink)' }}>
                      {ticketResult.booking.showtime?.movie?.title}
                    </h4>
                    <p className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                      <Clock className="w-3.5 h-3.5" />
                      {ticketResult.booking.showtime?.date} • {ticketResult.booking.showtime?.time}
                    </p>
                    <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                      <MapPin className="w-3.5 h-3.5" />
                      {ticketResult.booking.showtime?.theater?.name}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}>
                    <span style={{ color: 'var(--mg-ink-3)' }}>Booking ID</span>
                    <span className="font-mono font-bold" style={{ color: 'var(--mg-ink)' }}>{ticketResult.booking.bookingIdString}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}>
                    <span style={{ color: 'var(--mg-ink-3)' }}>Customer</span>
                    <span className="font-semibold" style={{ color: 'var(--mg-ink)' }}>{ticketResult.booking.user?.name}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}>
                    <span style={{ color: 'var(--mg-ink-3)' }}>Seats</span>
                    <span className="font-mono font-bold" style={{ color: 'var(--mg-success)' }}>
                      {ticketResult.booking.seats?.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              {!ticketResult.booking?.isScanned && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    size="lg"
                    isLoading={ticketLoading}
                    onClick={() => handleTicketScan(true)}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm Check-In
                  </Button>
                  <Button size="lg" variant="outline" onClick={resetTicket}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Redemption Verification Result */}
      {activeTab === 'redemption' && redeemResult && (
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: redeemConfirmed
              ? 'var(--mg-success)'
              : redeemResult.isError
                ? 'var(--mg-danger)'
                : redeemResult.alreadyUsed
                  ? 'var(--mg-warning)'
                  : 'var(--mg-border-strong)',
          }}
        >
          {redeemResult.isError ? (
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 shrink-0" style={{ color: 'var(--mg-danger)' }} />
              <div>
                <h3 className="font-display font-bold text-lg" style={{ color: 'var(--mg-danger)' }}>
                  Invalid Voucher Code
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--mg-ink-2)' }}>{redeemResult.message}</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={resetRedeem}>
                  <RefreshCw className="w-3.5 h-3.5" /> Try Another
                </Button>
              </div>
            </div>
          ) : redeemConfirmed ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle className="w-12 h-12 mx-auto" style={{ color: 'var(--mg-success)' }} />
              <h3 className="font-display font-bold text-2xl" style={{ color: 'var(--mg-success)' }}>
                Reward Redeemed
              </h3>
              <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
                Voucher marked as fulfilled at concession stand.
              </p>
              <Button variant="outline" onClick={resetRedeem}>
                <RefreshCw className="w-4 h-4" /> Scan Next Voucher
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {redeemResult.alreadyUsed ? (
                <div
                  className="flex items-center gap-2.5 p-3.5 rounded-lg border text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--mg-warning-soft)',
                    borderColor: 'var(--mg-warning)',
                    color: 'var(--mg-warning)',
                  }}
                >
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{redeemResult.message}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 font-display font-bold text-lg" style={{ color: 'var(--mg-success)' }}>
                  <CheckCircle className="w-5 h-5" />
                  Valid Reward — Ready for Fulfillment
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="flex gap-4">
                  {redeemResult.redemption.item?.image && (
                    <img
                      src={redeemResult.redemption.item.image}
                      alt=""
                      className="w-20 h-20 object-cover rounded-lg border shrink-0"
                      style={{ borderColor: 'var(--mg-border)' }}
                    />
                  )}
                  <div>
                    <h4 className="font-display font-bold text-lg" style={{ color: 'var(--mg-ink)' }}>
                      {redeemResult.redemption.item?.name}
                    </h4>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--mg-ink-2)' }}>
                      {redeemResult.redemption.item?.description}
                    </p>
                    <span
                      className="inline-block mt-2 px-2 py-0.5 rounded text-[11px] font-semibold"
                      style={{ backgroundColor: 'var(--mg-surface-2)', color: 'var(--mg-ink-2)' }}
                    >
                      {redeemResult.redemption.item?.category}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}>
                    <span style={{ color: 'var(--mg-ink-3)' }}>Voucher Code</span>
                    <span className="font-mono font-bold" style={{ color: 'var(--mg-gold)' }}>
                      {redeemResult.redemption.uniqueCode}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}>
                    <span style={{ color: 'var(--mg-ink-3)' }}>Customer</span>
                    <span className="font-semibold" style={{ color: 'var(--mg-ink)' }}>{redeemResult.redemption.user?.name}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg border" style={{ backgroundColor: 'var(--mg-surface-2)', borderColor: 'var(--mg-border)' }}>
                    <span style={{ color: 'var(--mg-ink-3)' }}>Points Spent</span>
                    <span className="font-mono font-bold" style={{ color: 'var(--mg-ink)' }}>
                      {redeemResult.redemption.pointsSpent} Pts
                    </span>
                  </div>
                </div>
              </div>

              {!redeemResult.alreadyUsed && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    size="lg"
                    isLoading={redeemLoading}
                    onClick={() => handleRedeemScan(true)}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm Handover
                  </Button>
                  <Button size="lg" variant="outline" onClick={resetRedeem}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminScanner;

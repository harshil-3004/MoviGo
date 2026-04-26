const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const generateBookingPDF = async (booking) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [600, 450], // Ticket-sized page
        margin: 0,
        info: {
          Title: `MoviGo Ticket - ${booking.bookingIdString}`,
          Author: 'MoviGo Systems'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // --- COLORS ---
      const primaryColor = '#F43F5E';
      const bgColor = '#0b0c10';
      const surfaceColor = '#1a1d24';
      const headerColor = '#252525';
      const mutedColor = '#9CA3AF';

      // 1. MAIN BACKGROUND (Rounded rectangle simulation)
      doc.rect(0, 0, 600, 450).fill(bgColor);
      
      // 2. HEADER SECTION
      doc.rect(20, 20, 560, 80).fill(headerColor);
      
      doc.fillColor(mutedColor)
         .font('Helvetica-Bold')
         .fontSize(8)
         .text('UNIQUE TICKET ID', 40, 40);
      
      doc.fillColor('#ffffff')
         .fontSize(16)
         .text(booking.bookingIdString || 'N/A', 40, 55);

      // Status Badge
      doc.rect(480, 40, 80, 25).fill('#064e3b');
      doc.fillColor('#10b981')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('CONFIRMED', 480, 48, { align: 'center', width: 80 });

      // 3. MIDDLE CONTENT SECTION
      doc.rect(20, 100, 560, 250).fill(surfaceColor);

      // Movie Title
      doc.fillColor(mutedColor)
         .fontSize(8)
         .text('MOVIE', 45, 130);
      
      doc.fillColor('#ffffff')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(booking.showtime?.movie?.title || 'Unknown Presentation', 45, 145, { width: 300 });

      // Details Grid
      const gridY = 240;
      
      // Date & Time
      doc.fillColor(mutedColor).fontSize(8).text('DATE', 45, gridY);
      doc.fillColor('#ffffff').fontSize(11).text(booking.showtime?.date || 'N/A', 45, gridY + 12);

      doc.fillColor(mutedColor).fontSize(8).text('TIME', 180, gridY);
      doc.fillColor('#ffffff').fontSize(11).text(booking.showtime?.time || 'N/A', 180, gridY + 12);

      // Theater & Seats
      const gridY2 = 300;
      doc.fillColor(mutedColor).fontSize(8).text('THEATER', 45, gridY2);
      doc.fillColor('#ffffff').fontSize(11).text(booking.showtime?.theater?.name || 'Main Cinema', 45, gridY2 + 12);

      doc.fillColor(mutedColor).fontSize(8).text('SEATS', 180, gridY2);
      doc.fillColor('#ffffff').fontSize(11).text(booking.seats?.join(', ') || 'N/A', 180, gridY2 + 12);

      // Ticket "Cutouts" / Perforation line
      doc.circle(20, 225, 15).fill(bgColor);
      doc.circle(580, 225, 15).fill(bgColor);
      doc.moveTo(330, 120).lineTo(330, 330).dash(5, { space: 5 }).stroke('#333333').undash();

      // QR CODE AREA
      const qrData = JSON.stringify({
        id: booking._id,
        uid: booking.bookingIdString,
        seats: booking.seats
      });

      const qrBuffer = await QRCode.toBuffer(qrData, {
        color: { dark: '#000000', light: '#ffffff' },
        width: 140,
        margin: 1
      });

      // QR Code with white rounded-like background
      doc.rect(385, 135, 150, 150).fill('#ffffff');
      doc.image(qrBuffer, 390, 140, { width: 140 });
      
      doc.fillColor(mutedColor)
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('SCAN AT SECTOR GATE', 385, 295, { align: 'center', width: 150 });

      // 4. FOOTER SECTION
      doc.rect(20, 350, 560, 80).fill(headerColor);
      
      doc.fillColor(primaryColor)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(`FINAL PRICE PAID: Rs. ${booking.totalAmount?.toFixed(2)}`, 40, 375);

      doc.fillColor(mutedColor)
         .fontSize(8)
         .font('Helvetica-Oblique')
         .text('Please arrive 15 minutes before showtime.', 350, 375, { align: 'right', width: 210 });

      // Booking Timestamp
      const bookedAt = new Date(booking.createdAt).toLocaleString('en-IN', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      });
      doc.fillColor(mutedColor)
         .fontSize(7)
         .font('Helvetica')
         .text(`Booked: ${bookedAt}`, 40, 405);

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateBookingPDF };

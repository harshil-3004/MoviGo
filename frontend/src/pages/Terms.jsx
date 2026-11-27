import React, { useEffect } from 'react';
import { Shield, Scale, ScrollText, AlertCircle } from 'lucide-react';

const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 pb-24">
      <div className="flex items-start gap-4 mb-8">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center border shrink-0"
          style={{
            backgroundColor: 'var(--mg-accent-soft)',
            borderColor: 'var(--mg-border)',
            color: 'var(--mg-accent)',
          }}
        >
          <ScrollText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
            Terms of Service
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--mg-ink-3)' }}>
            Last Updated: April 2026
          </p>
        </div>
      </div>

      <div
        className="rounded-xl border p-6 sm:p-10 space-y-8"
        style={{
          backgroundColor: 'var(--mg-surface)',
          borderColor: 'var(--mg-border)',
        }}
      >
        <section className="space-y-2.5">
          <h2 className="text-lg font-display font-bold flex items-center gap-2.5" style={{ color: 'var(--mg-ink)' }}>
            <Shield className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-accent)' }} />
            1. Acceptance of Terms
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
            By accessing or using the MoviGo platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please refrain from using our services. MoviGo provides online movie ticketing, cinema discovery, and loyalty reward management.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-lg font-display font-bold flex items-center gap-2.5" style={{ color: 'var(--mg-ink)' }}>
            <Scale className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-accent)' }} />
            2. Booking &amp; Cancellation
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
            Tickets booked through MoviGo are generally non-refundable unless a cinema partner explicitly supports cancellations. Once a digital ticket is confirmed, it represents a reserved seat allocation that cannot be modified within 4 hours of the scheduled showtime.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-lg font-display font-bold flex items-center gap-2.5" style={{ color: 'var(--mg-ink)' }}>
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-accent)' }} />
            3. Acceptable Use
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
            Users must not deploy automated scripts to hold or bulk-book seats, or attempt to manipulate loyalty point redemptions or promo code limits. Misuse or tampering with digital ticket QR passes may result in immediate account termination.
          </p>
        </section>

        <section className="pt-6 border-t space-y-1.5" style={{ borderColor: 'var(--mg-border)' }}>
          <h3 className="text-sm font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
            Legal Inquiries
          </h3>
          <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
            For questions regarding these terms, write to{' '}
            <a href="mailto:movigo00@gmail.com" className="font-semibold hover:underline" style={{ color: 'var(--mg-accent)' }}>
              movigo00@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;

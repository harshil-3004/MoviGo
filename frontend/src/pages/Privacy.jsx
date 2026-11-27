import React, { useEffect } from 'react';
import { Lock, Eye, Database, UserX } from 'lucide-react';

const Privacy = () => {
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
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
            Privacy Policy
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--mg-ink-3)' }}>
            MoviGo Data Protection Notice
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
            <Database className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-accent)' }} />
            1. Data Collection
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
            We collect only the information needed to operate your cinema ticketing experience, including your name, email address, and mobile number for account verification and ticket delivery. Uploaded profile photos are stored securely and are never sold to third-party advertisers.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-lg font-display font-bold flex items-center gap-2.5" style={{ color: 'var(--mg-ink)' }}>
            <Eye className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-accent)' }} />
            2. How We Use Information
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
            Your information is used strictly to:
          </p>
          <ul className="list-disc list-inside text-sm space-y-1.5 ml-2" style={{ color: 'var(--mg-ink-2)' }}>
            <li>Issue unique QR-coded digital cinema passes and downloadable PDF tickets.</li>
            <li>Process booking reservations and seat holds safely.</li>
            <li>Track Inner Circle membership perks and loyalty point redemptions.</li>
            <li>Deliver essential booking confirmations and account security emails.</li>
          </ul>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-lg font-display font-bold flex items-center gap-2.5" style={{ color: 'var(--mg-ink)' }}>
            <UserX className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-accent)' }} />
            3. Right to Account Deletion
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
            You control your account data. At any time, open{' '}
            <strong style={{ color: 'var(--mg-ink)' }}>Account Settings</strong> inside your profile to permanently delete your account and associated personal data from our servers.
          </p>
        </section>

        <section className="pt-6 border-t space-y-1.5" style={{ borderColor: 'var(--mg-border)' }}>
          <h3 className="text-sm font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
            Privacy Contact
          </h3>
          <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
            For data access or deletion requests, email{' '}
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

export default Privacy;

import React, { useState, useRef, useEffect } from 'react';
import { Mail, MapPin, Send, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Button from '../components/common/Button';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSending(true);
    timerRef.current = setTimeout(() => {
      setIsSending(false);
      setSent(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 900);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 pb-24">
      <div className="max-w-2xl mb-12">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: 'var(--mg-accent)' }}
        >
          Customer Support
        </p>
        <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight mb-3" style={{ color: 'var(--mg-ink)' }}>
          Get in Touch
        </h1>
        <p className="text-base leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
          Have questions about a booking, refund, cinema partnership, or Inner Circle membership? Send our team a message.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Info Cards */}
        <div className="lg:col-span-4 space-y-4">
          <div
            className="rounded-xl border p-6"
            style={{
              backgroundColor: 'var(--mg-surface)',
              borderColor: 'var(--mg-border)',
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--mg-accent-soft)', color: 'var(--mg-accent)' }}
            >
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="text-base font-display font-bold mb-1" style={{ color: 'var(--mg-ink)' }}>
              Email Support
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--mg-ink-2)' }}>
              For ticket assistance and general inquiries.
            </p>
            <a
              href="mailto:movigo00@gmail.com"
              className="text-sm font-semibold hover:underline"
              style={{ color: 'var(--mg-accent)' }}
            >
              movigo00@gmail.com
            </a>
          </div>

          <div
            className="rounded-xl border p-6"
            style={{
              backgroundColor: 'var(--mg-surface)',
              borderColor: 'var(--mg-border)',
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--mg-surface-2)', color: 'var(--mg-ink)' }}
            >
              <MapPin className="w-5 h-5" />
            </div>
            <h2 className="text-base font-display font-bold mb-1" style={{ color: 'var(--mg-ink)' }}>
              Headquarters
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
              MoviGo Cinema Tower<br />
              Innovation District<br />
              Mumbai, MH 400001
            </p>
          </div>

          <div
            className="rounded-xl border p-6"
            style={{
              backgroundColor: 'var(--mg-surface)',
              borderColor: 'var(--mg-border)',
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--mg-success-soft)', color: 'var(--mg-success)' }}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-base font-display font-bold mb-1" style={{ color: 'var(--mg-ink)' }}>
              Partner Inquiries
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
              Cinema operators interested in onboarding their multiplex can reach our team directly by email.
            </p>
          </div>
        </div>

        {/* Form */}
        <div
          className="lg:col-span-8 rounded-xl border p-6 sm:p-8"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border)',
          }}
        >
          {sent ? (
            <div className="py-12 text-center max-w-md mx-auto">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border"
                style={{
                  backgroundColor: 'var(--mg-success-soft)',
                  borderColor: 'var(--mg-success)',
                  color: 'var(--mg-success)',
                }}
              >
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-2" style={{ color: 'var(--mg-ink)' }}>
                Message Received
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mg-ink-2)' }}>
                Thanks for reaching out. Our support team will reply to your email shortly.
              </p>
              <Button onClick={() => setSent(false)}>Send Another Message</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                    Full Name
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Aarav Mehta"
                    className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                    Email Address
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="you@example.com"
                    className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                  Subject
                </label>
                <input
                  required
                  type="text"
                  placeholder="Booking reference or inquiry topic"
                  className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--mg-ink-2)' }}>
                  Message
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Share details so we can help quickly..."
                  className="mg-input w-full px-3.5 py-2.5 rounded-lg text-sm resize-y"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="lg" isLoading={isSending}>
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;

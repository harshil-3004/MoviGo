import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer
      className="border-t mt-auto"
      style={{
        backgroundColor: 'var(--mg-surface)',
        borderColor: 'var(--mg-border)',
        color: 'var(--mg-ink-2)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b" style={{ borderColor: 'var(--mg-border)' }}>
          <div className="md:col-span-2 space-y-3">
            <Link to="/" className="inline-block">
              <img src="/Logo.png" alt="MoviGo" className="h-7 object-contain" />
            </Link>
            <p className="text-sm max-w-sm leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
              Reserve seats across premier IMAX, Dolby Atmos, and local neighborhood theaters with instant QR passes and loyalty rewards.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--mg-ink)' }}>
              Explore
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/movies" className="hover:underline" style={{ color: 'var(--mg-ink-2)' }}>
                  Now Showing &amp; Upcoming
                </Link>
              </li>
              <li>
                <Link to="/cinemas" className="hover:underline" style={{ color: 'var(--mg-ink-2)' }}>
                  Partner Cinemas
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:underline" style={{ color: 'var(--mg-ink-2)' }}>
                  Inner Circle &amp; Rewards
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--mg-ink)' }}>
              Support &amp; Legal
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/contact" className="hover:underline" style={{ color: 'var(--mg-ink-2)' }}>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:underline" style={{ color: 'var(--mg-ink-2)' }}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:underline" style={{ color: 'var(--mg-ink-2)' }}>
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'var(--mg-ink-3)' }}>
          <p>© {new Date().getFullYear()} MoviGo Cinemas. All rights reserved.</p>
          <p>Instant QR Entry • Verified Digital Passes</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

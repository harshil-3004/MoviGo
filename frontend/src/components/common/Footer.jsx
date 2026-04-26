import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-base/50 backdrop-blur-md border-t border-surface py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted">
        <p className="font-outfit text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2 w-max mx-auto">MoviGo</p>
        <p className="text-sm">Experience cinema like never before.</p>
        <div className="mt-8 flex justify-center space-x-8 text-sm">
          <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
        </div>
        <p className="mt-10 text-xs opacity-40">© {new Date().getFullYear()} MoviGo. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import MovieDetails from './pages/MovieDetails';
import Theaters from './pages/Theaters';
import SeatSelection from './pages/SeatSelection';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Ticket from './pages/Ticket';
import Profile from './pages/Profile';
import Movies from './pages/Movies';
import Cinemas from './pages/Cinemas';
import CinemaShowtimes from './pages/CinemaShowtimes';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

// Admin Imports
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMovies from './pages/admin/AdminMovies';
import AdminTheaters from './pages/admin/AdminTheaters';
import AdminPromotions from './pages/admin/AdminPromotions';
import AdminBookings from './pages/admin/AdminBookings';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';
import AdminLogin from './pages/admin/AdminLogin';
import AdminScreenManagement from './pages/admin/AdminScreenManagement';
import AdminShowtimeManagement from './pages/admin/AdminShowtimeManagement';
import AdminLoyaltyStore from './pages/admin/AdminLoyaltyStore';
import AdminScanner from './pages/admin/AdminScanner';
import AdminChat from './pages/admin/AdminChat';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';

const ConsumerLayout = () => (
  <>
    <Navbar />
    <main className="flex-1 pt-16 w-full min-h-[calc(100vh-4rem)]">
      <Outlet />
    </main>
    <Footer />
  </>
);

function App() {
  useEffect(() => {
    if (localStorage.getItem('theme') === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, []);

  return (
    <Router>
      <div
        className="min-h-screen flex flex-col relative"
        style={{ backgroundColor: 'var(--mg-bg)', color: 'var(--mg-ink)' }}
      >
        <Routes>
          {/* Backoffice Public Login Gateway */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Routes - Secured by RBAC */}
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="movies" element={<AdminMovies />} />
              <Route path="theaters" element={<AdminTheaters />} />
              <Route path="promotions" element={<AdminPromotions />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="loyalty" element={<AdminLoyaltyStore />} />
              <Route path="chat" element={<AdminChat />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="screens/:theaterId" element={<AdminScreenManagement />} />
              <Route path="showtimes/:theaterId" element={<AdminShowtimeManagement />} />
              <Route path="scanner" element={<AdminScanner />} />
              <Route
                path="*"
                element={
                  <div className="p-10 w-full flex items-center justify-center">
                    <h2 className="text-xl font-semibold mg-ink-2">Section not found</h2>
                  </div>
                }
              />
            </Route>
          </Route>

          {/* Consumer Routes - Wrapped with standard Navbar/Footer */}
          <Route element={<ConsumerLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/cinemas" element={<Cinemas />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
            <Route path="/theaters/:id" element={<Theaters />} />
            <Route path="/seat-selection/:id" element={<SeatSelection />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/ticket/:id" element={<Ticket />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/cinema/:theaterId/shows" element={<CinemaShowtimes />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;

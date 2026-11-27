import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  Film,
  Ticket,
  IndianRupee,
  Loader2,
  Plus,
  Building2,
  Coins,
  ArrowRight,
  Activity,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { fetchApi } from '../../services/api';
import Button from '../../components/common/Button';

const CHART_COLORS = ['#E11D48', '#D97706', '#10B981', '#3B82F6', '#6366F1'];

const StatCard = ({ title, subtitle, value, icon, accent = 'accent' }) => {
  const IconComp = icon;
  const badgeColors = {
    accent: { bg: 'var(--mg-accent-soft)', color: 'var(--mg-accent)' },
    gold: { bg: 'var(--mg-gold-soft)', color: 'var(--mg-gold)' },
    success: { bg: 'var(--mg-success-soft)', color: 'var(--mg-success)' },
    neutral: { bg: 'var(--mg-surface-2)', color: 'var(--mg-ink)' },
  }[accent] || { bg: 'var(--mg-accent-soft)', color: 'var(--mg-accent)' };

  return (
    <div
      className="rounded-xl border p-5 flex items-start justify-between gap-4"
      style={{
        backgroundColor: 'var(--mg-surface)',
        borderColor: 'var(--mg-border)',
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--mg-ink-3)' }}>
          {title}
        </p>
        <p className="text-2xl sm:text-3xl font-display font-bold mt-1.5" style={{ color: 'var(--mg-ink)' }}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: 'var(--mg-ink-2)' }}>
            {subtitle}
          </p>
        )}
      </div>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: badgeColors.bg, color: badgeColors.color }}
      >
        <IconComp className="w-5 h-5" />
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'admin' || user?.role === 'master_admin';
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchApi('/stats');
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--mg-accent)' }} />
        <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
          Loading operations overview...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold"
              style={{ backgroundColor: 'var(--mg-accent-soft)', color: 'var(--mg-accent)' }}
            >
              {isSuperAdmin ? 'Platform Admin' : 'Venue Manager'}
            </span>
            <span className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>
              • {isSuperAdmin ? 'All Partner Cinemas' : `${user?.theaterIds?.length || 0} Assigned Cinemas`}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
            {isSuperAdmin ? 'Operations Dashboard' : 'Cinema Overview'}
          </h1>
        </div>

        {isSuperAdmin && (
          <Button onClick={() => navigate('/admin/movies')}>
            <Plus className="w-4 h-4" />
            Manage Movies
          </Button>
        )}
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ticket Revenue"
          subtitle="Confirmed sales"
          value={`₹${Number(stats?.totalRevenue || 0).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          accent="accent"
        />
        <StatCard
          title="Total Bookings"
          subtitle="Completed orders"
          value={stats?.totalBookings || 0}
          icon={Ticket}
          accent="success"
        />
        <StatCard
          title="Registered Users"
          subtitle="Customer accounts"
          value={stats?.totalUsers || 0}
          icon={Users}
          accent="neutral"
        />
        <StatCard
          title="Top Charting Titles"
          subtitle="Ranked by sales"
          value={stats?.topMovies?.length || 0}
          icon={TrendingUp}
          accent="gold"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div
          className="lg:col-span-8 rounded-xl border p-6"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                Revenue Trend
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
                Daily confirmed ticket revenue across recent cycles
              </p>
            </div>
            <Activity className="w-5 h-5" style={{ color: 'var(--mg-accent)' }} />
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.revenueByDay || []}>
                <defs>
                  <linearGradient id="mgRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E11D48" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#E11D48" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mg-border)" vertical={false} />
                <XAxis
                  dataKey="_id"
                  stroke="var(--mg-ink-3)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => String(val).split('-').slice(1).join('/')}
                />
                <YAxis stroke="var(--mg-ink-3)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--mg-surface)',
                    borderColor: 'var(--mg-border-strong)',
                    borderRadius: '10px',
                    color: 'var(--mg-ink)',
                  }}
                  itemStyle={{ color: '#E11D48', fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#E11D48"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#mgRevenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="lg:col-span-4 rounded-xl border p-6 flex flex-col"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border)',
          }}
        >
          <div>
            <h2 className="text-lg font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
              Audience Preferences
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
              Booking volume by genre
            </p>
          </div>

          <div className="flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.genreDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={86}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stats?.genreDistribution?.map((entry, index) => (
                    <Cell
                      key={`genre-${entry.name || index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--mg-surface)',
                    borderColor: 'var(--mg-border-strong)',
                    borderRadius: '10px',
                    color: 'var(--mg-ink)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t" style={{ borderColor: 'var(--mg-border)' }}>
            {stats?.genreDistribution?.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="truncate" style={{ color: 'var(--mg-ink-2)' }}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Movies & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div
          className="lg:col-span-8 rounded-xl border p-6"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
              Top Performing Titles
            </h2>
            <Film className="w-4 h-4" style={{ color: 'var(--mg-ink-3)' }} />
          </div>

          <div className="space-y-3">
            {stats?.topMovies?.length ? (
              stats.topMovies.map((movie, i) => (
                <div
                  key={movie.title}
                  onClick={() => navigate('/admin/movies')}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    backgroundColor: 'var(--mg-surface-2)',
                    borderColor: 'var(--mg-border)',
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-sm font-mono font-bold w-6 text-center shrink-0" style={{ color: 'var(--mg-ink-3)' }}>
                      0{i + 1}
                    </span>
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-10 h-14 object-cover rounded border shrink-0"
                      style={{ borderColor: 'var(--mg-border)' }}
                    />
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm truncate" style={{ color: 'var(--mg-ink)' }}>
                        {movie.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--mg-ink-2)' }}>
                        {movie.bookingCount} bookings
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-ink-3)' }} />
                </div>
              ))
            ) : (
              <p className="text-sm py-6 text-center" style={{ color: 'var(--mg-ink-3)' }}>
                No booking analytics available yet.
              </p>
            )}
          </div>
        </div>

        <div
          className="lg:col-span-4 rounded-xl border p-6"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border)',
          }}
        >
          <h2 className="text-lg font-display font-bold mb-4" style={{ color: 'var(--mg-ink)' }}>
            Quick Shortcuts
          </h2>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => navigate('/admin/movies')}
              className="w-full p-3.5 rounded-lg border flex items-center justify-between text-left transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--mg-surface-2)',
                borderColor: 'var(--mg-border)',
              }}
            >
              <div className="flex items-center gap-3">
                <Film className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--mg-ink)' }}>Movies Catalog</p>
                  <p className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>Add listings &amp; spotlight hero</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4" style={{ color: 'var(--mg-ink-3)' }} />
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/theaters')}
              className="w-full p-3.5 rounded-lg border flex items-center justify-between text-left transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--mg-surface-2)',
                borderColor: 'var(--mg-border)',
              }}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--mg-ink)' }}>Cinemas &amp; Screens</p>
                  <p className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>Configure layouts &amp; showtimes</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4" style={{ color: 'var(--mg-ink-3)' }} />
            </button>

            {isSuperAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/admin/users')}
                  className="w-full p-3.5 rounded-lg border flex items-center justify-between text-left transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--mg-surface-2)',
                    borderColor: 'var(--mg-border)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4" style={{ color: 'var(--mg-ink)' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--mg-ink)' }}>Customer Directory</p>
                      <p className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>Manage registered accounts</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" style={{ color: 'var(--mg-ink-3)' }} />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/admin/loyalty')}
                  className="w-full p-3.5 rounded-lg border flex items-center justify-between text-left transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--mg-surface-2)',
                    borderColor: 'var(--mg-border)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Coins className="w-4 h-4" style={{ color: 'var(--mg-gold)' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--mg-ink)' }}>Loyalty Rewards Store</p>
                      <p className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>Manage redeemable perks</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" style={{ color: 'var(--mg-ink-3)' }} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Users, Film, Ticket, DollarSign, Calendar, Loader2, 
  ArrowUpRight, ArrowDownRight, Activity, Plus, Settings, ShieldAlert 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { fetchApi } from '../../services/api';

const COLORS = ['#F43F5E', '#8B5CF6', '#10B981', '#F59E0B', '#3B82F6'];

const StatCard = ({ title, value, change, icon: Icon, color = "primary" }) => (
  <div className="bg-surface/50 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group hover:border-white/20 transition-all">
    <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-${color}/10 transition-colors`}></div>
    <div className="flex items-center justify-between mb-4 relative z-10">
      <div className={`p-3 bg-${color}/10 rounded-xl border border-${color}/20`}>
        <Icon className={`w-6 h-6 text-${color}`} />
      </div>
      {change && (
        <span className={`flex items-center text-xs font-bold ${change > 0 ? 'text-green-400' : 'text-rose-400'}`}>
          {change > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {Math.abs(change)}%
        </span>
      )}
    </div>
    <div className="relative z-10">
      <h3 className="text-muted text-[10px] font-black uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-3xl font-black font-outfit text-white">{value}</p>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'admin';
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchApi('/stats');
        setStats(data);
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-base">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted font-outfit uppercase tracking-widest text-xs font-black">Decrypting Intel...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 w-full animate-in fade-in duration-700 bg-base min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-3">
             <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
               {isSuperAdmin ? 'Platform Authority' : 'Regional Oversight'}
             </span>
             <span className="text-muted text-[10px] font-bold uppercase tracking-widest">• Sector: {isSuperAdmin ? 'Global' : `${user?.theaterIds?.length || 0} Managed Nodes`}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-outfit text-white tracking-tighter">
            {isSuperAdmin ? 'Global Nerve Center' : 'Theater Control Room'}
          </h1>
        </div>
        <div className="flex gap-4">
           <button onClick={() => navigate('/admin/movies')} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Feature
           </button>
           <div className="w-12 h-12 rounded-xl bg-primary border border-primary/30 flex items-center justify-center text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <ShieldAlert className="w-6 h-6" />
           </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard 
          title="Global Revenue" 
          value={`₹${stats?.totalRevenue?.toLocaleString() || 0}`} 
          icon={DollarSign} 
          change={12.5}
        />
        <StatCard 
          title="Active Admissions" 
          value={stats?.totalBookings || 0} 
          icon={Ticket} 
          change={8.2}
          color="secondary"
        />
        <StatCard 
          title="Citizen Registry" 
          value={stats?.totalUsers || 0} 
          icon={Users} 
          change={5.1}
          color="primary"
        />
        <StatCard 
          title="Cinematic Assets" 
          value={stats?.topMovies?.length || 0} 
          icon={TrendingUp} 
          color="secondary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
        {/* Revenue Analysis Chart */}
        <div className="lg:col-span-2 bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-black font-outfit text-white tracking-tighter uppercase">Revenue Trajectory</h2>
              <p className="text-xs text-muted uppercase tracking-widest font-bold mt-1">Financial Performance • Last 7 Cycles</p>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl">
              <Activity className="w-5 h-5 text-primary" />
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.revenueByDay || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="_id" 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B0C10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#F43F5E', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#F43F5E" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Genre Distribution */}
        <div className="bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-xl flex flex-col">
          <h2 className="text-2xl font-black font-outfit text-white tracking-tighter uppercase mb-2">Sector Demand</h2>
          <p className="text-[10px] text-muted uppercase tracking-widest font-black mb-10">Genre Distribution Analysis</p>
          
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.genreDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {stats?.genreDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B0C10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
             {stats?.genreDistribution?.map((item, i) => (
               <div key={item.name} className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                 <span className="text-[10px] text-white/70 font-bold uppercase tracking-tighter">{item.name}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Top Performers */}
        <div className="lg:col-span-2 bg-surface/30 border border-white/5 rounded-[2.5rem] p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black font-outfit text-white tracking-tighter uppercase">High Command Assets</h2>
            <Film className="w-5 h-5 text-secondary" />
          </div>
          <div className="space-y-4">
            {stats?.topMovies?.map((movie, i) => (
              <div key={movie.title} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-5">
                  <span className="text-2xl font-black text-white/20 group-hover:text-primary/40 transition-colors">0{i+1}</span>
                  <img src={movie.poster} alt="" className="w-12 h-16 object-cover rounded-xl shadow-2xl border border-white/10" />
                  <div>
                    <h4 className="font-black text-white uppercase tracking-tighter text-lg">{movie.title}</h4>
                    <p className="text-[10px] text-muted font-black uppercase tracking-widest">Incursion Velocity: {movie.bookingCount} Units</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:bg-primary group-hover:text-white transition-all cursor-pointer">
                    <Plus className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Management */}
        <div className="bg-surface/30 border border-white/5 rounded-[2.5rem] p-8">
          <h2 className="text-2xl font-black font-outfit text-white tracking-tighter uppercase mb-10">Neural Links</h2>
          <div className="space-y-4">
            <button 
              onClick={() => navigate('/admin/movies')}
              className="w-full group p-6 bg-primary/5 border border-primary/20 rounded-2xl text-left hover:bg-primary/10 transition-all relative overflow-hidden"
            >
              <div className="relative z-10">
                <h4 className="text-primary font-black uppercase tracking-widest text-xs mb-1">Catalog Interface</h4>
                <p className="text-white text-lg font-black tracking-tighter">Manage Media Assets</p>
              </div>
              <Plus className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-primary/20 group-hover:text-primary transition-colors" />
            </button>

            <button 
              onClick={() => navigate('/admin/theaters')}
              className="w-full group p-6 bg-secondary/5 border border-secondary/20 rounded-2xl text-left hover:bg-secondary/10 transition-all relative overflow-hidden"
            >
              <div className="relative z-10">
                <h4 className="text-secondary font-black uppercase tracking-widest text-xs mb-1">Sector Protocols</h4>
                <p className="text-white text-lg font-black tracking-tighter">Theater Command</p>
              </div>
              <Settings className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-secondary/20 group-hover:text-secondary transition-colors" />
            </button>

           {isSuperAdmin && (
             <>
              <button 
                onClick={() => navigate('/admin/users')}
                className="w-full group p-6 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-white/10 transition-all relative overflow-hidden"
              >
                <div className="relative z-10">
                  <h4 className="text-white/40 font-black uppercase tracking-widest text-xs mb-1">Citizen Database</h4>
                  <p className="text-white text-lg font-black tracking-tighter">Registry Control</p>
                </div>
                <Users className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-white/10 group-hover:text-white transition-colors" />
              </button>

              <button 
                onClick={() => navigate('/admin/loyalty')}
                className="w-full group p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl text-left hover:bg-yellow-500/10 transition-all relative overflow-hidden"
              >
                <div className="relative z-10">
                  <h4 className="text-yellow-500 font-black uppercase tracking-widest text-xs mb-1">Artifact Vault</h4>
                  <p className="text-white text-lg font-black tracking-tighter">Loyalty Management</p>
                </div>
                <TrendingUp className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-yellow-500/20 group-hover:text-yellow-500 transition-colors" />
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

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Shield, Key, Mail, Terminal } from 'lucide-react';
import Button from '../../components/common/Button';
import { login } from '../../store/authSlice';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        alert(data.message || 'Staff Authentication Failed');
        setIsLoading(false);
        return;
      }

      // Check if user has sufficient privileges
      if (data.user.role !== 'admin' && data.user.role !== 'theater_admin') {
         alert('Access Restricted: You do not have administrative privileges.');
         setIsLoading(false);
         return;
      }

      dispatch(login({
        ...data.user,
        email: email,
        token: data.token
      }));
      
      navigate('/admin');
    } catch (error) {
      console.error(error);
      alert('Internal Server Error connecting to authorization matrix.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4 selection:bg-primary/30">
      
      <div className="w-full max-w-md">
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-widest uppercase text-white/90">MoviGo Systems</h1>
          <p className="text-white/40 text-sm mt-2 font-mono">Restricted Access Portal</p>
        </div>

        <div className="bg-base border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
          
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 block">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@movigo.com"
                  required
                  className="w-full bg-base border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white font-mono focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 block">Security Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-base border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white font-mono tracking-[0.2em] focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full flex justify-center py-3">
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
              ) : (
                "Authenticate"
              )}
            </Button>
          </form>
        </div>

      </div>

    </div>
  );
};

export default AdminLogin;

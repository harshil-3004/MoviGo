import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Shield, Globe } from 'lucide-react';
import Button from '../components/common/Button';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSending(true);
    // Simulate API call
    setTimeout(() => {
      setIsSending(false);
      setSent(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 1500);
  };

  return (
    <div className="w-full min-h-screen bg-base pt-12 pb-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[150px] -z-10 rounded-full"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 blur-[120px] -z-10 rounded-full"></div>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold font-outfit text-white mb-4">Get in Touch</h1>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Have questions about your booking or feedback for us? Our team is ready to assist you 24/7.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info Cards */}
          <div className="space-y-6">
            <div className="bg-surface/30 border border-white/5 rounded-3xl p-8 backdrop-blur-3xl hover:border-primary/30 transition-all duration-500">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 border border-primary/30">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-outfit">Email Us</h3>
              <p className="text-muted text-sm mb-4">For general inquiries and support.</p>
              <a href="mailto:movigo00@gmail.com" className="text-primary font-bold hover:underline">movigo00@gmail.com</a>
            </div>

            <div className="bg-surface/30 border border-white/5 rounded-3xl p-8 backdrop-blur-3xl hover:border-secondary/30 transition-all duration-500">
              <div className="w-12 h-12 bg-secondary/20 rounded-2xl flex items-center justify-center mb-6 border border-secondary/30">
                <Globe className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-outfit">Headquarters</h3>
              <p className="text-muted text-sm">
                MoviGo Cinema Tower, <br />
                Innovation District, <br />
                Mumbai, MH 400001
              </p>
            </div>

            <div className="bg-surface/30 border border-white/5 rounded-3xl p-8 backdrop-blur-3xl hover:border-white/20 transition-all duration-500">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-outfit">Corporate Identity</h3>
              <p className="text-muted text-xs uppercase tracking-widest font-black opacity-50">Verified Business Entity</p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none"></div>
            
            {sent ? (
              <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 border-2 border-green-500">
                  <Send className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Transmission Successful</h2>
                <p className="text-muted mb-8">We've received your message. Our representative will contact you shortly via email.</p>
                <Button onClick={() => setSent(false)}>Send Another Message</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Your Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="John Wick"
                      className="w-full bg-base/50 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-primary transition-all placeholder:text-white/20"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Email Address</label>
                    <input 
                      required
                      type="email" 
                      placeholder="john@example.com"
                      className="w-full bg-base/50 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-primary transition-all placeholder:text-white/20"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Subject</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Booking Inquiry"
                    className="w-full bg-base/50 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-primary transition-all placeholder:text-white/20"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Message</label>
                  <textarea 
                    required
                    rows="5"
                    placeholder="Tell us how we can help..."
                    className="w-full bg-base/50 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-primary transition-all placeholder:text-white/20 resize-none"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  ></textarea>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-16 text-lg shadow-[0_0_30px_rgba(244,63,94,0.3)]"
                  disabled={isSending}
                >
                  {isSending ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Transmitting...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Send className="w-5 h-5" /> Dispatch Message</span>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Loader2 = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
);

export default Contact;

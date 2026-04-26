import React from 'react';
import { Lock, Eye, Database, Globe } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="w-full min-h-screen bg-base pt-12 pb-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] -z-10 rounded-full"></div>
      
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
           <div className="w-12 h-12 bg-secondary/20 rounded-2xl flex items-center justify-center border border-secondary/30">
              <Lock className="w-6 h-6 text-secondary" />
           </div>
           <div>
              <h1 className="text-4xl font-bold font-outfit text-white">Privacy Policy</h1>
              <p className="text-muted text-sm uppercase tracking-widest font-black mt-1">Data Sovereignty Protocol v1.0</p>
           </div>
        </div>

        <div className="bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-3xl space-y-12">
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-xl font-outfit">
               <Database className="w-5 h-5 text-secondary" />
               1. Data Collection
            </div>
            <p className="text-muted leading-relaxed">
              We collect minimal data necessary to facilitate your cinema experience. This includes your name, email, and mobile number for authentication and ticket delivery. Profile photos are stored securely on our encrypted cloud infrastructure and are never shared with third-party advertisers.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-xl font-outfit">
               <Eye className="w-5 h-5 text-secondary" />
               2. Information Usage
            </div>
            <p className="text-muted leading-relaxed">
              Your information is used solely for:
            </p>
            <ul className="list-disc list-inside text-muted space-y-2 ml-4">
              <li>Generating your unique QR-coded digital tickets.</li>
              <li>Processing secure transactions via our encrypted gateway.</li>
              <li>Managing your "Inner Circle" membership and rewards.</li>
              <li>Sending essential showtime alerts and security notifications.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-xl font-outfit">
               <Globe className="w-5 h-5 text-secondary" />
               3. Your Right to Erasure
            </div>
            <p className="text-muted leading-relaxed">
              We believe in true data sovereignty. At any time, you can navigate to your **Profile Settings** and initiate a **"Data Purge"**. This will instantly and permanently erase all your personal data, booking history, and identity records from our servers. This action is irreversible.
            </p>
          </section>

          <section className="space-y-4 border-t border-white/5 pt-8">
            <h4 className="text-white font-bold">Privacy Officer</h4>
            <p className="text-muted text-sm">
              For data access requests or privacy concerns, reach out to us at <span className="text-secondary font-bold">movigo00@gmail.com</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

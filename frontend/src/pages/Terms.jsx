import React from 'react';
import { Shield, Scale, ScrollText, AlertCircle } from 'lucide-react';

const Terms = () => {
  return (
    <div className="w-full min-h-screen bg-base pt-12 pb-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-secondary/5 blur-[150px] -z-10 rounded-full"></div>
      
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30">
              <ScrollText className="w-6 h-6 text-primary" />
           </div>
           <div>
              <h1 className="text-4xl font-bold font-outfit text-white">Terms of Service</h1>
              <p className="text-muted text-sm uppercase tracking-widest font-black mt-1">Last Updated: April 2026</p>
           </div>
        </div>

        <div className="bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-3xl space-y-12">
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-xl font-outfit">
               <Shield className="w-5 h-5 text-primary" />
               1. Acceptance of Terms
            </div>
            <p className="text-muted leading-relaxed">
              By accessing or using the MoviGo platform, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use our services. We provide a digital infrastructure for movie ticketing, cinema discovery, and loyalty reward management.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-xl font-outfit">
               <Scale className="w-5 h-5 text-primary" />
               2. Booking & Cancellation
            </div>
            <p className="text-muted leading-relaxed">
              Tickets booked through MoviGo are generally non-refundable. Each cinema partner has their own specific cancellation policy which is displayed at the time of checkout. Once a "Digital Identity" (Ticket) is issued, it represents a confirmed reservation that cannot be altered within 4 hours of the showtime.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-xl font-outfit">
               <AlertCircle className="w-5 h-5 text-primary" />
               3. Code of Conduct
            </div>
            <p className="text-muted leading-relaxed">
              Users are prohibited from using automated scripts to bulk-book tickets or manipulate the loyalty points system. Any attempt to "double-spend" points or bypass the secure QR gate scanning system will result in an immediate and permanent account purge.
            </p>
          </section>

          <section className="space-y-4 border-t border-white/5 pt-8">
            <h4 className="text-white font-bold">Contact for Legal Inquiries</h4>
            <p className="text-muted text-sm">
              If you have any questions regarding these terms, please contact our legal department at <span className="text-primary font-bold">movigo00@gmail.com</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;

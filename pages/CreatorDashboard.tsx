
import React, { useState } from 'react';

const CreatorDashboard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-12 bg-white rounded-3xl shadow-xl text-center">
        <div className="w-20 h-20 bg-emerald-100 text-[#00A884] rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Course Submitted!</h2>
        <p className="text-slate-600 mb-8">Your course "Advanced Orthopedics 2026" has been sent to the VetSphere audit team. You will be notified once it's live.</p>
        <button onClick={() => setSubmitted(false)} className="bg-[#00A884] text-white px-8 py-3 rounded-xl font-bold">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8 pb-4 border-b">
        <h1 className="text-2xl font-bold text-slate-900">VetSphere Creator Studio</h1>
        <div className="flex gap-4">
          <span className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-[#00A884]' : 'bg-slate-200'}`}></span>
          <span className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-[#00A884]' : 'bg-slate-200'}`}></span>
          <span className={`w-3 h-3 rounded-full ${step >= 3 ? 'bg-[#00A884]' : 'bg-slate-200'}`}></span>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border shadow-sm">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-xl font-bold mb-4 text-slate-800">1. Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Course Title (CN/EN)</label>
                <input type="text" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white transition-all" placeholder="e.g. Masterclass in Soft Tissue..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Specialty</label>
                <select className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <option>Orthopedics</option>
                  <option>Ophthalmology</option>
                  <option>Soft Tissue</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Location City</label>
                <input type="text" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50" placeholder="e.g. Shanghai" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Base Tuition (CNY)</label>
                <input type="number" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50" placeholder="0.00" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-xl font-bold mb-4 text-slate-800">2. Instructor & Bio</h2>
            <div className="flex gap-6 items-center mb-6">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 text-center p-2">
                Click to upload portrait
              </div>
              <div className="flex-1">
                <input type="text" className="w-full p-3 rounded-xl border border-slate-200 mb-2" placeholder="Full Professional Name" />
                <input type="text" className="w-full p-3 rounded-xl border border-slate-200" placeholder="Credentials (e.g. DVM, DECVS)" />
              </div>
            </div>
            <textarea className="w-full h-32 p-4 rounded-xl border border-slate-200 bg-slate-50" placeholder="Paste instructor biography here..."></textarea>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-xl font-bold mb-4 text-slate-800">3. Daily Agenda</h2>
            <p className="text-sm text-slate-500 italic">Add time slots for each day of the course.</p>
            <div className="p-6 border rounded-2xl border-slate-100 space-y-4">
              <div className="flex gap-4">
                <input type="text" className="w-32 p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs font-mono" placeholder="09:00-10:00" />
                <input type="text" className="flex-1 p-3 rounded-xl border border-slate-100 bg-slate-50 text-sm" placeholder="Activity description..." />
              </div>
              <button className="text-[#00A884] text-xs font-bold hover:underline">+ Add Time Slot</button>
            </div>
          </div>
        )}

        <div className="mt-12 flex justify-between pt-6 border-t">
          <button 
            disabled={step === 1}
            onClick={() => setStep(s => s - 1)}
            className="px-6 py-3 text-slate-400 font-bold disabled:opacity-0 transition-opacity"
          >
            Previous
          </button>
          <button 
            onClick={() => step === 3 ? setSubmitted(true) : setStep(s => s + 1)}
            className="bg-[#00A884] text-white px-10 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
          >
            {step === 3 ? 'Submit for Audit' : 'Next Step'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;

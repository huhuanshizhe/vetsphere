import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Live AI Assistant - Coming Soon | VetSphere',
  description: 'Voice-activated AI surgical assistant for real-time intraoperative support. Coming soon to VetSphere.',
};

export default function LiveAssistantPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-20 px-4">
      <div className="max-w-lg text-center space-y-6">
        <div className="w-20 h-20 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-4xl">&#x1F399;</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">Live AI Assistant</h1>
        <p className="text-lg text-slate-500 leading-relaxed">
          Voice-activated AI surgical assistant for real-time intraoperative support. Hands-free access to surgical protocols and equipment specifications.
        </p>
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-50 text-purple-700 rounded-full text-sm font-bold border border-purple-100">
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
          Coming Soon
        </div>
        <div className="pt-4">
          <Link
            href="/"
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all inline-block"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

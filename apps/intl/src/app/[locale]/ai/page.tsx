import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI Surgical Consultant - Coming Soon | VetSphere',
  description: '24/7 AI-powered veterinary surgical consultation. Coming soon to VetSphere International.',
};

export default function AIChatPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-20 px-4">
      <div className="max-w-lg text-center space-y-6">
        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-4xl">&#x1F916;</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">AI Surgical Consultant</h1>
        <p className="text-lg text-slate-500 leading-relaxed">
          24/7 AI-powered veterinary surgical consultation. Analyze X-rays, CT scans, and get expert surgical planning assistance.
        </p>
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 rounded-full text-sm font-bold border border-blue-100">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
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

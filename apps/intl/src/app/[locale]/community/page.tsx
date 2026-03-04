import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Community - Coming Soon | VetSphere',
  description: 'The VetSphere veterinary community is coming soon. Stay tuned for clinical case sharing, expert discussions, and global collaboration.',
};

export default async function CommunityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center pt-20 px-4">
      <div className="max-w-lg text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-4xl">&#x1F465;</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">Community</h1>
        <p className="text-lg text-slate-500 leading-relaxed">
          Our veterinary professional community is coming soon. Share clinical cases, learn from experts, and collaborate with fellow surgeons worldwide.
        </p>
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold border border-emerald-100">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Coming Soon
        </div>
        <div className="pt-4">
          <Link
            href={`/${locale}`}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all inline-block"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

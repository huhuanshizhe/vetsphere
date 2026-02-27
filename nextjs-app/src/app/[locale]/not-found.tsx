import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center p-6">
      <div className="text-[120px] leading-none mb-6">&#x1F52D;</div>
      <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Page Not Found</h1>
      <p className="text-slate-500 font-medium max-w-md mx-auto mb-10">
        You seem to have explored an unmapped clinical territory. This page might have been removed or is under development.
      </p>
      <Link href="/" className="bg-[#00A884] text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#00A884]/30 hover:brightness-110 transition-all">
        Back to Home
      </Link>
    </div>
  );
}

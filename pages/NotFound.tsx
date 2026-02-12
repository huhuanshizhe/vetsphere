
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center p-6">
      <div className="text-[120px] leading-none mb-6">🔭</div>
      <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Page Not Found</h1>
      <p className="text-slate-500 font-medium max-w-md mx-auto mb-10">
        You seem to have explored an unmapped clinical territory. This page might have been removed or is under development.
      </p>
      <Link to="/" className="bg-vs text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-vs/30 hover:bg-vs-dark transition-all">
        Back to Home
      </Link>
    </div>
  );
};

export default NotFound;

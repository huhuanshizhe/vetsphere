'use client';

import React from 'react';

const TermsPageClient: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24 pt-32">
      <h1 className="text-4xl font-black text-slate-900 mb-8">Terms of Service</h1>
      <div className="prose prose-slate max-w-none">
        <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>
        <p>Welcome to VetSphere. By accessing or using our website and services, you agree to be bound by these Terms of Service.</p>
        <h3>1. Use of Services</h3>
        <p>You agree to use our services only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your account credentials.</p>
        <h3>2. Professional Conduct</h3>
        <p>As a professional platform for veterinary surgeons, we expect all users to maintain high standards of professional conduct. Any misuse of the platform, including posting false information or engaging in harassment, may result in account termination.</p>
        <h3>3. Intellectual Property</h3>
        <p>All content on VetSphere, including text, graphics, logos, and software, is the property of VetSphere or its licensors and is protected by intellectual property laws.</p>
        <h3>4. Limitation of Liability</h3>
        <p>VetSphere shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the services.</p>
        <h3>5. Governing Law</h3>
        <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which VetSphere is established.</p>
      </div>
    </div>
  );
};

export default TermsPageClient;

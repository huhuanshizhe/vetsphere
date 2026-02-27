'use client';

import React from 'react';

const PrivacyPageClient: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24 pt-32">
      <h1 className="text-4xl font-black text-slate-900 mb-8">Privacy Policy</h1>
      <div className="prose prose-slate max-w-none">
        <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>
        <p>At VetSphere, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.</p>
        <h3>1. Information We Collect</h3>
        <p>We collect information that you provide directly to us, such as when you create an account, make a purchase, or communicate with us. This may include your name, email address, professional license number, and payment information.</p>
        <h3>2. How We Use Your Information</h3>
        <p>We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and communicate with you about products, services, and events.</p>
        <h3>3. Data Security</h3>
        <p>We implement appropriate technical and organizational measures to protect the security of your personal information. However, please be aware that no method of transmission over the Internet or electronic storage is 100% secure.</p>
        <h3>4. Contact Us</h3>
        <p>If you have any questions about this Privacy Policy, please contact us at privacy@vetsphere.global.</p>
      </div>
    </div>
  );
};

export default PrivacyPageClient;

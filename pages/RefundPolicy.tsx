import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const RefundPolicy: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 pt-32">
      <h1 className="text-4xl font-black text-slate-900 mb-8">Refund Policy</h1>
      <div className="prose prose-slate max-w-none">
        <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>
        <p>
          We want you to be completely satisfied with your purchase from VetSphere. If you are not, we offer a refund policy as outlined below.
        </p>
        
        <h3>1. Course Registrations</h3>
        <p>
          Full refunds for course registrations are available up to 30 days before the course start date. Cancellations made within 30 days of the start date may be subject to a cancellation fee. No refunds will be issued for cancellations made within 7 days of the course start date.
        </p>

        <h3>2. Equipment Purchases</h3>
        <p>
          Unopened and unused equipment may be returned for a full refund within 30 days of purchase. Opened items may be subject to a restocking fee. Defective items will be replaced or refunded in accordance with the manufacturer's warranty.
        </p>

        <h3>3. Digital Products</h3>
        <p>
          Due to the nature of digital products, all sales of downloadable content and digital subscriptions are final and non-refundable.
        </p>

        <h3>4. How to Request a Refund</h3>
        <p>
          To request a refund, please contact our support team at support@vetsphere.global with your order number and reason for the return.
        </p>
      </div>
    </div>
  );
};

export default RefundPolicy;

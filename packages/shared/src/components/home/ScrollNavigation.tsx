'use client';

import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

/**
 * Scroll Progress Bar Component
 */
export const ScrollProgress: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(scrollPercent);
    };

    window.addEventListener('scroll', updateProgress);
    updateProgress();

    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[100]">
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

/**
 * Back to Top Button
 */
export const BackToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener('scroll', toggleVisibility);
    toggleVisibility();

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 p-4 rounded-full bg-slate-900 text-white shadow-lg hover:bg-emerald-600 transition-all z-[99] touch-feedback ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      aria-label="返回顶部"
    >
      <ChevronUp className="w-6 h-6" />
    </button>
  );
};

/**
 * 侧边导航组件
 */
interface SectionNavProps {
  sections: Array<{
    id: string;
    label: string;
    icon?: React.ElementType;
  }>;
}

export const SectionNav: React.FC<SectionNavProps> = ({ sections }) => {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <nav className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-[90] hidden lg:flex flex-col gap-2">
      {sections.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => scrollToSection(id)}
          className={`group relative p-3 rounded-xl transition-all touch-feedback ${
            activeSection === id
              ? 'bg-emerald-500 text-white shadow-lg scale-110'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          aria-label={`Navigate to ${label}`}
        >
          {Icon ? <Icon className="w-5 h-5" /> : <span className="text-xs font-bold">{label.charAt(0)}</span>}
          
          {/* Tooltip */}
          <span className="absolute right-full mr-2 px-3 py-1.5 bg-slate-900 text-white text-sm font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
};

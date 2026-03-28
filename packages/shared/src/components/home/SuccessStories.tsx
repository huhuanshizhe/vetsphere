'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface Testimonial {
  id: string;
  name: string;
  title: string;
  location: string;
  avatar: string;
  quote: string;
  result: string;
  rating: number;
  course?: string;
}

/**
 * International Success Stories Testimonial Carousel
 */
export const SuccessStories: React.FC = () => {
  const { language, t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials: Testimonial[] = [
    {
      id: '1',
      name: 'Dr. Sarah Mitchell',
      title: t.successStories.testimonial1NameTitle,
      location: 'London, UK',
      avatar: '/avatars/vet1.jpg',
      quote: t.successStories.testimonial1Quote,
      result: t.successStories.testimonial1Result,
      rating: 5,
      course: t.successStories.testimonial1Course,
    },
    {
      id: '2',
      name: 'Dr. James Chen',
      title: t.successStories.testimonial2NameTitle,
      location: 'Sydney, Australia',
      avatar: '/avatars/vet2.jpg',
      quote: t.successStories.testimonial2Quote,
      result: t.successStories.testimonial2Result,
      rating: 5,
      course: t.successStories.testimonial2Course,
    },
    {
      id: '3',
      name: 'Dr. Maria Rodriguez',
      title: t.successStories.testimonial3NameTitle,
      location: 'Madrid, Spain',
      avatar: '/avatars/vet3.jpg',
      quote: t.successStories.testimonial3Quote,
      result: t.successStories.testimonial3Result,
      rating: 5,
      course: t.successStories.testimonial3Course,
    },
    {
      id: '4',
      name: 'Dr. Thomas Weber',
      title: t.successStories.testimonial4NameTitle,
      location: 'Munich, Germany',
      avatar: '/avatars/vet4.jpg',
      quote: t.successStories.testimonial4Quote,
      result: t.successStories.testimonial4Result,
      rating: 5,
      course: t.successStories.testimonial4Course,
    },
  ];

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, []);

  const current = testimonials[currentIndex];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
            <Quote className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700 uppercase tracking-widest">{t.successStories.tag}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            {t.successStories.title}
          </h2>
          <p className="text-xl text-slate-500">
            {t.successStories.subtitle}
          </p>
        </div>

        {/* Testimonial Card */}
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-emerald-50 to-blue-50 rounded-3xl p-8 md:p-12 shadow-xl border border-slate-100">
            {/* Quote Icon */}
            <div className="absolute top-8 left-8 w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <Quote className="w-8 h-8 text-emerald-500" />
            </div>

            {/* Content */}
            <div className="relative pt-16">
              {/* Rating */}
              <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i < current.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                  />
                ))}
              </div>

              {/* Quote Text */}
              <p className="text-xl md:text-2xl text-slate-700 leading-relaxed mb-8">
                "{current.quote}"
              </p>

              {/* Result Badge */}
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold mb-8">
                <Star className="w-5 h-5 fill-current" />
                {current.result}
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-4 pt-8 border-t border-slate-200">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                  {current.name.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{current.name}</p>
                  <p className="text-slate-500">{current.title} · {current.location}</p>
                  {current.course && (
                    <p className="text-sm text-emerald-600 font-medium mt-1">{t.successStories.completedCourse}: {current.course}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="absolute bottom-8 right-8 flex items-center gap-2">
              <button
                onClick={prev}
                className="p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-emerald-300 transition-all shadow-sm"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={next}
                className="p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-emerald-300 transition-all shadow-sm"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'bg-emerald-500 w-8'
                    : 'bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to testimonial ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Stats Display */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: t.successStories.stat1Value, label: t.successStories.stat1Label, sublabel: t.successStories.stat1Sub },
            { value: t.successStories.stat2Value, label: t.successStories.stat2Label, sublabel: t.successStories.stat2Sub },
            { value: t.successStories.stat3Value, label: t.successStories.stat3Label, sublabel: t.successStories.stat3Sub },
            { value: t.successStories.stat4Value, label: t.successStories.stat4Label, sublabel: t.successStories.stat4Sub },
          ].map((stat, idx) => (
            <div key={idx} className="text-center p-6">
              <p className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-500 mb-2">
                {stat.value}
              </p>
              <p className="text-lg font-bold text-slate-900">{stat.label}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.sublabel}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

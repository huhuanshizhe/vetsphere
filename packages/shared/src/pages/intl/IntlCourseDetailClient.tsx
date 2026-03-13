'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import {
  getIntlCourseBySlug,
  getIntlCourseInstructors,
  getIntlCourseChapters,
  getIntlCourseProducts,
  getIntlCourseAgenda,
  getIntlCourseServices,
  IntlCourse,
  IntlInstructor,
  IntlProduct,
} from '../../services/intl-api';
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Wrench,
  Clock,
  Users,
  Star,
  CheckCircle2,
  ChevronRight,
  MessageSquareQuote,
  ShoppingCart,
  BookOpen,
  Calendar,
  MapPin,
  Globe,
  Utensils,
  Hotel,
  Bus,
  FileText,
} from 'lucide-react';

interface IntlCourseDetailClientProps {
  courseSlug: string;
}

// ============================================
// Helpers
// ============================================

function productCTA(p: IntlProduct, locale: string): { label: string; href: string; variant: 'primary' | 'outline' } {
  if (p.purchase_type === 'quote' || p.pricing_mode === 'custom') {
    return { label: 'Request Quote', href: `/${locale}/shop/${p.slug}?action=quote`, variant: 'outline' };
  }
  return { label: 'View Product', href: `/${locale}/shop/${p.slug}`, variant: 'primary' };
}

// ============================================
// Component
// ============================================

export default function IntlCourseDetailClient({ courseSlug }: IntlCourseDetailClientProps) {
  const { locale } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const { addToCart } = useCart();

  const [course, setCourse] = useState<IntlCourse | null>(null);
  const [instructors, setInstructors] = useState<IntlInstructor[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [equipmentProducts, setEquipmentProducts] = useState<IntlProduct[]>([]);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIntlCourseBySlug(courseSlug, locale).then(data => {
      setCourse(data);
      setLoading(false);
      if (data) {
        // Load related data in parallel with locale
        Promise.all([
          getIntlCourseInstructors(data.course_id, locale),
          getIntlCourseChapters(data.course_id),
          getIntlCourseProducts(data.course_id),
          getIntlCourseAgenda(data.course_id, locale),
          getIntlCourseServices(data.course_id, locale),
        ]).then(([inst, chap, eq, ag, svc]) => {
          setInstructors(inst);
          setChapters(chap);
          setEquipmentProducts(eq);
          setAgenda(ag);
          setServices(svc);
        });
      }
    });
  }, [courseSlug, locale]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 pt-32 pb-16">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-slate-100 rounded w-48" />
          <div className="h-64 bg-slate-100 rounded-3xl" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-10 bg-slate-100 rounded w-3/4" />
              <div className="h-6 bg-slate-100 rounded w-1/2" />
              <div className="h-40 bg-slate-100 rounded-2xl" />
            </div>
            <div className="h-80 bg-slate-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 pt-32 pb-16 text-center">
        <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-slate-700 mb-4">Course Not Found</h1>
        <p className="text-slate-500 mb-8">This training program may no longer be available.</p>
        <Link href={`/${locale}/courses`} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition">
          Browse All Training
        </Link>
      </div>
    );
  }

  const leadInstructor = instructors[0];

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 pt-28 pb-4">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href={`/${locale}`} className="hover:text-emerald-600 transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/${locale}/courses`} className="hover:text-emerald-600 transition">Training</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-600 font-medium truncate max-w-[300px]">{course.title}</span>
        </nav>
      </div>

      {/* Hero */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 pb-12">
        <div className="grid lg:grid-cols-5 gap-10">
          {/* Left: Main Content (3 cols) */}
          <div className="lg:col-span-3 space-y-8">
            {/* Hero Image */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-100 aspect-[16/9]">
              {course.cover_image_url ? (
                <img
                  src={course.cover_image_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <GraduationCap className="w-24 h-24 text-slate-200" />
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                {course.is_featured && (
                  <span className="px-3 py-1.5 bg-amber-400 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> Featured
                  </span>
                )}
                {course.specialty && (
                  <span className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-full">{course.specialty}</span>
                )}
                {course.level && (
                  <span className="px-3 py-1.5 bg-white/90 text-slate-700 text-xs font-bold rounded-full backdrop-blur-sm">{course.level}</span>
                )}
              </div>
            </div>

            {/* Title & Meta */}
            <div className="space-y-4">
              {course.hero_title ? (
                <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {course.hero_title}
                </h1>
              ) : (
                <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {course.title}
                </h1>
              )}
              {(course.hero_subtitle || course.summary) && (
                <p className="text-lg text-slate-500 leading-relaxed">
                  {course.hero_subtitle || course.summary}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                {course.format && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg font-medium capitalize">
                    <BookOpen className="w-4 h-4 text-slate-400" /> {course.format}
                  </span>
                )}
                {course.duration_minutes && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg font-medium">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {course.duration_minutes >= 60
                      ? `${Math.round(course.duration_minutes / 60)} hours`
                      : `${course.duration_minutes} min`}
                  </span>
                )}
                {course.enrollment_count > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg font-medium">
                    <Users className="w-4 h-4 text-slate-400" /> {course.enrollment_count} enrolled
                  </span>
                )}
                {course.avg_rating && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg font-medium text-amber-700">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {course.avg_rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Course Schedule & Location Info */}
            {(course.start_date || course.end_date || course.enrollment_deadline || course.location_city || course.teaching_languages.length > 0) && (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Course Details</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Dates */}
                  {(course.start_date || course.end_date) && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dates</p>
                        <p className="text-sm font-medium text-slate-900">
                          {course.start_date && new Date(course.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {course.start_date && course.end_date && ' - '}
                          {course.end_date && new Date(course.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Enrollment Deadline */}
                  {course.enrollment_deadline && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrollment Deadline</p>
                        <p className="text-sm font-medium text-slate-900">
                          {new Date(course.enrollment_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {(course.location_city || course.location_venue) && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location</p>
                        <p className="text-sm font-medium text-slate-900">
                          {course.location_venue}
                          {course.location_venue && course.location_city && ', '}
                          {course.location_city}
                          {(course.location_city || course.location_venue) && course.location_country && ', '}
                          {course.location_country}
                        </p>
                        {course.location_address && (
                          <p className="text-xs text-slate-500 mt-0.5">{course.location_address}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Teaching Languages */}
                  {course.teaching_languages.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teaching Language</p>
                        <p className="text-sm font-medium text-slate-900">
                          {course.teaching_languages.join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {course.description && (
              <div className="prose prose-slate max-w-none">
                <h2 className="text-xl font-bold text-slate-900 mb-4">About This Training</h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{course.description}</p>
              </div>
            )}

            {/* Target Audience */}
            {course.target_audience && (
              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                <h3 className="text-base font-bold text-emerald-800 mb-2">Who Should Attend</h3>
                <p className="text-sm text-emerald-700 leading-relaxed">{course.target_audience}</p>
              </div>
            )}

            {/* Curriculum / Chapters */}
            {chapters.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900">Curriculum</h2>
                <div className="space-y-3">
                  {chapters.map((ch, idx) => (
                    <div key={ch.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-base">{ch.title}</h4>
                          {ch.description && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{ch.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400">
                          {ch.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {ch.duration_minutes}min
                            </span>
                          )}
                          {ch.is_free_preview && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-bold">Free Preview</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agenda / Schedule */}
            {agenda.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900">Schedule</h2>
                <div className="space-y-4">
                  {Array.from(new Set(agenda.map(item => item.day_number))).map(dayNum => (
                    <div key={dayNum} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                        <h3 className="font-bold text-slate-900">Day {dayNum}</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {agenda
                          .filter(item => item.day_number === dayNum)
                          .sort((a, b) => a.display_order - b.display_order)
                          .map(item => (
                            <div key={item.id} className="px-5 py-4 flex items-start gap-4">
                              {item.session_time && (
                                <span className="text-sm font-medium text-slate-400 shrink-0 w-20">{item.session_time}</span>
                              )}
                              <div className="flex-1">
                                <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                                {item.description && (
                                  <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services */}
            {services.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900">What's Included</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {services.map(svc => {
                    const iconMap: Record<string, React.ReactNode> = {
                      meals: <Utensils className="w-5 h-5 text-emerald-600" />,
                      accommodation: <Hotel className="w-5 h-5 text-emerald-600" />,
                      transportation: <Bus className="w-5 h-5 text-emerald-600" />,
                      visa_letter: <FileText className="w-5 h-5 text-emerald-600" />,
                    };
                    return (
                      <div key={svc.id} className={`flex items-start gap-3 p-4 rounded-xl border ${svc.is_included ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${svc.is_included ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                          {iconMap[svc.service_type] || <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm capitalize">{svc.service_type.replace('_', ' ')}</h4>
                            {svc.is_included && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">Included</span>
                            )}
                          </div>
                          {svc.description && (
                            <p className="text-sm text-slate-500 mt-1">{svc.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Instructors */}
            {instructors.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900">Instructor{instructors.length > 1 ? 's' : ''}</h2>
                <div className="space-y-4">
                  {instructors.map(inst => (
                    <div key={inst.id} className="flex items-start gap-5 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      {inst.avatar_url ? (
                        <img src={inst.avatar_url} alt={inst.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl shrink-0">
                          {inst.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-lg">{inst.name}</h4>
                        <p className="text-sm text-slate-500 font-medium mb-2">{inst.title}</p>
                        {inst.role && (
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-bold mb-2 capitalize">{inst.role}</span>
                        )}
                        {inst.bio && <p className="text-sm text-slate-600 leading-relaxed">{inst.bio}</p>}
                        {inst.credentials && (
                          <p className="text-xs text-slate-400 mt-2 font-medium">{inst.credentials}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* EQUIPMENT LINKAGE SECTION */}
            {/* ============================================ */}
            {equipmentProducts.length > 0 && (
              <div id="equipment-kits" className="space-y-6 scroll-mt-32">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Recommended Equipment</h2>
                    <p className="text-sm text-slate-500">Equipment kits related to this training program</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {equipmentProducts.map(product => {
                    const cta = productCTA(product, locale);
                    return (
                      <Link
                        key={product.id}
                        href={cta.href}
                        className="group flex gap-4 bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-lg transition-all"
                      >
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                          {product.cover_image_url ? (
                            <img
                              src={product.cover_image_url}
                              alt={product.display_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Wrench className="w-8 h-8 text-slate-200" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                          {product.brand && (
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{product.brand}</span>
                          )}
                          <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1">{product.display_name}</h4>
                          {product.recommendation_reason && (
                            <p className="text-xs text-blue-600 mt-0.5">{product.recommendation_reason}</p>
                          )}
                          <div className="mt-auto flex items-center justify-between pt-2">
                            {product.display_price ? (
                              <span className="text-sm font-bold text-slate-900">
                                ${product.display_price.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Contact for pricing</span>
                            )}
                            <span className={`text-xs font-bold flex items-center gap-1 ${
                              cta.variant === 'outline' ? 'text-blue-600' : 'text-emerald-600'
                            }`}>
                              {cta.label} <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <div className="text-center pt-2">
                  <Link
                    href={`/${locale}/shop`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition"
                  >
                    Browse All Equipment <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right: Sidebar (2 cols) */}
          <div className="lg:col-span-2">
            <div className="sticky top-28 space-y-6">
              {/* Enrollment Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Enroll in This Training</h3>

                {/* Price - 使用本地化的 price 和 currency */}
                <div className="mb-6 pb-4 border-b border-slate-100">
                  {course.is_free ? (
                    <span className="text-3xl font-extrabold text-emerald-600">Free</span>
                  ) : course.price ? (
                    <span className="text-3xl font-extrabold text-slate-900">
                      {course.currency === 'USD' ? '$' :
                       course.currency === 'CNY' ? '¥' :
                       course.currency === 'JPY' ? '¥' :
                       course.currency === 'THB' ? '฿' : '$'}
                      {course.price.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-lg font-bold text-slate-500">Contact for pricing</span>
                  )}
                  {course.pricing_mode !== 'inherit' && course.pricing_mode !== 'fixed' && (
                    <p className="text-xs text-slate-400 mt-1">Custom pricing available</p>
                  )}
                </div>

                {/* CTA Buttons - 根据当前语言的价格决定显示询价还是购买 */}
                {course.cta_config?.primary_action === 'inquiry' || (!course.price && !course.is_free) ? (
                  <Link
                    href={`/${locale}/for-clinics#consultation`}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/10"
                  >
                    <MessageSquareQuote className="w-5 h-5" /> Inquire About This Course
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      if (!course) return;
                      // 添加到购物车并跳转到结账页面
                      addToCart({
                        id: course.course_id,
                        type: 'course',
                        name: course.title,
                        price: course.price || 0,
                        currency: course.currency || 'USD',
                        imageUrl: course.cover_image_url || '',
                        quantity: 1,
                      });
                      router.push(`/${locale}/checkout`);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/10"
                  >
                    <GraduationCap className="w-5 h-5" /> Enroll Now
                  </button>
                )}

                <Link
                  href={`/${locale}/for-clinics#consultation`}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition"
                >
                  Talk to Our Team
                </Link>

                {/* Quick Info */}
                <div className="mt-6 space-y-3">
                  {course.format && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Format</span>
                      <span className="font-bold text-slate-900 capitalize">{course.format}</span>
                    </div>
                  )}
                  {course.level && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Level</span>
                      <span className="font-bold text-slate-900">{course.level}</span>
                    </div>
                  )}
                  {course.specialty && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Specialty</span>
                      <span className="font-bold text-slate-900">{course.specialty}</span>
                    </div>
                  )}
                  {course.duration_minutes && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Duration</span>
                      <span className="font-bold text-slate-900">
                        {course.duration_minutes >= 60
                          ? `${Math.round(course.duration_minutes / 60)} hours`
                          : `${course.duration_minutes} min`}
                      </span>
                    </div>
                  )}
                  {course.start_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Start Date</span>
                      <span className="font-bold text-slate-900">
                        {new Date(course.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {course.location_city && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Location</span>
                      <span className="font-bold text-slate-900">{course.location_city}</span>
                    </div>
                  )}
                  {course.teaching_languages.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Language</span>
                      <span className="font-bold text-slate-900">{course.teaching_languages.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Growth Tracks */}
              {course.growth_tracks && course.growth_tracks.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Growth Tracks</h4>
                  <div className="flex flex-wrap gap-2">
                    {course.growth_tracks.map((track, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                        {track}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lead instructor mini card */}
              {leadInstructor && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Lead Instructor</h4>
                  <div className="flex items-center gap-3">
                    {leadInstructor.avatar_url ? (
                      <img src={leadInstructor.avatar_url} alt={leadInstructor.name} className="w-12 h-12 rounded-full object-cover border border-slate-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg">
                        {leadInstructor.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-900">{leadInstructor.name}</p>
                      <p className="text-xs text-slate-500">{leadInstructor.title}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Equipment count quick link */}
              {equipmentProducts.length > 0 && (
                <a
                  href="#equipment-kits"
                  className="block bg-blue-50 border border-blue-100 rounded-2xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-blue-900">{equipmentProducts.length} Equipment Kit{equipmentProducts.length !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-blue-600">View recommended equipment below</p>
                    </div>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Back to Training */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 pb-16">
        <Link
          href={`/${locale}/courses`}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Training
        </Link>
      </div>
    </div>
  );
}

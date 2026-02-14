
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Specialty, Course } from '../types';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const CourseCard: React.FC<{ course: Course; onSelect: (c: Course) => void; isAuthenticated: boolean }> = ({ course, onSelect, isAuthenticated }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="clinical-card flex flex-col h-full group overflow-hidden">
      <div className="h-52 relative overflow-hidden bg-slate-100">
        <img 
          src={course.imageUrl} 
          alt={course.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 flex gap-2">
            <span className="bg-white px-2 py-1 rounded text-[10px] font-black text-vs border border-slate-100 uppercase tracking-widest shadow-sm">
              {course.level}
            </span>
        </div>
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[11px] font-bold text-slate-800 shadow-sm border border-white/50">
          📍 {course.location.city}
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-vs"></span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{course.specialty}</span>
        </div>
        
        <h3 className="text-lg font-extrabold text-slate-900 mb-4 leading-snug group-hover:text-vs transition-colors line-clamp-2">
          {course.title}
        </h3>
        
        <div className="flex items-center gap-3 mb-6">
          <img src={course.instructor.imageUrl} className="w-8 h-8 rounded-full border border-slate-100 shadow-sm" />
          <div>
            <p className="text-xs font-black text-slate-800 leading-tight">{course.instructor.name}</p>
            <p className="text-[10px] text-slate-400 font-medium truncate w-32">{course.instructor.title}</p>
          </div>
        </div>
        
        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
          <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{t.courses.tuition}</p>
              {isAuthenticated ? (
                <p className="text-lg font-black text-slate-900">¥{course.price.toLocaleString()}</p>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate('/auth'); }}
                  className="flex items-center gap-1.5 text-xs font-black text-vs uppercase hover:underline"
                >
                  <span className="text-[14px]">🔒</span> {t.auth.loginToView}
                </button>
              )}
          </div>
          <button 
            onClick={() => onSelect(course)}
            className="w-10 h-10 rounded-lg bg-slate-50 text-vs flex items-center justify-center hover:bg-vs hover:text-white transition-all shadow-sm"
          >
            <span className="text-xl">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const Courses: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { addNotification } = useNotification();
  const initialFilter = (location.state as any)?.specialty || 'All';
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Specialty | 'All'>(initialFilter);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    api.getCourses().then(data => {
        setCourses(data);
        setLoading(false);
    });
  }, []);

  const handleRegister = (course: Course) => {
    if (!isAuthenticated) {
        navigate('/auth');
        return;
    }
    addToCart({
      id: course.id,
      name: course.title,
      price: course.price,
      currency: course.currency,
      imageUrl: course.imageUrl,
      type: 'course',
      quantity: 1
    });
    setSelectedCourse(null);
    navigate('/checkout');
  };

  const handleShareCourse = async (course: Course) => {
    const shareUrl = `${window.location.origin}/#/courses?id=${course.id}`;
    const shareTitle = `[VetSphere Training] ${course.title}`;
    
    if (navigator.share) {
        try {
            await navigator.share({ title: shareTitle, url: shareUrl });
            if (user) {
                await api.awardPoints(user.id, 50, `Shared course: ${course.title}`);
                addNotification({ id: `sh-c-${Date.now()}`, type: 'system', title: t.common.pointsEarned, message: '+50 pts for sharing course.', read: true, timestamp: new Date() });
            }
        } catch (e) { console.log('Share canceled'); }
    } else {
        navigator.clipboard.writeText(shareUrl);
        addNotification({ id: `sh-c-${Date.now()}`, type: 'system', title: t.common.copySuccess, message: 'Points awarded!', read: true, timestamp: new Date() });
        if (user) await api.awardPoints(user.id, 50, `Copied course link: ${course.title}`);
    }
  };

  const filteredCourses = filter === 'All' 
    ? courses 
    : courses.filter(c => c.specialty === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pt-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
        <div className="max-w-xl space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t.courses.title}</h1>
          <p className="text-slate-500 font-medium">{t.courses.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl">
          {['All', ...Object.values(Specialty)].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s as any)}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                filter === s 
                ? 'bg-white text-vs shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s === 'All' ? t.courses.allSpecialties : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
           <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-vs border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map(course => (
            <CourseCard key={course.id} course={course} onSelect={setSelectedCourse} isAuthenticated={isAuthenticated} />
            ))}
            {filteredCourses.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">{t.courses.empty}</p>
            </div>
            )}
        </div>
      )}

      {selectedCourse && (
        <div 
          className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedCourse(null)}
        >
          <div 
            className="bg-white rounded-[32px] w-full max-w-4xl my-auto overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-64 bg-slate-100">
              <img src={selectedCourse.imageUrl} className="w-full h-full object-cover" />
              <div className="absolute top-6 right-6 flex gap-3">
                  <button 
                    onClick={() => handleShareCourse(selectedCourse)}
                    className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-vs hover:text-white z-50 transition-all"
                  >📤</button>
                  <button 
                    onClick={() => setSelectedCourse(null)}
                    className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white text-slate-900 z-50 transition-all"
                  >✕</button>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex items-end p-10">
                <div>
                    <h2 className="text-3xl font-black text-white mb-3 tracking-tight">{selectedCourse.title}</h2>
                    <div className="flex flex-wrap gap-6 text-white/80 text-xs font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-2">📅 {selectedCourse.startDate} — {selectedCourse.endDate}</span>
                        <span className="flex items-center gap-2">📍 {selectedCourse.location.venue}</span>
                    </div>
                </div>
              </div>
            </div>
            
            <div className="p-10 grid md:grid-cols-3 gap-12 overflow-y-auto max-h-[60vh]">
              <div className="md:col-span-2 space-y-12">
                <section>
                  <h4 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-vs"></span> {t.courses.agenda}
                  </h4>
                  {selectedCourse.agenda.map((day, dIdx) => (
                    <div key={dIdx} className="mb-8 last:mb-0">
                      <h5 className="font-black text-vs text-[10px] mb-4 uppercase tracking-[0.2em]">{day.day} • {day.date}</h5>
                      <div className="space-y-3">
                        {day.items.map((item, iIdx) => (
                          <div key={iIdx} className="flex gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100/50 group hover:bg-vs/5 transition-colors">
                            <span className="font-mono font-bold text-slate-400 w-24 shrink-0 text-[11px] pt-0.5">{item.time}</span>
                            <div className="flex-1">
                                <p className="text-slate-800 font-bold text-sm leading-snug">{item.activity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
                
                <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest">{t.courses.instructor}</h4>
                  <div className="flex gap-6 items-start">
                    <img src={selectedCourse.instructor.imageUrl} className="w-24 h-24 rounded-2xl object-cover shadow-md border-2 border-white" />
                    <div>
                      <h5 className="text-xl font-black text-slate-900 mb-1">{selectedCourse.instructor.name}</h5>
                      <p className="text-[11px] text-vs font-black mb-4 uppercase tracking-tight">{selectedCourse.instructor.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium italic opacity-80">"{selectedCourse.instructor.bio}"</p>
                    </div>
                  </div>
                </section>
              </div>
              
              <div className="space-y-6">
                <div className="p-8 rounded-[32px] bg-vs text-white shadow-2xl shadow-vs/20">
                  {isAuthenticated ? (
                    <p className="text-4xl font-black mb-8 tracking-tighter">¥{selectedCourse.price.toLocaleString()}</p>
                  ) : (
                    <div className="mb-8">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{t.auth.memberPrice}</p>
                        <button onClick={() => navigate('/auth')} className="text-2xl font-black hover:underline underline-offset-4">{t.auth.pleaseLogin}</button>
                    </div>
                  )}
                  <div className="space-y-4 mb-10">
                      {t.courses.features.map(feat => (
                        <div key={feat} className="flex items-center gap-3 text-xs font-bold">
                            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                            {feat}
                        </div>
                      ))}
                  </div>
                  <button onClick={() => handleRegister(selectedCourse)} className="w-full bg-white text-vs py-5 rounded-2xl font-black text-sm shadow-xl hover:shadow-2xl transition-all">
                    {isAuthenticated ? t.courses.registerNow : t.auth.loginToRegister}
                  </button>
                </div>
                
                <div className="p-8 rounded-[32px] border border-slate-100 bg-white">
                  <h5 className="font-black text-slate-900 mb-4 text-[10px] uppercase tracking-widest">{t.courses.venue}</h5>
                  <p className="text-sm text-slate-800 font-bold mb-1 leading-tight">{selectedCourse.location.venue}</p>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed font-medium">{selectedCourse.location.address}</p>
                  <button className="w-full py-3 text-[10px] font-black uppercase border-2 border-slate-50 rounded-xl hover:bg-slate-50 transition-all">
                    {t.courses.openMaps}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;

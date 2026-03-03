'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Filter, Search, Star, Clock, Users, Award, ArrowRight,
  ChevronRight, Stethoscope, Eye, Target, Heart, Sparkles, CheckCircle2,
  GraduationCap, Play, Calendar, MapPin
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

// Course category
interface CourseCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
}

// Course card
interface CourseCardProps {
  id: string;
  title: string;
  instructor: string;
  category: string;
  duration: string;
  students: number;
  rating: number;
  price: number;
  image?: string;
  featured?: boolean;
  upcoming?: boolean;
  locale: string;
}

const CATEGORIES: CourseCategory[] = [
  { id: 'all', name: '全部课程', icon: <BookOpen className="w-5 h-5" />, count: 24 },
  { id: 'surgery', name: '外科手术', icon: <Stethoscope className="w-5 h-5" />, count: 8 },
  { id: 'ultrasound', name: '超声影像', icon: <Target className="w-5 h-5" />, count: 5 },
  { id: 'ophthalmology', name: '眼科专科', icon: <Eye className="w-5 h-5" />, count: 4 },
  { id: 'general', name: '全科基础', icon: <Heart className="w-5 h-5" />, count: 7 },
];

// Course Card Component
const CourseCard: React.FC<CourseCardProps> = ({
  id, title, instructor, category, duration, students, rating, price, image, featured, upcoming, locale
}) => (
  <Link 
    href={`/${locale}/courses/${id}`}
    className={`group block bg-white rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
      featured ? 'border-blue-200 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
    }`}
  >
    {/* Image */}
    <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
      {image ? (
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <GraduationCap className="w-12 h-12 text-slate-300" />
        </div>
      )}
      {featured && (
        <div className="absolute top-3 left-3 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>推荐</span>
        </div>
      )}
      {upcoming && (
        <div className="absolute top-3 right-3 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>即将开课</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
        <Play className="w-5 h-5 text-slate-700 fill-current" />
      </div>
    </div>

    {/* Content */}
    <div className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">{category}</span>
        <div className="flex items-center gap-1 text-amber-500">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span className="text-xs font-bold">{rating.toFixed(1)}</span>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
        {title}
      </h3>

      <p className="text-sm text-slate-500 mb-4">讲师: {instructor}</p>

      <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{duration}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          <span>{students}人学习</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="text-xl font-black text-slate-900">
          ¥{price.toLocaleString()}
        </div>
        <span className="text-sm font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
          查看详情
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </div>
  </Link>
);

const CnCoursesPage: React.FC = () => {
  const { locale } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample courses data for CN market
  const sampleCourses = [
    {
      id: 'tplo-basics',
      title: 'TPLO手术基础与实操训练',
      instructor: 'Dr. 张明华',
      category: '外科手术',
      duration: '3天',
      students: 156,
      rating: 4.9,
      price: 12800,
      featured: true,
      upcoming: true,
    },
    {
      id: 'abdominal-ultrasound',
      title: '腹部超声诊断进阶课程',
      instructor: 'Dr. 李文静',
      category: '超声影像',
      duration: '2天',
      students: 203,
      rating: 4.8,
      price: 6800,
      featured: true,
    },
    {
      id: 'soft-tissue-surgery',
      title: '软组织外科手术技巧',
      instructor: 'Dr. 王建国',
      category: '外科手术',
      duration: '2天',
      students: 128,
      rating: 4.7,
      price: 8800,
    },
    {
      id: 'eye-examination',
      title: '眼科检查与常见眼病诊治',
      instructor: 'Dr. 陈晓燕',
      category: '眼科专科',
      duration: '1.5天',
      students: 89,
      rating: 4.9,
      price: 5800,
    },
    {
      id: 'cardiac-ultrasound',
      title: '心脏超声基础与病例解读',
      instructor: 'Dr. 刘海波',
      category: '超声影像',
      duration: '2天',
      students: 112,
      rating: 4.6,
      price: 7800,
      upcoming: true,
    },
    {
      id: 'clinical-diagnosis',
      title: '临床诊断思维训练课程',
      instructor: 'Dr. 赵雪梅',
      category: '全科基础',
      duration: '2天',
      students: 245,
      rating: 4.8,
      price: 4800,
    },
  ];

  const filteredCourses = sampleCourses.filter(course => {
    const matchesCategory = activeCategory === 'all' || course.category === CATEGORIES.find(c => c.id === activeCategory)?.name;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
        
        <div className="relative container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-6">
              <BookOpen className="w-4 h-4" />
              <span>专业兽医培训课程</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
              课程中心
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              由资深专家授课的实操培训课程，覆盖外科、超声、眼科等多个专科方向，
              帮助你系统提升临床技能，拓展职业发展空间。
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索课程名称、讲师..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Filter */}
      <section className="py-8 border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-16 z-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  activeCategory === category.id
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category.icon}
                <span>{category.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeCategory === category.id ? 'bg-white/20' : 'bg-slate-200'
                }`}>
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Course Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8">
          {filteredCourses.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-8">
                <p className="text-slate-600">
                  共 <span className="font-bold text-slate-900">{filteredCourses.length}</span> 门课程
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Filter className="w-4 h-4" />
                  <span>按热度排序</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} {...course} locale={locale} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">未找到相关课程</h3>
              <p className="text-slate-500 mb-6">尝试调整筛选条件或搜索关键词</p>
              <button
                onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                查看全部课程
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Why Learn With Us */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4">为什么选择我们的课程</h2>
            <p className="text-slate-400 text-lg">专业、实用、系统的兽医继续教育体系</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Award className="w-6 h-6" />, title: '资深专家授课', desc: '国际认证专科医师亲自教学' },
              { icon: <Stethoscope className="w-6 h-6" />, title: '真实病例实操', desc: 'Wet-lab实操训练，学以致用' },
              { icon: <Users className="w-6 h-6" />, title: '小班精品教学', desc: '限制人数，保证学习质量' },
              { icon: <GraduationCap className="w-6 h-6" />, title: '课后持续支持', desc: '学员社群答疑，终身学习' },
            ].map((item, index) => (
              <div key={index} className="p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Growth System Connection */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" />
              <span>完整成长路径</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">
              不知道从哪门课开始？
            </h2>
            
            <p className="text-xl text-slate-600 mb-10">
              查看我们的成长体系，根据你的背景和目标获取个性化的学习路径建议。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={`/${locale}/growth-system`}
                className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
              >
                <span>查看成长体系</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              
              {!isAuthenticated && (
                <Link
                  href={`/${locale}/auth`}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  <span>免费注册</span>
                  <ChevronRight className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-10 md:p-14 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-black mb-4">
                开启你的学习之旅
              </h2>
              <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
                加入数千名兽医同行，通过系统培训提升专业技能，
                在职业道路上走得更远。
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {isAuthenticated ? (
                  <Link
                    href={`/${locale}/doctor/courses`}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span>我的课程</span>
                  </Link>
                ) : (
                  <Link
                    href={`/${locale}/auth`}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                  >
                    <span>立即注册</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default CnCoursesPage;

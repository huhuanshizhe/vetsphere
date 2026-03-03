'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Gift, ArrowRight, Calendar, Users, Clock, Play,
  GraduationCap, Stethoscope, Target, MessageCircle, Sparkles
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

// ============================================================================
// 类型定义
// ============================================================================

/** 公益课类型 */
type PublicCourseType = 'open-class' | 'mentor-qa' | 'case-study';

/** 课程阶段 */
type CourseStage = 'certification' | 'clinical-basics' | 'specialty-advanced' | 'advanced-practice' | 'career-growth';

/** 公益课数据结构 */
interface PublicCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl?: string;
  stage: CourseStage;
  stageLabel: string;
  courseType: PublicCourseType;
  courseTypeLabel: string;
  pricingType: 'free-public';
  price: 0;
  audiences: string[];
  audienceLabel: string;
  startTime: string;
  duration?: string;
  instructor?: {
    name: string;
    title?: string;
  };
  enrollmentMode: 'direct' | 'plan';
}

/** 组件 Props */
interface PublicCourseSectionProps {
  locale: string;
  currentStage: string;
  onEnroll: (course: PublicCourse) => void;
}

// ============================================================================
// 常量：示例公益课数据
// ============================================================================

const SAMPLE_PUBLIC_COURSES: PublicCourse[] = [
  {
    id: 'public-exam-guide-2026',
    slug: 'public-exam-guide-2026',
    title: '执业兽医考试备考指南',
    description: '系统了解考试结构、备考策略与学习资源，少走弯路高效准备',
    stage: 'certification',
    stageLabel: '考证入行',
    courseType: 'open-class',
    courseTypeLabel: '公开课',
    pricingType: 'free-public',
    price: 0,
    audiences: ['student', 'new-hire'],
    audienceLabel: '在校生 / 应届毕业生',
    startTime: '2026-03-15T19:00:00',
    duration: '1小时',
    instructor: {
      name: '张老师',
      title: '资深兽医考试辅导专家',
    },
    enrollmentMode: 'direct',
  },
  {
    id: 'public-clinical-qa-2026',
    slug: 'public-clinical-qa-2026',
    title: '本周临床病例答疑',
    description: '每周固定时间，资深导师在线解答临床中遇到的实际问题',
    stage: 'clinical-basics',
    stageLabel: '临床基础',
    courseType: 'mentor-qa',
    courseTypeLabel: '导师答疑',
    pricingType: 'free-public',
    price: 0,
    audiences: ['new-hire', '1-3-years'],
    audienceLabel: '新入职医生 / 1-3年临床',
    startTime: '2026-03-12T20:00:00',
    duration: '1.5小时',
    instructor: {
      name: '李医生',
      title: '10年临床经验',
    },
    enrollmentMode: 'direct',
  },
  {
    id: 'public-case-discussion-2026',
    slug: 'public-case-discussion-2026',
    title: '复杂骨折病例公开讨论',
    description: '真实临床病例深度剖析，学习诊断思路与手术方案选择',
    stage: 'specialty-advanced',
    stageLabel: '专科进阶',
    courseType: 'case-study',
    courseTypeLabel: '病例讨论',
    pricingType: 'free-public',
    price: 0,
    audiences: ['1-3-years', '3-plus-years'],
    audienceLabel: '1-3年临床 / 3年以上',
    startTime: '2026-03-18T19:30:00',
    duration: '2小时',
    instructor: {
      name: '王医生',
      title: 'ACVS认证骨科专家',
    },
    enrollmentMode: 'direct',
  },
];

// ============================================================================
// 子组件
// ============================================================================

/** 公益免费徽章 */
const PublicCourseBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">
    <Gift className="w-3 h-3" />
    公益免费
  </span>
);

/** 课程类型图标 */
const CourseTypeIcon: React.FC<{ type: PublicCourseType }> = ({ type }) => {
  switch (type) {
    case 'open-class':
      return <Play className="w-4 h-4" />;
    case 'mentor-qa':
      return <MessageCircle className="w-4 h-4" />;
    case 'case-study':
      return <Target className="w-4 h-4" />;
    default:
      return <GraduationCap className="w-4 h-4" />;
  }
};

/** 阶段图标 */
const StageIcon: React.FC<{ stage: CourseStage }> = ({ stage }) => {
  switch (stage) {
    case 'certification':
      return <GraduationCap className="w-3.5 h-3.5" />;
    case 'clinical-basics':
      return <Stethoscope className="w-3.5 h-3.5" />;
    case 'specialty-advanced':
      return <Target className="w-3.5 h-3.5" />;
    default:
      return <GraduationCap className="w-3.5 h-3.5" />;
  }
};

/** 公益课卡片 */
const PublicCourseCard: React.FC<{
  course: PublicCourse;
  locale: string;
  onEnroll: (course: PublicCourse) => void;
}> = ({ course, locale, onEnroll }) => {
  // 格式化时间
  const startDate = new Date(course.startTime);
  const formattedDate = startDate.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = startDate.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      {/* 顶部标签区 */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <PublicCourseBadge />
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <CourseTypeIcon type={course.courseType} />
            <span>{course.courseTypeLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
            course.stage === 'certification' ? 'bg-blue-50 text-blue-700' :
            course.stage === 'clinical-basics' ? 'bg-emerald-50 text-emerald-700' :
            course.stage === 'specialty-advanced' ? 'bg-purple-50 text-purple-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            <StageIcon stage={course.stage} />
            {course.stageLabel}
          </span>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-4">
        <Link href={`/${locale}/courses/${course.slug}`}>
          <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-1">
            {course.title}
          </h3>
        </Link>
        <p className="text-sm text-slate-500 mb-3 line-clamp-2">
          {course.description}
        </p>

        {/* 适合人群 */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <Users className="w-3.5 h-3.5" />
          <span>适合：{course.audienceLabel}</span>
        </div>

        {/* 时间信息 */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate} {formattedTime}</span>
          </div>
          {course.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{course.duration}</span>
            </div>
          )}
        </div>

        {/* 讲师信息 */}
        {course.instructor && (
          <div className="text-xs text-slate-400 mb-4">
            讲师：{course.instructor.name}
            {course.instructor.title && ` · ${course.instructor.title}`}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEnroll(course)}
            className="flex-1 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors text-center"
          >
            立即报名
          </button>
          <button
            onClick={() => onEnroll(course)}
            className="px-3 py-2 text-emerald-600 text-sm font-medium hover:bg-emerald-50 rounded-lg transition-colors"
          >
            加入计划
          </button>
        </div>
      </div>
    </div>
  );
};

/** 公益课专区头部 */
const PublicCourseHeader: React.FC<{
  locale: string;
  currentStage: string;
}> = ({ locale, currentStage }) => {
  // 构建查看全部链接，保留当前阶段上下文
  const viewAllUrl = currentStage === 'all'
    ? `/${locale}/courses`
    : `/${locale}/courses?stage=${currentStage}`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Gift className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-900">本月公益公开课</h2>
        </div>
        <p className="text-sm text-slate-500">
          从低门槛公开课开始，先了解课程质量与成长方向，再进入更适合你的系统学习路径。
        </p>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Link
          href={viewAllUrl}
          className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
        >
          查看全部公益课
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href={`/${locale}/growth-system`}
          className="text-slate-500 hover:text-slate-700 font-medium"
        >
          了解学习路径
        </Link>
      </div>
    </div>
  );
};

/** 空状态组件 */
const PublicCourseEmptyState: React.FC<{ locale: string }> = ({ locale }) => (
  <div className="text-center py-8">
    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Sparkles className="w-6 h-6 text-emerald-600" />
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-2">本月公益公开课即将更新</h3>
    <p className="text-sm text-slate-500 mb-6">
      先查看成长体系，找到适合你的正式学习路径。
    </p>
    <div className="flex items-center justify-center gap-3">
      <Link
        href={`/${locale}/growth-system`}
        className="px-5 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors"
      >
        查看成长体系
      </Link>
      <Link
        href={`/${locale}/courses`}
        className="px-5 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors"
      >
        浏览课程中心
      </Link>
    </div>
  </div>
);

// ============================================================================
// 主组件
// ============================================================================

const PublicCourseSection: React.FC<PublicCourseSectionProps> = ({
  locale,
  currentStage,
  onEnroll,
}) => {
  // 获取公益课数据（实际项目中应从 API 获取）
  const publicCourses = SAMPLE_PUBLIC_COURSES;
  
  // 如果没有公益课，显示空状态
  if (publicCourses.length === 0) {
    return (
      <section className="py-6">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border border-emerald-100/50 rounded-2xl p-6">
            <PublicCourseEmptyState locale={locale} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border border-emerald-100/50 rounded-2xl p-6">
          {/* 头部 */}
          <PublicCourseHeader locale={locale} currentStage={currentStage} />
          
          {/* 卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicCourses.slice(0, 3).map((course) => (
              <PublicCourseCard
                key={course.id}
                course={course}
                locale={locale}
                onEnroll={onEnroll}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PublicCourseSection;
export type { PublicCourse, PublicCourseType, CourseStage };

'use client';

import { useState } from 'react';
import type { Course } from '@vetsphere/shared/types';

interface CourseManagementTabProps {
  courses: Course[];
  onAddCourse: () => void;
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  published: { bg: 'bg-green-500/20', text: 'text-green-400', label: '已发布' },
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '待审核' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: '已拒绝' },
  draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '草稿' },
};

export default function CourseManagementTab({
  courses,
  onAddCourse,
  onEditCourse,
  onDeleteCourse,
}: CourseManagementTabProps) {
  const [filter, setFilter] = useState<string>('all');

  const filteredCourses = filter === 'all'
    ? courses
    : courses.filter(c => c.status === filter);

  // 统计各状态数量
  const counts = {
    all: courses.length,
    draft: courses.filter(c => c.status === 'draft').length,
    pending: courses.filter(c => c.status === 'pending').length,
    published: courses.filter(c => c.status === 'published').length,
    rejected: courses.filter(c => c.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">课程管理</h1>
          <p className="text-gray-400 mt-1">管理您发布的所有课程</p>
        </div>
        <button onClick={onAddCourse} className="edu-button flex items-center gap-2">
          <span>➕</span>
          <span>发布新课程</span>
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: '全部' },
          { key: 'draft', label: '草稿' },
          { key: 'pending', label: '待审核' },
          { key: 'published', label: '已发布' },
          { key: 'rejected', label: '已拒绝' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === key
                ? 'bg-purple-600 text-white'
                : 'bg-purple-500/10 text-gray-400 hover:bg-purple-500/20'
            }`}
          >
            {label}
            {counts[key as keyof typeof counts] > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-white/10 rounded text-xs">
                {counts[key as keyof typeof counts]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-gray-400 mb-6">
            {filter === 'all' ? '您还没有创建任何课程' : `没有${STATUS_BADGES[filter]?.label || ''}的课程`}
          </p>
          <button onClick={onAddCourse} className="edu-button">
            创建第一门课程
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course) => {
            const status = STATUS_BADGES[course.status] || STATUS_BADGES.draft;
            return (
              <div key={course.id} className="edu-card overflow-hidden group">
                {/* Course Image */}
                <div className="aspect-video bg-purple-500/10 relative overflow-hidden">
                  {course.imageUrl ? (
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      📚
                    </div>
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>

                {/* Course Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1 line-clamp-1">
                    {course.title_zh || course.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {course.specialty} · {course.level}
                  </p>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-purple-400 font-medium">
                      {course.currency === 'CNY' ? '¥' : course.currency === 'USD' ? '$' : '฿'}
                      {course.price?.toLocaleString()}
                    </span>
                    <span className="text-gray-500">
                      {course.enrolledCount || 0}/{course.maxCapacity || 30} 学员
                    </span>
                  </div>

                  {/* Rejection Reason */}
                  {course.status === 'rejected' && course.rejectionReason && (
                    <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                      拒绝原因: {course.rejectionReason}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditCourse(course)}
                      className="flex-1 py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors"
                    >
                      {course.status === 'draft' || course.status === 'rejected' ? '编辑' : '查看'}
                    </button>
                    {(course.status === 'draft' || course.status === 'rejected') && (
                      <button
                        onClick={() => onDeleteCourse(course.id)}
                        className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

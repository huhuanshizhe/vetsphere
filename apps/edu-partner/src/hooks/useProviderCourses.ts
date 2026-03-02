'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { api } from '@vetsphere/shared/services/api';
import type { Course } from '@vetsphere/shared/types';

export interface UseProviderCoursesReturn {
  courses: Course[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProviderCourses(): UseProviderCoursesReturn {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.getProviderCourses(user.id);
      setCourses(data);
    } catch (err) {
      console.error('Failed to fetch provider courses:', err);
      setError('加载课程失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    courses,
    loading,
    error,
    refetch: fetchCourses,
  };
}

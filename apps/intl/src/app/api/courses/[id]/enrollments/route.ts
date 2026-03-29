import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@vetsphere/shared";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Query enrollment count from course_enrollments table
    const { count, error: countError } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .in('payment_status', ['paid', 'pending']);

    if (countError) {
      console.error('Error fetching enrollment count:', countError);
      // Fallback: return current_enrollment from course record
      const { data: course } = await supabase
        .from('courses')
        .select('current_enrollment, max_enrollment')
        .eq('id', courseId)
        .single();

      return NextResponse.json({
        courseId,
        enrolledCount: course?.current_enrollment ?? 0,
        maxCapacity: course?.max_enrollment ?? 30,
        seatsRemaining: (course?.max_enrollment ?? 30) - (course?.current_enrollment ?? 0),
      });
    }

    // Also fetch course capacity info
    const { data: course } = await supabase
      .from('courses')
      .select('max_enrollment, current_enrollment')
      .eq('id', courseId)
      .single();

    const enrolledCount = count ?? course?.current_enrollment ?? 0;
    const maxCapacity = course?.max_enrollment ?? 30;

    return NextResponse.json({
      courseId,
      enrolledCount,
      maxCapacity,
      seatsRemaining: Math.max(0, maxCapacity - enrolledCount),
    });

  } catch (error) {
    console.error('Enrollments API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

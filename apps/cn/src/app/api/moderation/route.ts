import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const dynamic = 'force-dynamic';

// Sensitive words list for auto-flagging (basic implementation)
const SENSITIVE_PATTERNS = [
  /\b(spam|scam|fraud)\b/i,
  /\b(illegal|banned|prohibited)\b/i,
  /https?:\/\/(?!vetsphere|youtube|unsplash|images\.unsplash)/i, // External links (except allowed)
  /\b(contact me|dm me|private message)\b/i,
  /\b(WeChat|WhatsApp|Telegram):\s*[a-zA-Z0-9]+/i // Social media contacts
];

// Check content for sensitive patterns
function checkContentForFlags(content: string): { flagged: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(content)) {
      reasons.push(`Matched pattern: ${pattern.source.substring(0, 30)}...`);
    }
  }
  
  return {
    flagged: reasons.length > 0,
    reasons
  };
}

// GET /api/moderation - List pending moderation items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const contentType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('content_moderation')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (contentType) {
      query = query.eq('content_type', contentType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch actual content for each item
    const enrichedData = await Promise.all(
      (data || []).map(async (item: any) => {
        let content = null;
        
        if (item.content_type === 'post') {
          const { data: post } = await supabaseAdmin
            .from('posts')
            .select('title, content, author_info')
            .eq('id', item.content_id)
            .single();
          content = post;
        } else if (item.content_type === 'comment') {
          const { data: comment } = await supabaseAdmin
            .from('post_comments')
            .select('content, author_name')
            .eq('id', item.content_id)
            .single();
          content = comment;
        }

        return { ...item, content };
      })
    );

    return NextResponse.json({ items: enrichedData, total: data?.length || 0 });

  } catch (error) {
    console.error('Moderation GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch moderation queue' }, { status: 500 });
  }
}

// POST /api/moderation - Submit content for moderation / Update status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, contentType, contentId, status, reason, reviewerId } = body;

    if (action === 'submit') {
      // Auto-check content
      let contentText = '';
      
      if (contentType === 'post') {
        const { data: post } = await supabaseAdmin
          .from('posts')
          .select('title, content')
          .eq('id', contentId)
          .single();
        contentText = `${post?.title || ''} ${post?.content || ''}`;
      } else if (contentType === 'comment') {
        const { data: comment } = await supabaseAdmin
          .from('post_comments')
          .select('content')
          .eq('id', contentId)
          .single();
        contentText = comment?.content || '';
      }

      const { flagged, reasons } = checkContentForFlags(contentText);

      // Create moderation record
      const { error } = await supabaseAdmin
        .from('content_moderation')
        .insert({
          content_type: contentType,
          content_id: contentId,
          status: flagged ? 'flagged' : 'pending',
          auto_flagged: flagged,
          auto_flag_reason: flagged ? reasons.join('; ') : null
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        autoFlagged: flagged,
        message: flagged ? 'Content flagged for review' : 'Content submitted for moderation'
      });

    } else if (action === 'review') {
      // Update moderation status
      const { error } = await supabaseAdmin
        .from('content_moderation')
        .update({
          status,
          reason,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString()
        })
        .eq('content_type', contentType)
        .eq('content_id', contentId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // If rejected, hide the content
      if (status === 'rejected') {
        if (contentType === 'post') {
          // Could update post status or soft delete
          // For now, just log it
          console.log(`[Moderation] Post ${contentId} rejected`);
        } else if (contentType === 'comment') {
          await supabaseAdmin
            .from('post_comments')
            .delete()
            .eq('id', contentId);
        }
      }

      return NextResponse.json({ success: true, message: `Content ${status}` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Moderation POST error:', error);
    return NextResponse.json({ error: 'Failed to process moderation' }, { status: 500 });
  }
}

// DELETE /api/moderation - Delete content (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('type');
    const contentId = searchParams.get('id');

    if (!contentType || !contentId) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }

    // Delete content based on type
    if (contentType === 'post') {
      await supabaseAdmin.from('posts').delete().eq('id', contentId);
    } else if (contentType === 'comment') {
      await supabaseAdmin.from('post_comments').delete().eq('id', contentId);
    }

    // Delete moderation record
    await supabaseAdmin
      .from('content_moderation')
      .delete()
      .eq('content_type', contentType)
      .eq('content_id', contentId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Moderation DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
}

/**
 * 字典 API
 * GET /api/dictionaries - 获取字典数据
 * GET /api/dictionaries/[code] - 获取指定字典的所有项
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 统一响应格式
function apiResponse<T>(code: number, message: string, data?: T) {
  return NextResponse.json({
    code,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 批量获取多个字典
    const codes = searchParams.get('codes'); // 逗号分隔的字典代码
    
    if (!codes) {
      // 返回所有字典列表（不含items）
      const { data: dictionaries, error } = await supabase
        .from('dictionaries')
        .select('id, code, name, description, is_system')
        .eq('is_active', true)
        .order('code');
      
      if (error) {
        console.error('查询字典列表失败:', error);
        return apiResponse(500, '查询失败');
      }
      
      return apiResponse(200, '查询成功', {
        dictionaries: dictionaries || [],
      });
    }

    // 批量获取指定字典及其项
    const codeList = codes.split(',').map(c => c.trim()).filter(Boolean);
    
    const { data: dictionaries, error } = await supabase
      .from('dictionaries')
      .select(`
        id,
        code,
        name,
        description,
        dictionary_items (
          id,
          code,
          label,
          label_en,
          value,
          description,
          display_order,
          is_active,
          extra_data
        )
      `)
      .in('code', codeList)
      .eq('is_active', true);

    if (error) {
      console.error('查询字典失败:', error);
      return apiResponse(500, '查询失败');
    }

    // 组织为 { code: items } 格式
    const result: Record<string, any[]> = {};
    (dictionaries || []).forEach(dict => {
      const items = (dict.dictionary_items || [])
        .filter((item: any) => item.is_active)
        .sort((a: any, b: any) => a.display_order - b.display_order);
      result[dict.code] = items;
    });

    return apiResponse(200, '查询成功', {
      dictionaries: result,
    });

  } catch (error) {
    console.error('字典API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

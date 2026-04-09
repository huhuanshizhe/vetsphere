/**
 * Excel Parse API
 * POST /api/admin/products/parse-excel
 *
 * Parse Excel file and return structured product data
 */

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '未提供文件' },
        { status: 400 }
      );
    }

    // Check file type
    const filename = file.name.toLowerCase();
    if (!filename.endsWith('.xlsx') && !filename.endsWith('.xls')) {
      return NextResponse.json(
        { error: '只支持 .xlsx 和 .xls 格式' },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: '', // Default value for empty cells
      raw: false, // Return formatted strings
    });

    console.log(`[Excel Parse] Parsed ${jsonData.length} rows from ${filename}`);

    return NextResponse.json({
      success: true,
      rows: jsonData,
      total: jsonData.length,
      sheetName,
    });

  } catch (error) {
    console.error('[Excel Parse] Error:', error);
    return NextResponse.json(
      { error: `解析失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
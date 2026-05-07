/**
 * Aliyun OSS Upload Utilities
 */

import OSS from 'ali-oss';

// Lazy-initialized OSS client to avoid build-time errors when env vars are missing
let _ossClient: OSS | null = null;

function getOSSClient(): OSS {
  if (!_ossClient) {
    _ossClient = new OSS({
      region: process.env.OSS_REGION || 'oss-cn-hangzhou',
      accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
      bucket: process.env.OSS_BUCKET || 'vertax',
      endpoint: process.env.OSS_ENDPOINT || 'https://oss-cn-hangzhou.aliyuncs.com',
    });
  }
  return _ossClient;
}

const OSS_PREFIX = 'vetsphere/products';

function getExtensionFromContentType(contentType: string): string {
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('gif')) return '.gif';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('svg')) return '.svg';
  return '.jpg';
}

function buildObjectPath(prefix: string, entityId: string, extension: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const safeExtension = extension.startsWith('.') ? extension : `.${extension}`;
  return `${prefix}/${entityId}_${timestamp}_${randomStr}${safeExtension}`;
}

export async function uploadBufferToOSS(
  buffer: Buffer,
  options: {
    entityId: string;
    contentType?: string;
    extension?: string;
    prefix?: string;
  },
): Promise<string> {
  const contentType = options.contentType || 'image/jpeg';
  const extension = options.extension || getExtensionFromContentType(contentType);
  const prefix = options.prefix || OSS_PREFIX;
  const ossPath = buildObjectPath(prefix, options.entityId, extension);

  const result = await getOSSClient().put(ossPath, buffer, {
    headers: {
      'Content-Type': contentType,
    },
  });

  console.log(`[OSS] Uploaded buffer: ${ossPath}`);
  return result.url;
}

/**
 * Download image from URL and upload to OSS
 * @param imageUrl Source image URL
 * @param productId Product ID for organizing files
 * @returns OSS URL of uploaded image
 */
export async function uploadImageToOSS(imageUrl: string, productId: string): Promise<string> {
  try {
    // Fetch image from source URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // Get image buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension from URL or content-type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    let extension = getExtensionFromContentType(contentType);

    // Also try to get extension from URL
    const urlPath = imageUrl.split('?')[0];
    const urlExt = urlPath.substring(urlPath.lastIndexOf('.'));
    if (urlExt && urlExt.length <= 5 && urlExt.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      extension = urlExt;
    }

    // Generate OSS path
    return uploadBufferToOSS(buffer, {
      entityId: productId,
      contentType,
      extension,
      prefix: OSS_PREFIX,
    });
  } catch (error) {
    console.error(`[OSS] Upload failed for ${imageUrl}:`, error);
    throw error;
  }
}

/**
 * Upload multiple images to OSS
 * @param imageUrls Array of source image URLs
 * @param productId Product ID for organizing files
 * @returns Array of OSS URLs (empty string for failed uploads)
 */
export async function uploadMultipleImages(
  imageUrls: string[],
  productId: string,
): Promise<string[]> {
  const results: string[] = [];

  for (const url of imageUrls) {
    if (!url || url.trim() === '') {
      results.push('');
      continue;
    }

    try {
      const ossUrl = await uploadImageToOSS(url.trim(), productId);
      results.push(ossUrl);
    } catch (error) {
      console.error(`[OSS] Failed to upload ${url}:`, error);
      console.warn(`[OSS] Falling back to original URL: ${url}`);
      results.push(url.trim()); // Fallback to original URL instead of empty string
    }
  }

  return results;
}

/**
 * Check if OSS is configured
 */
export function isOSSConfigured(): boolean {
  return !!(
    process.env.OSS_ACCESS_KEY_ID &&
    process.env.OSS_ACCESS_KEY_SECRET &&
    process.env.OSS_BUCKET
  );
}

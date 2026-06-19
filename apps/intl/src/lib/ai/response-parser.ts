export interface ChatAction {
  type: 'lead_form' | 'product_card' | 'course_card';
  data?: Record<string, unknown>;
}

export interface ParsedResponse {
  displayContent: string;
  actions: ChatAction[];
  productRefs: string[];
  courseRefs: string[];
}

/**
 * Parse AI response and extract action markers
 */
export function parseAIResponse(raw: string): ParsedResponse {
  const actions: ChatAction[] = [];
  const productRefs: string[] = [];
  const courseRefs: string[] = [];

  let displayContent = raw;

  // Parse [LEAD_FORM] marker
  const leadFormRegex = /\[LEAD_FORM\]/g;
  if (leadFormRegex.test(displayContent)) {
    actions.push({ type: 'lead_form' });
    displayContent = displayContent.replace(leadFormRegex, '').trim();
  }

  // Parse [PRODUCT:id] markers
  const productRegex = /\[PRODUCT:([^\]]+)\]/g;
  let match;
  while ((match = productRegex.exec(raw)) !== null) {
    const productId = match[1].trim();
    productRefs.push(productId);
    actions.push({
      type: 'product_card',
      data: { productId },
    });
  }
  displayContent = displayContent.replace(productRegex, '').trim();

  // Parse [COURSE:id] markers
  const courseRegex = /\[COURSE:([^\]]+)\]/g;
  while ((match = courseRegex.exec(raw)) !== null) {
    const courseId = match[1].trim();
    courseRefs.push(courseId);
    actions.push({
      type: 'course_card',
      data: { courseId },
    });
  }
  displayContent = displayContent.replace(courseRegex, '').trim();

  // Clean up multiple newlines
  displayContent = displayContent.replace(/\n{3,}/g, '\n\n').trim();

  return {
    displayContent,
    actions,
    productRefs,
    courseRefs,
  };
}

/**
 * Validate and sanitize AI response
 */
export function validateResponse(content: string): string {
  // Remove any potential prompt injection attempts
  // Use [\s\S] instead of . with 's' flag for ES2017 compatibility
  let sanitized = content
    .replace(/```(json|javascript|python)/gi, '```')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');

  // Ensure reasonable length
  if (sanitized.length > 5000) {
    sanitized = sanitized.slice(0, 5000) + '\n\n[Response truncated for brevity]';
  }

  return sanitized;
}

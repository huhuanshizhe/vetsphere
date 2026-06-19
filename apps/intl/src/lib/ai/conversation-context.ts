import type { SupabaseClient } from '@supabase/supabase-js';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ConversationContext {
  systemPrompt: string;
  messages: ChatMessage[];
}

const MAX_HISTORY_MESSAGES = 20;
const SUMMARY_THRESHOLD = 25;

/**
 * Build conversation messages with sliding window context management
 */
export async function buildConversationMessages(
  supabase: SupabaseClient,
  sessionId: string,
  newMessage: string,
  systemPrompt: string,
): Promise<ConversationContext> {
  // 1. Fetch message history
  const { data: history, error } = await supabase
    .from('ai_conversation_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(100); // Safety limit

  if (error) {
    console.error('Failed to fetch conversation history:', error);
    return {
      systemPrompt,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: newMessage },
      ],
    };
  }

  const messages = history || [];

  // 2. Sliding window: keep only recent messages
  if (messages.length <= MAX_HISTORY_MESSAGES) {
    return {
      systemPrompt,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
        { role: 'user', content: newMessage },
      ],
    };
  }

  // 3. If history exceeds threshold, summarize older messages
  if (messages.length > SUMMARY_THRESHOLD) {
    const olderMessages = messages.slice(0, -MAX_HISTORY_MESSAGES);
    const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);

    // Create summary of older conversation
    const summary = createMessageSummary(olderMessages);

    return {
      systemPrompt,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'system',
          content: `[Earlier Conversation Summary]\n${summary}\n[End of Summary - Recent messages follow]`,
        },
        ...recentMessages,
        { role: 'user', content: newMessage },
      ],
    };
  }

  // 4. Return messages within window
  return {
    systemPrompt,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
      { role: 'user', content: newMessage },
    ],
  };
}

/**
 * Create a concise summary of conversation history
 */
function createMessageSummary(messages: ChatMessage[]): string {
  if (messages.length === 0) return '';

  const userMessages = messages.filter((m) => m.role === 'user');
  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  const topics = new Set<string>();

  // Extract key topics from user messages
  userMessages.forEach((msg) => {
    const content = msg.content.toLowerCase();
    if (content.includes('tplo')) topics.add('TPLO equipment');
    if (content.includes('ortho') || content.includes('orthopedic'))
      topics.add('orthopedic surgery');
    if (content.includes('microscope') || content.includes('loupes'))
      topics.add('magnification equipment');
    if (content.includes('training') || content.includes('course')) topics.add('training programs');
    if (content.includes('price') || content.includes('cost')) topics.add('pricing');
    if (content.includes('hospital') || content.includes('clinic')) topics.add('clinic setup');
  });

  let summary = `Conversation covered ${messages.length} messages spanning ${topics.size} topics: `;
  summary += Array.from(topics).join(', ') || 'general inquiry';
  summary += '. ';

  if (userMessages.length > 0) {
    const lastUser = userMessages[userMessages.length - 1];
    summary += `Most recent visitor concern: "${lastUser.content.slice(0, 100)}..."`;
  }

  return summary;
}

/**
 * Update session metadata with current context
 */
export async function updateSessionContext(
  supabase: SupabaseClient,
  sessionId: string,
  updates: {
    sourcePage?: string;
    sourceProducts?: string[];
    messageCount?: number;
  },
): Promise<void> {
  const { error } = await supabase
    .from('ai_conversation_sessions')
    .update({
      ...(updates.sourcePage && { source_page: updates.sourcePage }),
      ...(updates.sourceProducts && { source_products: updates.sourceProducts }),
      ...(updates.messageCount !== undefined && { message_count: updates.messageCount }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Failed to update session context:', error);
  }
}

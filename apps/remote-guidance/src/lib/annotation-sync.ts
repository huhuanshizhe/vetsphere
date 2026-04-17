// 标注同步系统 - 使用 LiveKit DataChannel 实现实时标注同步
// @ts-nocheck

import { Room, DataPacket_Kind } from 'livekit-client';

// 标注类型定义
export type AnnotationType = 'line' | 'arrow' | 'text' | 'circle' | 'rectangle' | 'instrument';

export type Annotation = {
  id: string;
  type: AnnotationType;
  sessionId: string;
  createdBy: string;
  createdByRole: string;
  createdAt: string;
  
  // 位置（相对于视频画面的百分比）
  x: number;  // 0-100
  y: number;  // 0-100
  
  // 类型特定数据
  endX?: number;  // 线条终点
  endY?: number;
  text?: string;  // 文字内容
  radius?: number;  // 圆圈半径
  width?: number;   // 矩形宽度
  height?: number;  // 矩形高度
  instrumentType?: 'scalpel' | 'clamp' | 'drill' | 'needle' | 'suction';
  
  // 样式
  color: string;
  strokeWidth?: number;
  
  // 持续时间（可选）
  duration?: number;  // 毫秒，0表示永久
  
  // 状态
  visible: boolean;
};

// DataChannel 消息类型
type AnnotationMessage = {
  type: 'annotation_add' | 'annotation_update' | 'annotation_delete' | 'annotation_clear' | 'emergency_help' | 'pause_request';
  annotation?: Annotation;
  annotationId?: string;
  sessionId?: string;
  senderId?: string;
  senderRole?: string;
  timestamp?: string;
};

const ANNOTATION_TOPIC = 'guidance_annotation';

// 标注同步类
export class AnnotationSync {
  private room: Room;
  private sessionId: string;
  private userId: string;
  private userRole: string;
  private annotations: Map<string, Annotation> = new Map();
  private onAnnotationReceived?: (annotation: Annotation) => void;
  private onAnnotationDeleted?: (annotationId: string) => void;
  private onAnnotationsClear?: () => void;
  private onEmergencyHelp?: (senderId: string, senderRole: string) => void;
  private onPauseRequest?: (senderId: string, senderRole: string) => void;

  constructor(
    room: Room,
    sessionId: string,
    userId: string,
    userRole: string
  ) {
    this.room = room;
    this.sessionId = sessionId;
    this.userId = userId;
    this.userRole = userRole;
    this.setupDataChannel();
  }

  // 设置回调
  setCallbacks(callbacks: {
    onAnnotationReceived?: (annotation: Annotation) => void;
    onAnnotationDeleted?: (annotationId: string) => void;
    onAnnotationsClear?: () => void;
    onEmergencyHelp?: (senderId: string, senderRole: string) => void;
    onPauseRequest?: (senderId: string, senderRole: string) => void;
  }) {
    this.onAnnotationReceived = callbacks.onAnnotationReceived;
    this.onAnnotationDeleted = callbacks.onAnnotationDeleted;
    this.onAnnotationsClear = callbacks.onAnnotationsClear;
    this.onEmergencyHelp = callbacks.onEmergencyHelp;
    this.onPauseRequest = callbacks.onPauseRequest;
  }

  // 设置 DataChannel 监听
  private setupDataChannel() {
    this.room.on('data-received', (payload, participant) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload.data)) as AnnotationMessage;
        
        if (data.sessionId !== this.sessionId) {
          return; // 忽略其他会话的消息
        }

        this.handleMessage(data, participant);
      } catch (error) {
        console.error('Failed to parse annotation message:', error);
      }
    });
  }

  // 处理接收到的消息
  private handleMessage(message: AnnotationMessage, participant: LocalParticipant | RemoteParticipant) {
    switch (message.type) {
      case 'annotation_add':
        if (message.annotation) {
          this.annotations.set(message.annotation.id, message.annotation);
          this.onAnnotationReceived?.(message.annotation);
        }
        break;
      
      case 'annotation_update':
        if (message.annotation) {
          this.annotations.set(message.annotation.id, message.annotation);
          this.onAnnotationReceived?.(message.annotation);
        }
        break;
      
      case 'annotation_delete':
        if (message.annotationId) {
          this.annotations.delete(message.annotationId);
          this.onAnnotationDeleted?.(message.annotationId);
        }
        break;
      
      case 'annotation_clear':
        this.annotations.clear();
        this.onAnnotationsClear?.();
        break;
      
      case 'emergency_help':
        if (message.senderId && message.senderRole) {
          this.onEmergencyHelp?.(message.senderId, message.senderRole);
        }
        break;
      
      case 'pause_request':
        if (message.senderId && message.senderRole) {
          this.onPauseRequest?.(message.senderId, message.senderRole);
        }
        break;
    }
  }

  // 发送标注
  sendAnnotation(annotation: Annotation) {
    const message: AnnotationMessage = {
      type: 'annotation_add',
      annotation,
      sessionId: this.sessionId,
      senderId: this.userId,
      senderRole: this.userRole,
      timestamp: new Date().toISOString(),
    };

    this.broadcastMessage(message);
    this.annotations.set(annotation.id, annotation);
  }

  // 更新标注
  updateAnnotation(annotation: Annotation) {
    const message: AnnotationMessage = {
      type: 'annotation_update',
      annotation,
      sessionId: this.sessionId,
      senderId: this.userId,
      senderRole: this.userRole,
      timestamp: new Date().toISOString(),
    };

    this.broadcastMessage(message);
    this.annotations.set(annotation.id, annotation);
  }

  // 删除标注
  deleteAnnotation(annotationId: string) {
    const message: AnnotationMessage = {
      type: 'annotation_delete',
      annotationId,
      sessionId: this.sessionId,
      senderId: this.userId,
      senderRole: this.userRole,
      timestamp: new Date().toISOString(),
    };

    this.broadcastMessage(message);
    this.annotations.delete(annotationId);
  }

  // 清除所有标注
  clearAnnotations() {
    const message: AnnotationMessage = {
      type: 'annotation_clear',
      sessionId: this.sessionId,
      senderId: this.userId,
      senderRole: this.userRole,
      timestamp: new Date().toISOString(),
    };

    this.broadcastMessage(message);
    this.annotations.clear();
  }

  // 发送紧急求助
  sendEmergencyHelp() {
    const message: AnnotationMessage = {
      type: 'emergency_help',
      sessionId: this.sessionId,
      senderId: this.userId,
      senderRole: this.userRole,
      timestamp: new Date().toISOString(),
    };

    this.broadcastMessage(message);
  }

  // 发送暂停请求
  sendPauseRequest() {
    const message: AnnotationMessage = {
      type: 'pause_request',
      sessionId: this.sessionId,
      senderId: this.userId,
      senderRole: this.userRole,
      timestamp: new Date().toISOString(),
    };

    this.broadcastMessage(message);
  }

  // 广播消息
  private broadcastMessage(message: AnnotationMessage) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));

    this.room.localParticipant.publishData(
      data,
      DataPacket_Kind.RELIABLE,
      { topic: ANNOTATION_TOPIC }
    );
  }

  // 获取所有标注
  getAnnotations(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  // 创建新标注
  createAnnotation(
    type: AnnotationType,
    x: number,
    y: number,
    color: string,
    options?: Partial<Annotation>
  ): Annotation {
    const annotation: Annotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      sessionId: this.sessionId,
      createdBy: this.userId,
      createdByRole: this.userRole,
      createdAt: new Date().toISOString(),
      x,
      y,
      color,
      visible: true,
      ...options,
    };

    return annotation;
  }
}

// 标注渲染辅助函数
export function renderAnnotationSVG(annotation: Annotation): string {
  const { type, x, y, color, endX, endY, text, radius, width, height } = annotation;

  switch (type) {
    case 'arrow':
      const arrowEndX = endX ?? x + 10;
      const arrowEndY = endY ?? y;
      return `
        <svg viewBox="0 0 100 100" style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);width:40px;height:40px;">
          <line x1="10" y1="50" x2="80" y2="50" stroke="${color}" stroke-width="3" />
          <polygon points="80,40 80,60 95,50" fill="${color}" />
        </svg>
      `;
    
    case 'line':
      const lineEndX = endX ?? x + 10;
      const lineEndY = endY ?? y;
      const dx = lineEndX - x;
      const dy = lineEndY - y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return `
        <div style="position:absolute;left:${x}%;top:${y}%;width:${length}%;height:3px;background:${color};transform-origin:left center;transform:rotate(${angle}deg);"></div>
      `;
    
    case 'circle':
      const circleRadius = radius ?? 5;
      return `
        <div style="position:absolute;left:${x}%;top:${y}%;width:${circleRadius * 2}%;height:${circleRadius * 2}%;border:3px solid ${color};border-radius:50%;transform:translate(-50%,-50%);"></div>
      `;
    
    case 'rectangle':
      const rectWidth = width ?? 10;
      const rectHeight = height ?? 10;
      return `
        <div style="position:absolute;left:${x}%;top:${y}%;width:${rectWidth}%;height:${rectHeight}%;border:3px solid ${color};transform:translate(-50%,-50%);"></div>
      `;
    
    case 'text':
      return `
        <div style="position:absolute;left:${x}%;top:${y}%;color:${color};font-size:14px;font-weight:600;transform:translate(0,-50%);white-space:nowrap;">${text ?? ''}</div>
      `;
    
    case 'instrument':
      const instrumentIcons: Record<string, string> = {
        scalpel: '🔪',
        clamp: '🔗',
        drill: '⚙️',
        needle: '🪡',
        suction: '💧',
      };
      const instrumentType = annotation.instrumentType ?? 'scalpel';
      return `
        <div style="position:absolute;left:${x}%;top:${y}%;font-size:32px;transform:translate(-50%,-50%);">${instrumentIcons[instrumentType] ?? '🔧'}</div>
      `;
    
    default:
      return '';
  }
}

// 标注存储到数据库
export async function saveAnnotationToDatabase(annotation: Annotation, supabase: any) {
  await supabase.from('guidance_annotations').insert({
    id: annotation.id,
    session_id: annotation.sessionId,
    created_by: annotation.createdBy,
    created_by_role: annotation.createdByRole,
    annotation_type: annotation.type,
    position_x: annotation.x,
    position_y: annotation.y,
    end_x: annotation.endX,
    end_y: annotation.endY,
    text_content: annotation.text,
    radius: annotation.radius,
    width: annotation.width,
    height: annotation.height,
    instrument_type: annotation.instrumentType,
    color: annotation.color,
    stroke_width: annotation.strokeWidth,
    duration_ms: annotation.duration,
    visible: annotation.visible,
    created_at: annotation.createdAt,
  });
}

// 从数据库加载标注
export async function loadAnnotationsFromDatabase(sessionId: string, supabase: any): Promise<Annotation[]> {
  const { data, error } = await supabase
    .from('guidance_annotations')
    .select('*')
    .eq('session_id', sessionId)
    .eq('visible', true)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map(row => ({
    id: row.id,
    type: row.annotation_type as AnnotationType,
    sessionId: row.session_id,
    createdBy: row.created_by,
    createdByRole: row.created_by_role,
    createdAt: row.created_at,
    x: row.position_x,
    y: row.position_y,
    endX: row.end_x,
    endY: row.end_y,
    text: row.text_content,
    radius: row.radius,
    width: row.width,
    height: row.height,
    instrumentType: row.instrument_type,
    color: row.color,
    strokeWidth: row.stroke_width,
    duration: row.duration_ms,
    visible: row.visible,
  }));
}
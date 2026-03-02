'use client';

import { useCallback, useEffect, useMemo } from 'react';

interface AgendaItem {
  day: string;
  date: string;
  items: { time: string; activity: string }[];
}

interface AgendaEditorProps {
  value: AgendaItem[];
  onChange: (agenda: AgendaItem[]) => void;
  startDate?: string;  // 课程开始日期
  endDate?: string;    // 课程结束日期
  disabled?: boolean;
}

// 预定义时间选项（30分钟间隔）
const TIME_OPTIONS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', 
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

// 快捷时间段
const QUICK_TIME_RANGES = [
  { label: '上午', start: '09:00', end: '12:00' },
  { label: '下午', start: '13:00', end: '17:00' },
  { label: '全天', start: '09:00', end: '17:00' },
];

// 格式化日期为中文显示
function formatDateChinese(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${month}月${day}日 ${weekdays[date.getDay()]}`;
}

// 计算日期范围内的所有日期
function getDateRange(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate) return [];
  
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // 防止无效日期范围
  if (start > end) return [];
  
  // 限制最多30天
  const maxDays = 30;
  let currentDate = new Date(start);
  let count = 0;
  
  while (currentDate <= end && count < maxDays) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
    count++;
  }
  
  return dates;
}

// 时间段选择组件
function TimeRangeSelector({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  disabled,
}: {
  startTime: string;
  endTime: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  disabled?: boolean;
}) {
  // 获取可选的结束时间（必须晚于开始时间）
  const availableEndTimes = useMemo(() => {
    const startIdx = TIME_OPTIONS.indexOf(startTime);
    return TIME_OPTIONS.filter((_, idx) => idx > startIdx);
  }, [startTime]);

  const selectClass = `
    px-3 py-2.5 rounded-lg bg-[#1A1025] border border-purple-500/30 
    text-white text-sm font-medium cursor-pointer
    focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none
    transition-all hover:border-purple-500/50
    [&>option]:bg-[#1A1025] [&>option]:text-white [&>option]:py-1
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={startTime}
        onChange={e => {
          const newStart = e.target.value;
          onStartChange(newStart);
          // 如果结束时间不再有效，自动调整
          const startIdx = TIME_OPTIONS.indexOf(newStart);
          const endIdx = TIME_OPTIONS.indexOf(endTime);
          if (endIdx <= startIdx) {
            const newEndIdx = Math.min(startIdx + 2, TIME_OPTIONS.length - 1);
            onEndChange(TIME_OPTIONS[newEndIdx]);
          }
        }}
        className={selectClass}
        disabled={disabled}
      >
        {TIME_OPTIONS.slice(0, -1).map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <span className="text-purple-400 font-bold px-1">~</span>
      <select
        value={endTime}
        onChange={e => onEndChange(e.target.value)}
        className={selectClass}
        disabled={disabled}
      >
        {availableEndTimes.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}

export default function AgendaEditor({
  value = [],
  onChange,
  startDate,
  endDate,
  disabled = false,
}: AgendaEditorProps) {
  
  // 根据日期范围自动生成/更新日程
  useEffect(() => {
    if (!startDate || !endDate) return;
    
    const dates = getDateRange(startDate, endDate);
    if (dates.length === 0) return;
    
    // 检查是否需要更新
    const currentDates = value.map(d => d.date);
    const needsUpdate = dates.length !== value.length || 
      !dates.every((d, i) => d === currentDates[i]);
    
    if (needsUpdate) {
      // 保留已有的活动内容，按日期匹配
      const existingByDate = new Map(value.map(d => [d.date, d]));
      
      const newAgenda: AgendaItem[] = dates.map((date, index) => {
        const existing = existingByDate.get(date);
        if (existing) {
          return { ...existing, day: `Day ${index + 1}` };
        }
        return {
          day: `Day ${index + 1}`,
          date,
          items: [{ time: '09:00-12:00', activity: '' }],
        };
      });
      
      onChange(newAgenda);
    }
  }, [startDate, endDate, value, onChange]);

  // 更新活动项的时间
  const updateItemTime = useCallback((
    dayIndex: number,
    itemIndex: number,
    start: string,
    end: string
  ) => {
    const newAgenda = [...value];
    const items = [...newAgenda[dayIndex].items];
    items[itemIndex] = { ...items[itemIndex], time: `${start}-${end}` };
    newAgenda[dayIndex] = { ...newAgenda[dayIndex], items };
    onChange(newAgenda);
  }, [value, onChange]);

  // 更新活动项的内容
  const updateItemActivity = useCallback((
    dayIndex: number,
    itemIndex: number,
    activity: string
  ) => {
    const newAgenda = [...value];
    const items = [...newAgenda[dayIndex].items];
    items[itemIndex] = { ...items[itemIndex], activity };
    newAgenda[dayIndex] = { ...newAgenda[dayIndex], items };
    onChange(newAgenda);
  }, [value, onChange]);

  // 添加活动项
  const addItem = useCallback((dayIndex: number) => {
    const newAgenda = [...value];
    const lastItem = newAgenda[dayIndex].items[newAgenda[dayIndex].items.length - 1];
    
    // 解析最后一个活动的结束时间作为新活动的开始时间
    let newStart = '13:00';
    let newEnd = '17:00';
    
    if (lastItem?.time?.includes('-')) {
      const [, lastEnd] = lastItem.time.split('-');
      const lastEndIdx = TIME_OPTIONS.indexOf(lastEnd);
      if (lastEndIdx >= 0 && lastEndIdx < TIME_OPTIONS.length - 2) {
        newStart = lastEnd;
        newEnd = TIME_OPTIONS[Math.min(lastEndIdx + 4, TIME_OPTIONS.length - 1)];
      }
    }
    
    newAgenda[dayIndex] = {
      ...newAgenda[dayIndex],
      items: [...newAgenda[dayIndex].items, { time: `${newStart}-${newEnd}`, activity: '' }],
    };
    onChange(newAgenda);
  }, [value, onChange]);

  // 删除活动项
  const removeItem = useCallback((dayIndex: number, itemIndex: number) => {
    const newAgenda = [...value];
    newAgenda[dayIndex] = {
      ...newAgenda[dayIndex],
      items: newAgenda[dayIndex].items.filter((_, i) => i !== itemIndex),
    };
    onChange(newAgenda);
  }, [value, onChange]);

  // 应用快捷时间段
  const applyQuickTime = useCallback((dayIndex: number, itemIndex: number, start: string, end: string) => {
    updateItemTime(dayIndex, itemIndex, start, end);
  }, [updateItemTime]);

  // 解析时间字符串
  const parseTime = (timeStr: string): { start: string; end: string } => {
    if (!timeStr || !timeStr.includes('-')) {
      return { start: '09:00', end: '12:00' };
    }
    const [start, end] = timeStr.split('-');
    return { 
      start: TIME_OPTIONS.includes(start) ? start : '09:00',
      end: TIME_OPTIONS.includes(end) ? end : '12:00'
    };
  };

  // 没有选择日期时的提示
  if (!startDate || !endDate) {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-300">课程日程</label>
        <div className="text-center py-10 text-gray-500 border-2 border-dashed border-purple-500/20 rounded-xl bg-purple-500/5">
          <span className="text-4xl mb-3 block">📅</span>
          <p>请先在上方选择开课日期和结课日期</p>
          <p className="text-xs text-gray-600 mt-2">日程将根据所选日期自动生成</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          课程日程
          <span className="text-xs text-purple-400 ml-2">
            (共 {value.length} 天)
          </span>
        </label>
      </div>

      <div className="space-y-4">
        {value.map((day, dayIndex) => (
          <div
            key={dayIndex}
            className="border border-purple-500/20 rounded-xl overflow-hidden bg-gradient-to-b from-purple-500/10 to-transparent"
          >
            {/* Day 标题行 */}
            <div className="flex items-center gap-3 p-4 bg-purple-500/10 border-b border-purple-500/20">
              <div className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-purple-500/20">
                <span>📆</span>
                <span>{day.day}</span>
              </div>
              <div className="text-white font-medium">
                {formatDateChinese(day.date)}
              </div>
            </div>

            {/* 活动列表 */}
            <div className="p-4 space-y-3">
              {day.items.map((item, itemIndex) => {
                const { start, end } = parseTime(item.time);
                
                return (
                  <div key={itemIndex} className="flex flex-wrap items-start gap-3 p-3 bg-black/20 rounded-xl">
                    {/* 时间段选择 */}
                    <div className="space-y-2">
                      <TimeRangeSelector
                        startTime={start}
                        endTime={end}
                        onStartChange={newStart => updateItemTime(dayIndex, itemIndex, newStart, end)}
                        onEndChange={newEnd => updateItemTime(dayIndex, itemIndex, start, newEnd)}
                        disabled={disabled}
                      />
                      {/* 快捷按钮 */}
                      <div className="flex gap-1">
                        {QUICK_TIME_RANGES.map(({ label, start: qStart, end: qEnd }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => applyQuickTime(dayIndex, itemIndex, qStart, qEnd)}
                            disabled={disabled}
                            className={`px-2.5 py-1 text-xs rounded-md transition-all disabled:opacity-50 ${
                              start === qStart && end === qEnd
                                ? 'bg-purple-600 text-white'
                                : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* 活动内容 */}
                    <div className="flex-1 min-w-[200px]">
                      <input
                        type="text"
                        value={item.activity}
                        onChange={e => updateItemActivity(dayIndex, itemIndex, e.target.value)}
                        placeholder="活动内容描述..."
                        className="w-full px-4 py-2.5 rounded-lg bg-[#1A1025] border border-purple-500/30 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder-gray-500"
                        disabled={disabled}
                      />
                    </div>
                    
                    {/* 删除按钮 */}
                    {day.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(dayIndex, itemIndex)}
                        disabled={disabled}
                        className="w-9 h-9 flex items-center justify-center bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 shrink-0"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 添加活动按钮 */}
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => addItem(dayIndex)}
                disabled={disabled}
                className="w-full py-2 border-2 border-dashed border-purple-500/30 text-purple-400 rounded-lg hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors text-sm disabled:opacity-50"
              >
                + 添加时间段
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

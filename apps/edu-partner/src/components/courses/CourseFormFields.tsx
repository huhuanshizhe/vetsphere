'use client';

import { useEffect, useMemo } from 'react';
import type { CourseFormData } from '@/hooks/useCourseForm';
import { Specialty } from '@vetsphere/shared/types';

interface InstructorData {
  name?: string;
  imageUrl?: string;
  title?: string;
  credentials?: string[];
  bio?: string;
}

interface LocationData {
  country?: string;
  region?: string;
  city?: string;
  venue?: string;
  address?: string;
}

interface CourseFormFieldsProps {
  formData: CourseFormData;
  errors: Record<string, string>;
  onUpdate: (field: string, value: unknown) => void;
  onUpdateNested: (path: string, value: unknown) => void;
  fieldGroup: 'basic' | 'details' | 'instructor' | 'schedule';
  disabled?: boolean;
}

const SPECIALTIES = [
  { value: Specialty.ORTHOPEDICS, label: '骨科 Orthopedics' },
  { value: Specialty.NEUROSURGERY, label: '神经外科 Neurosurgery' },
  { value: Specialty.SOFT_TISSUE, label: '软组织外科 Soft Tissue' },
  { value: Specialty.EYE_SURGERY, label: '眼科手术 Eye Surgery' },
  { value: Specialty.EXOTICS, label: '异宠 Exotics' },
  { value: Specialty.ULTRASOUND, label: '超声 Ultrasound' },
];

const LEVELS = [
  { value: 'Basic', label: '基础 Basic' },
  { value: 'Intermediate', label: '进阶 Intermediate' },
  { value: 'Advanced', label: '高级 Advanced' },
  { value: 'Master', label: '大师 Master' },
];

const PUBLISH_LANGUAGES = [
  { value: 'zh', label: '中文', currency: 'CNY' },
  { value: 'en', label: 'English', currency: 'USD' },
  { value: 'ja', label: '日本語', currency: 'JPY' },
  { value: 'th', label: 'ภาษาไทย', currency: 'THB' },
];

const TEACHING_LANGUAGES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'th', label: 'ภาษาไทย' },
];

const CURRENCIES = [
  { value: 'CNY', label: '¥ 人民币' },
  { value: 'USD', label: '$ 美元' },
  { value: 'JPY', label: '¥ 日元' },
  { value: 'THB', label: '฿ 泰铢' },
];

const COURSE_FORMATS = [
  { value: 'offline', label: '线下课程', icon: '🏫' },
  { value: 'video', label: '视频课程', icon: '🎬' },
  { value: 'live', label: '直播课程', icon: '📡' },
  { value: 'article', label: '图文课程', icon: '📝' },
  { value: 'series', label: '系列课程', icon: '📚' },
];

const COUNTRIES = [
  { value: 'CN', label: '中国 China', flag: '🇨🇳' },
  { value: 'US', label: '美国 United States', flag: '🇺🇸' },
  { value: 'JP', label: '日本 Japan', flag: '🇯🇵' },
  { value: 'TH', label: '泰国 Thailand', flag: '🇹🇭' },
  { value: 'KR', label: '韩国 South Korea', flag: '🇰🇷' },
  { value: 'SG', label: '新加坡 Singapore', flag: '🇸🇬' },
  { value: 'AU', label: '澳大利亚 Australia', flag: '🇦🇺' },
  { value: 'GB', label: '英国 United Kingdom', flag: '🇬🇧' },
  { value: 'DE', label: '德国 Germany', flag: '🇩🇪' },
  { value: 'FR', label: '法国 France', flag: '🇫🇷' },
  { value: 'IT', label: '意大利 Italy', flag: '🇮🇹' },
  { value: 'ES', label: '西班牙 Spain', flag: '🇪🇸' },
  { value: 'NL', label: '荷兰 Netherlands', flag: '🇳🇱' },
  { value: 'CA', label: '加拿大 Canada', flag: '🇨🇦' },
  { value: 'MY', label: '马来西亚 Malaysia', flag: '🇲🇾' },
  { value: 'VN', label: '越南 Vietnam', flag: '🇻🇳' },
  { value: 'ID', label: '印度尼西亚 Indonesia', flag: '🇮🇩' },
  { value: 'PH', label: '菲律宾 Philippines', flag: '🇵🇭' },
  { value: 'IN', label: '印度 India', flag: '🇮🇳' },
  { value: 'AE', label: '阿联酋 UAE', flag: '🇦🇪' },
];

// 省/州数据
const REGIONS: Record<string, { value: string; label: string }[]> = {
  CN: [
    { value: 'beijing', label: '北京市' },
    { value: 'shanghai', label: '上海市' },
    { value: 'guangdong', label: '广东省' },
    { value: 'jiangsu', label: '江苏省' },
    { value: 'zhejiang', label: '浙江省' },
    { value: 'sichuan', label: '四川省' },
    { value: 'shandong', label: '山东省' },
    { value: 'hubei', label: '湖北省' },
    { value: 'henan', label: '河南省' },
    { value: 'fujian', label: '福建省' },
    { value: 'hunan', label: '湖南省' },
    { value: 'anhui', label: '安徽省' },
    { value: 'liaoning', label: '辽宁省' },
    { value: 'shaanxi', label: '陕西省' },
    { value: 'tianjin', label: '天津市' },
    { value: 'chongqing', label: '重庆市' },
    { value: 'jilin', label: '吉林省' },
    { value: 'heilongjiang', label: '黑龙江省' },
    { value: 'yunnan', label: '云南省' },
    { value: 'guangxi', label: '广西壮族自治区' },
    { value: 'taiwan', label: '台湾省' },
    { value: 'hongkong', label: '香港特别行政区' },
    { value: 'macau', label: '澳门特别行政区' },
  ],
  US: [
    { value: 'CA', label: 'California' },
    { value: 'NY', label: 'New York' },
    { value: 'TX', label: 'Texas' },
    { value: 'FL', label: 'Florida' },
    { value: 'IL', label: 'Illinois' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'OH', label: 'Ohio' },
    { value: 'GA', label: 'Georgia' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'MI', label: 'Michigan' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'CO', label: 'Colorado' },
  ],
  JP: [
    { value: 'tokyo', label: '東京都 Tokyo' },
    { value: 'osaka', label: '大阪府 Osaka' },
    { value: 'kanagawa', label: '神奈川県 Kanagawa' },
    { value: 'aichi', label: '愛知県 Aichi' },
    { value: 'fukuoka', label: '福岡県 Fukuoka' },
    { value: 'hokkaido', label: '北海道 Hokkaido' },
    { value: 'hyogo', label: '兵庫県 Hyogo' },
    { value: 'kyoto', label: '京都府 Kyoto' },
    { value: 'saitama', label: '埼玉県 Saitama' },
    { value: 'chiba', label: '千葉県 Chiba' },
  ],
  TH: [
    { value: 'bangkok', label: 'กรุงเทพมหานคร Bangkok' },
    { value: 'chiang-mai', label: 'เชียงใหม่ Chiang Mai' },
    { value: 'phuket', label: 'ภูเก็ต Phuket' },
    { value: 'chonburi', label: 'ชลบุรี Chonburi' },
    { value: 'nonthaburi', label: 'นนทบุรี Nonthaburi' },
    { value: 'khon-kaen', label: 'ขอนแก่น Khon Kaen' },
  ],
  KR: [
    { value: 'seoul', label: '서울특별시 Seoul' },
    { value: 'busan', label: '부산광역시 Busan' },
    { value: 'incheon', label: '인천광역시 Incheon' },
    { value: 'daegu', label: '대구광역시 Daegu' },
    { value: 'daejeon', label: '대전광역시 Daejeon' },
    { value: 'gwangju', label: '광주광역시 Gwangju' },
    { value: 'gyeonggi', label: '경기도 Gyeonggi' },
  ],
  SG: [
    { value: 'central', label: 'Central Region' },
    { value: 'east', label: 'East Region' },
    { value: 'north', label: 'North Region' },
    { value: 'north-east', label: 'North-East Region' },
    { value: 'west', label: 'West Region' },
  ],
  AU: [
    { value: 'nsw', label: 'New South Wales' },
    { value: 'vic', label: 'Victoria' },
    { value: 'qld', label: 'Queensland' },
    { value: 'wa', label: 'Western Australia' },
    { value: 'sa', label: 'South Australia' },
    { value: 'tas', label: 'Tasmania' },
    { value: 'act', label: 'Australian Capital Territory' },
    { value: 'nt', label: 'Northern Territory' },
  ],
  GB: [
    { value: 'england', label: 'England' },
    { value: 'scotland', label: 'Scotland' },
    { value: 'wales', label: 'Wales' },
    { value: 'northern-ireland', label: 'Northern Ireland' },
  ],
  DE: [
    { value: 'bavaria', label: 'Bayern (Bavaria)' },
    { value: 'berlin', label: 'Berlin' },
    { value: 'hamburg', label: 'Hamburg' },
    { value: 'hessen', label: 'Hessen' },
    { value: 'nrw', label: 'Nordrhein-Westfalen' },
    { value: 'baden', label: 'Baden-Württemberg' },
  ],
};

// 城市数据（根据省/州）
const CITIES: Record<string, { value: string; label: string }[]> = {
  // 中国
  beijing: [{ value: '北京', label: '北京' }],
  shanghai: [{ value: '上海', label: '上海' }],
  guangdong: [
    { value: '广州', label: '广州' },
    { value: '深圳', label: '深圳' },
    { value: '东莞', label: '东莞' },
    { value: '佛山', label: '佛山' },
    { value: '珠海', label: '珠海' },
  ],
  jiangsu: [
    { value: '南京', label: '南京' },
    { value: '苏州', label: '苏州' },
    { value: '无锡', label: '无锡' },
    { value: '常州', label: '常州' },
  ],
  zhejiang: [
    { value: '杭州', label: '杭州' },
    { value: '宁波', label: '宁波' },
    { value: '温州', label: '温州' },
    { value: '绍兴', label: '绍兴' },
  ],
  sichuan: [
    { value: '成都', label: '成都' },
    { value: '绵阳', label: '绵阳' },
    { value: '自贡', label: '自贡' },
  ],
  shandong: [
    { value: '济南', label: '济南' },
    { value: '青岛', label: '青岛' },
    { value: '烟台', label: '烟台' },
  ],
  hubei: [
    { value: '武汉', label: '武汉' },
    { value: '宜昌', label: '宜昌' },
  ],
  anhui: [
    { value: '合肥', label: '合肥' },
    { value: '芜湖', label: '芜湖' },
    { value: '马鞍山', label: '马鞍山' },
  ],
  tianjin: [{ value: '天津', label: '天津' }],
  chongqing: [{ value: '重庆', label: '重庆' }],
  hongkong: [{ value: '香港', label: '香港' }],
  macau: [{ value: '澳门', label: '澳门' }],
  // 美国
  CA: [
    { value: 'Los Angeles', label: 'Los Angeles' },
    { value: 'San Francisco', label: 'San Francisco' },
    { value: 'San Diego', label: 'San Diego' },
    { value: 'Sacramento', label: 'Sacramento' },
  ],
  NY: [
    { value: 'New York City', label: 'New York City' },
    { value: 'Buffalo', label: 'Buffalo' },
    { value: 'Albany', label: 'Albany' },
  ],
  TX: [
    { value: 'Houston', label: 'Houston' },
    { value: 'Dallas', label: 'Dallas' },
    { value: 'Austin', label: 'Austin' },
    { value: 'San Antonio', label: 'San Antonio' },
  ],
  FL: [
    { value: 'Miami', label: 'Miami' },
    { value: 'Orlando', label: 'Orlando' },
    { value: 'Tampa', label: 'Tampa' },
  ],
  // 日本
  tokyo: [
    { value: '東京', label: '東京 Tokyo' },
    { value: '渋谷', label: '渋谷 Shibuya' },
    { value: '新宿', label: '新宿 Shinjuku' },
  ],
  osaka: [
    { value: '大阪', label: '大阪 Osaka' },
    { value: '堺', label: '堺 Sakai' },
  ],
  // 泰国
  bangkok: [{ value: 'Bangkok', label: 'Bangkok กรุงเทพ' }],
  'chiang-mai': [{ value: 'Chiang Mai', label: 'Chiang Mai เชียงใหม่' }],
  phuket: [{ value: 'Phuket', label: 'Phuket ภูเก็ต' }],
  // 韩国
  seoul: [{ value: 'Seoul', label: '서울 Seoul' }],
  busan: [{ value: 'Busan', label: '부산 Busan' }],
  // 新加坡
  central: [{ value: 'Singapore Central', label: 'Singapore Central' }],
  // 澳大利亚
  nsw: [
    { value: 'Sydney', label: 'Sydney' },
    { value: 'Newcastle', label: 'Newcastle' },
  ],
  vic: [
    { value: 'Melbourne', label: 'Melbourne' },
    { value: 'Geelong', label: 'Geelong' },
  ],
  // 英国
  england: [
    { value: 'London', label: 'London' },
    { value: 'Manchester', label: 'Manchester' },
    { value: 'Birmingham', label: 'Birmingham' },
    { value: 'Liverpool', label: 'Liverpool' },
  ],
  scotland: [
    { value: 'Edinburgh', label: 'Edinburgh' },
    { value: 'Glasgow', label: 'Glasgow' },
  ],
  // 德国
  bavaria: [
    { value: 'Munich', label: 'München (Munich)' },
    { value: 'Nuremberg', label: 'Nürnberg (Nuremberg)' },
  ],
  berlin: [{ value: 'Berlin', label: 'Berlin' }],
  hamburg: [{ value: 'Hamburg', label: 'Hamburg' }],
};

// 通用输入框样式
const inputClass = (hasError: boolean) => `
  w-full px-4 py-3 rounded-xl bg-purple-500/5 border transition-all outline-none
  ${hasError 
    ? 'border-red-500/50 focus:border-red-500' 
    : 'border-purple-500/20 focus:border-purple-500/50'
  }
  text-white placeholder-gray-500
`;

// 日期输入框专用样式（修复日历图标不可见问题）
const dateInputClass = (hasError: boolean) => `
  w-full px-4 py-3 rounded-xl bg-[#1A1025] border transition-all outline-none
  ${hasError 
    ? 'border-red-500/50 focus:border-red-500' 
    : 'border-purple-500/20 focus:border-purple-500/50'
  }
  text-white
  [&::-webkit-calendar-picker-indicator]:bg-purple-400
  [&::-webkit-calendar-picker-indicator]:rounded
  [&::-webkit-calendar-picker-indicator]:p-1
  [&::-webkit-calendar-picker-indicator]:cursor-pointer
  [&::-webkit-calendar-picker-indicator]:hover:bg-purple-300
  [&::-webkit-calendar-picker-indicator]:invert
  [&::-webkit-calendar-picker-indicator]:opacity-100
`;

// 下拉菜单样式
const selectClass = (hasError: boolean) => `
  w-full px-4 py-3 rounded-xl bg-[#1A1025] border transition-all outline-none cursor-pointer
  ${hasError 
    ? 'border-red-500/50 focus:border-red-500' 
    : 'border-purple-500/20 focus:border-purple-500/50'
  }
  text-white
  [&>option]:bg-[#1A1025] [&>option]:text-white [&>option]:py-2
`;

const labelClass = 'block text-sm font-medium text-gray-300 mb-2';
const errorClass = 'text-xs text-red-400 mt-1';

// 计算两个日期之间的天数
function calculateDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
}

// 格式化日期显示
function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
}

// 服务选项组件
function ServiceOption({
  label,
  icon,
  value,
  onChange,
  disabled,
}: {
  label: string;
  icon: string;
  value: 'yes' | 'no' | 'partial' | undefined;
  onChange: (v: 'yes' | 'no' | 'partial') => void;
  disabled?: boolean;
}) {
  const options = [
    { value: 'yes', label: '提供', color: 'bg-green-500/20 border-green-500/50 text-green-400' },
    { value: 'no', label: '不提供', color: 'bg-gray-500/20 border-gray-500/50 text-gray-400' },
    { value: 'partial', label: '部分提供', color: 'bg-amber-500/20 border-amber-500/50 text-amber-400' },
  ];

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
        <span>{icon}</span> {label}
      </label>
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value as 'yes' | 'no' | 'partial')}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
              value === opt.value ? opt.color : 'bg-purple-500/5 border-purple-500/20 text-gray-400 hover:border-purple-500/40'
            } disabled:opacity-50`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CourseFormFields({
  formData,
  errors,
  onUpdate,
  onUpdateNested,
  fieldGroup,
  disabled = false,
}: CourseFormFieldsProps) {
  
  // 当发布语言改变时，自动设置对应币种
  useEffect(() => {
    if (formData.publishLanguage) {
      const lang = PUBLISH_LANGUAGES.find(l => l.value === formData.publishLanguage);
      if (lang && formData.currency !== lang.currency) {
        onUpdate('currency', lang.currency);
      }
    }
  }, [formData.publishLanguage, formData.currency, onUpdate]);

  // Step 1: 基本信息
  if (fieldGroup === 'basic') {
    const publishLang = formData.publishLanguage || 'zh';
    const titlePlaceholder = publishLang === 'zh' ? '请输入课程标题' : 
                            publishLang === 'en' ? 'Enter course title' :
                            publishLang === 'ja' ? 'コースタイトルを入力' : 'ใส่ชื่อคอร์ส';

    return (
      <div className="space-y-6">
        {/* 课程类型选择 */}
        <div>
          <label className={labelClass}>
            课程类型 <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {COURSE_FORMATS.map(fmt => (
              <button
                key={fmt.value}
                type="button"
                onClick={() => onUpdate('format', fmt.value)}
                disabled={disabled}
                className={`px-5 py-2.5 rounded-xl border transition-all ${
                  (formData.format || 'offline') === fmt.value
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-purple-500/10 border-purple-500/20 text-gray-300 hover:border-purple-500/40'
                } disabled:opacity-50`}
              >
                {fmt.icon} {fmt.label}
              </button>
            ))}
          </div>
          {errors.format && <p className={errorClass}>{errors.format}</p>}
        </div>

        {/* 发布语言选择 */}
        <div>
          <label className={labelClass}>
            发布语言 <span className="text-red-400">*</span>
            <span className="text-gray-500 text-xs ml-2">(其他语言版本将由AI自动翻译)</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {PUBLISH_LANGUAGES.map(lang => (
              <button
                key={lang.value}
                type="button"
                onClick={() => onUpdate('publishLanguage', lang.value)}
                disabled={disabled}
                className={`px-5 py-2.5 rounded-xl border transition-all ${
                  publishLang === lang.value
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-purple-500/10 border-purple-500/20 text-gray-300 hover:border-purple-500/40'
                } disabled:opacity-50`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          {errors.publishLanguage && <p className={errorClass}>{errors.publishLanguage}</p>}
        </div>

        {/* 课程标题 */}
        <div>
          <label className={labelClass}>
            课程标题 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={e => onUpdate('title', e.target.value)}
            placeholder={titlePlaceholder}
            className={inputClass(!!errors.title)}
            disabled={disabled}
          />
          {errors.title && <p className={errorClass}>{errors.title}</p>}
        </div>

        {/* 专科和等级 */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              专科分类 <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.specialty || ''}
              onChange={e => onUpdate('specialty', e.target.value)}
              className={selectClass(!!errors.specialty)}
              disabled={disabled}
            >
              <option value="">请选择专科</option>
              {SPECIALTIES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {errors.specialty && <p className={errorClass}>{errors.specialty}</p>}
          </div>
          <div>
            <label className={labelClass}>
              难度等级 <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.level || ''}
              onChange={e => onUpdate('level', e.target.value)}
              className={selectClass(!!errors.level)}
              disabled={disabled}
            >
              <option value="">请选择等级</option>
              {LEVELS.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            {errors.level && <p className={errorClass}>{errors.level}</p>}
          </div>
        </div>

        {/* 价格和容量 */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              课程价格 <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.price || 0}
              onChange={e => onUpdate('price', parseFloat(e.target.value) || 0)}
              className={inputClass(!!errors.price)}
              disabled={disabled}
            />
            {errors.price && <p className={errorClass}>{errors.price}</p>}
          </div>
          <div>
            <label className={labelClass}>货币</label>
            <select
              value={formData.currency || 'CNY'}
              onChange={e => onUpdate('currency', e.target.value)}
              className={selectClass(false)}
              disabled={disabled}
            >
              {CURRENCIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              最大容量 <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.maxCapacity || 30}
              onChange={e => onUpdate('maxCapacity', parseInt(e.target.value) || 30)}
              className={inputClass(!!errors.maxCapacity)}
              disabled={disabled}
            />
            {errors.maxCapacity && <p className={errorClass}>{errors.maxCapacity}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: 课程详情
  if (fieldGroup === 'details') {
    const publishLang = formData.publishLanguage || 'zh';
    const descPlaceholder = publishLang === 'zh' ? '请输入课程详细描述...' : 
                           publishLang === 'en' ? 'Enter course description...' :
                           publishLang === 'ja' ? 'コースの説明を入力...' : 'ใส่คำอธิบายคอร์ส...';
    const descLabel = publishLang === 'zh' ? '课程描述' : 
                     publishLang === 'en' ? 'Course Description' :
                     publishLang === 'ja' ? 'コース説明' : 'คำอธิบายคอร์ส';

    const teachingLangs = (formData.teachingLanguages as string[]) || [];

    const toggleTeachingLang = (langValue: string) => {
      if (teachingLangs.includes(langValue)) {
        onUpdate('teachingLanguages', teachingLangs.filter(l => l !== langValue));
      } else {
        onUpdate('teachingLanguages', [...teachingLangs, langValue]);
      }
    };

    return (
      <div className="space-y-6">
        {/* 授课语言 */}
        <div>
          <label className={labelClass}>
            授课语言 <span className="text-red-400">*</span>
            <span className="text-gray-500 text-xs ml-2">(可多选)</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {TEACHING_LANGUAGES.map(lang => (
              <button
                key={lang.value}
                type="button"
                onClick={() => toggleTeachingLang(lang.value)}
                disabled={disabled}
                className={`px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${
                  teachingLangs.includes(lang.value)
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-purple-500/10 border-purple-500/20 text-gray-300 hover:border-purple-500/40'
                } disabled:opacity-50`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center ${
                  teachingLangs.includes(lang.value) 
                    ? 'bg-white border-white' 
                    : 'border-gray-400'
                }`}>
                  {teachingLangs.includes(lang.value) && (
                    <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                {lang.label}
              </button>
            ))}
          </div>
          {errors.teachingLanguages && <p className={errorClass}>{errors.teachingLanguages}</p>}
        </div>

        {/* 描述 */}
        <div>
          <label className={labelClass}>
            {descLabel} <span className="text-red-400">*</span>
          </label>
          <textarea
            value={formData.description || ''}
            onChange={e => onUpdate('description', e.target.value)}
            placeholder={descPlaceholder}
            rows={5}
            className={inputClass(!!errors.description)}
            disabled={disabled}
          />
          {errors.description && <p className={errorClass}>{errors.description}</p>}
        </div>

        {/* 总课时 */}
        <div className="max-w-xs">
          <label className={labelClass}>总课时 (小时)</label>
          <input
            type="number"
            min="0"
            value={formData.totalHours || ''}
            onChange={e => onUpdate('totalHours', parseFloat(e.target.value) || undefined)}
            placeholder="如：16"
            className={inputClass(false)}
            disabled={disabled}
          />
        </div>
      </div>
    );
  }

  // Step 3: 讲师信息
  if (fieldGroup === 'instructor') {
    const instructor = (formData.instructor || {}) as InstructorData;
    
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              讲师姓名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={instructor.name || ''}
              onChange={e => onUpdateNested('instructor.name', e.target.value)}
              placeholder="讲师姓名"
              className={inputClass(!!errors['instructor.name'])}
              disabled={disabled}
            />
            {errors['instructor.name'] && <p className={errorClass}>{errors['instructor.name']}</p>}
          </div>
          <div>
            <label className={labelClass}>
              讲师职称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={instructor.title || ''}
              onChange={e => onUpdateNested('instructor.title', e.target.value)}
              placeholder="如：副教授、主任医师"
              className={inputClass(!!errors['instructor.title'])}
              disabled={disabled}
            />
            {errors['instructor.title'] && <p className={errorClass}>{errors['instructor.title']}</p>}
          </div>
        </div>

        <div>
          <label className={labelClass}>讲师简介</label>
          <textarea
            value={instructor.bio || ''}
            onChange={e => onUpdateNested('instructor.bio', e.target.value)}
            placeholder="讲师背景、专业经历..."
            rows={4}
            className={inputClass(false)}
            disabled={disabled}
          />
        </div>

        {/* 资格证书 */}
        <div>
          <label className={labelClass}>资格证书</label>
          <div className="space-y-2">
            {(instructor.credentials || []).map((cred: string, idx: number) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={cred}
                  onChange={e => {
                    const newCreds = [...(instructor.credentials || [])];
                    newCreds[idx] = e.target.value;
                    onUpdateNested('instructor.credentials', newCreds);
                  }}
                  className={inputClass(false) + ' flex-1'}
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() => {
                    const newCreds = (instructor.credentials || []).filter((_: string, i: number) => i !== idx);
                    onUpdateNested('instructor.credentials', newCreds);
                  }}
                  className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  disabled={disabled}
                >
                  删除
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newCreds = [...(instructor.credentials || []), ''];
                onUpdateNested('instructor.credentials', newCreds);
              }}
              className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
              disabled={disabled}
            >
              + 添加证书
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: 课程安排
  if (fieldGroup === 'schedule') {
    const location = (formData.location || {}) as LocationData;
    const selectedCountry = location.country || '';
    const selectedRegion = location.region || '';
    
    // 获取省/州列表
    const regions = useMemo(() => REGIONS[selectedCountry] || [], [selectedCountry]);
    
    // 获取城市列表
    const cities = useMemo(() => CITIES[selectedRegion] || [], [selectedRegion]);

    // 计算课程天数
    const courseDays = useMemo(() => {
      return calculateDays(formData.startDate || '', formData.endDate || '');
    }, [formData.startDate, formData.endDate]);

    // 当国家改变时，清空省/州和城市
    const handleCountryChange = (countryCode: string) => {
      onUpdateNested('location.country', countryCode);
      onUpdateNested('location.region', '');
      onUpdateNested('location.city', '');
    };

    // 当省/州改变时，清空城市
    const handleRegionChange = (regionCode: string) => {
      onUpdateNested('location.region', regionCode);
      onUpdateNested('location.city', '');
    };

    // 获取服务安排数据
    const services = (formData as any).services || {};
    
    return (
      <div className="space-y-8">
        {/* 日期选择区块 */}
        <div className="edu-card p-5 space-y-4">
          <h4 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
            <span>📅</span> 课程日期
          </h4>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>
                开课日期 <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate || ''}
                onChange={e => onUpdate('startDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={dateInputClass(!!errors.startDate)}
                disabled={disabled}
              />
              {formData.startDate && (
                <p className="text-xs text-purple-400 mt-1">{formatDateDisplay(formData.startDate)}</p>
              )}
              {errors.startDate && <p className={errorClass}>{errors.startDate}</p>}
            </div>
            <div>
              <label className={labelClass}>
                结课日期 <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate || ''}
                onChange={e => onUpdate('endDate', e.target.value)}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
                className={dateInputClass(!!errors.endDate)}
                disabled={disabled}
              />
              {formData.endDate && (
                <p className="text-xs text-purple-400 mt-1">{formatDateDisplay(formData.endDate)}</p>
              )}
              {errors.endDate && <p className={errorClass}>{errors.endDate}</p>}
            </div>
            <div>
              <label className={labelClass}>报名截止</label>
              <input
                type="date"
                value={formData.enrollmentDeadline || ''}
                onChange={e => onUpdate('enrollmentDeadline', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                max={formData.startDate}
                className={dateInputClass(false)}
                disabled={disabled}
              />
              {formData.enrollmentDeadline && (
                <p className="text-xs text-purple-400 mt-1">{formatDateDisplay(formData.enrollmentDeadline)}</p>
              )}
            </div>
          </div>

          {/* 课程时长显示 */}
          {courseDays > 0 && (
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-xl">
                <span className="text-purple-400">课程时长：</span>
                <span className="text-white font-semibold">{courseDays} 天</span>
              </div>
              {formData.totalHours && (
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-xl">
                  <span className="text-purple-400">约</span>
                  <span className="text-white font-semibold">{Math.round(formData.totalHours / courseDays * 10) / 10} 小时/天</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 地点选择区块 */}
        <div className="edu-card p-5 space-y-4">
          <h4 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
            <span>📍</span> 上课地点
          </h4>

          {/* 国家选择 */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>
                国家/地区 <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedCountry}
                onChange={e => handleCountryChange(e.target.value)}
                className={selectClass(!!errors['location.country'])}
                disabled={disabled}
              >
                <option value="">请选择国家/地区</option>
                {COUNTRIES.map(c => (
                  <option key={c.value} value={c.value}>{c.flag} {c.label}</option>
                ))}
              </select>
              {errors['location.country'] && <p className={errorClass}>{errors['location.country']}</p>}
            </div>
            <div>
              <label className={labelClass}>
                省/州/地区 {regions.length > 0 && <span className="text-red-400">*</span>}
              </label>
              {regions.length > 0 ? (
                <select
                  value={selectedRegion}
                  onChange={e => handleRegionChange(e.target.value)}
                  className={selectClass(!!errors['location.region'])}
                  disabled={disabled || !selectedCountry}
                >
                  <option value="">请选择省/州</option>
                  {regions.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={location.region || ''}
                  onChange={e => onUpdateNested('location.region', e.target.value)}
                  placeholder="请输入省/州/地区"
                  className={inputClass(false)}
                  disabled={disabled || !selectedCountry}
                />
              )}
              {errors['location.region'] && <p className={errorClass}>{errors['location.region']}</p>}
            </div>
            <div>
              <label className={labelClass}>
                城市 <span className="text-red-400">*</span>
              </label>
              {cities.length > 0 ? (
                <select
                  value={location.city || ''}
                  onChange={e => onUpdateNested('location.city', e.target.value)}
                  className={selectClass(!!errors['location.city'])}
                  disabled={disabled}
                >
                  <option value="">请选择城市</option>
                  {cities.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                  <option value="__other__">其他城市...</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={location.city || ''}
                  onChange={e => onUpdateNested('location.city', e.target.value)}
                  placeholder="请输入城市名称"
                  className={inputClass(!!errors['location.city'])}
                  disabled={disabled}
                />
              )}
              {location.city === '__other__' && (
                <input
                  type="text"
                  onChange={e => onUpdateNested('location.city', e.target.value)}
                  placeholder="请输入城市名称"
                  className={inputClass(false) + ' mt-2'}
                  disabled={disabled}
                />
              )}
              {errors['location.city'] && <p className={errorClass}>{errors['location.city']}</p>}
            </div>
          </div>

          {/* 场地和地址 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                场地名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={location.venue || ''}
                onChange={e => onUpdateNested('location.venue', e.target.value)}
                placeholder="如：国际会议中心、动物医院"
                className={inputClass(!!errors['location.venue'])}
                disabled={disabled}
              />
              {errors['location.venue'] && <p className={errorClass}>{errors['location.venue']}</p>}
            </div>
            <div>
              <label className={labelClass}>详细地址</label>
              <input
                type="text"
                value={location.address || ''}
                onChange={e => onUpdateNested('location.address', e.target.value)}
                placeholder="街道、门牌号等详细地址"
                className={inputClass(false)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* 地址预览 */}
          {(selectedCountry || location.city || location.venue) && (
            <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
              <p className="text-xs text-gray-500 mb-1">地址预览：</p>
              <p className="text-sm text-gray-300">
                {[
                  COUNTRIES.find(c => c.value === selectedCountry)?.flag,
                  COUNTRIES.find(c => c.value === selectedCountry)?.label.split(' ')[0],
                  regions.find(r => r.value === selectedRegion)?.label || location.region,
                  location.city && location.city !== '__other__' ? location.city : null,
                  location.venue,
                ].filter(Boolean).join(' · ')}
              </p>
              {location.address && (
                <p className="text-xs text-gray-500 mt-1">{location.address}</p>
              )}
            </div>
          )}
        </div>

        {/* 行程服务安排 */}
        <div className="edu-card p-5 space-y-5">
          <h4 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
            <span>✈️</span> 行程服务安排
            <span className="text-xs text-gray-500 font-normal ml-2">(帮助学员了解行程细节)</span>
          </h4>

          <div className="grid md:grid-cols-2 gap-6">
            <ServiceOption
              label="住宿安排"
              icon="🏨"
              value={services.accommodation}
              onChange={v => onUpdateNested('services.accommodation', v)}
              disabled={disabled}
            />
            <ServiceOption
              label="餐饮安排"
              icon="🍽️"
              value={services.meals}
              onChange={v => onUpdateNested('services.meals', v)}
              disabled={disabled}
            />
            <ServiceOption
              label="接送服务"
              icon="🚗"
              value={services.transfer}
              onChange={v => onUpdateNested('services.transfer', v)}
              disabled={disabled}
            />
            <ServiceOption
              label="签证邀请函"
              icon="📄"
              value={services.visaLetter}
              onChange={v => onUpdateNested('services.visaLetter', v)}
              disabled={disabled}
            />
          </div>

          {/* 交通指南 */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-2">
                <span>🗺️</span> 交通指南
              </span>
            </label>
            <textarea
              value={services.directions || ''}
              onChange={e => onUpdateNested('services.directions', e.target.value)}
              placeholder="如何到达培训地点？可填写：最近的机场/火车站、推荐的交通方式、预计交通时间等"
              rows={3}
              className={inputClass(false)}
              disabled={disabled}
            />
          </div>

          {/* 其他备注 */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-2">
                <span>📝</span> 其他备注
              </span>
            </label>
            <textarea
              value={services.notes || ''}
              onChange={e => onUpdateNested('services.notes', e.target.value)}
              placeholder="其他需要学员提前了解的信息，如：携带物品、着装要求、当地气候、时差提醒等"
              rows={3}
              className={inputClass(false)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

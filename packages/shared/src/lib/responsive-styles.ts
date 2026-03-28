/**
 * 响应式设计系统
 * 统一的间距、字体大小和布局配置
 */

/**
 * 响应式断点
 * - sm: 640px   (手机横屏)
 * - md: 768px   (平板)
 * - lg: 1024px  (小屏笔记本)
 * - xl: 1280px  (桌面)
 * - 2xl: 1536px (大屏)
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * 响应式字体大小
 * 格式：[mobile, tablet, desktop]
 */
export const fontSizes = {
  xs: 'text-xs sm:text-[10px]',
  sm: 'text-sm sm:text-xs',
  base: 'text-base sm:text-sm',
  lg: 'text-lg sm:text-base',
  xl: 'text-xl sm:text-lg',
  '2xl': 'text-2xl sm:text-xl',
  '3xl': 'text-3xl sm:text-2xl',
  '4xl': 'text-4xl sm:text-3xl',
};

/**
 * 响应式内边距
 */
export const paddings = {
  xs: 'px-3 py-2 sm:px-4 sm:py-2.5',
  sm: 'px-4 py-3 sm:px-5 sm:py-3',
  md: 'px-4 py-4 sm:px-6 sm:py-4',
  lg: 'px-6 py-6 sm:px-8 sm:py-6',
  xl: 'px-8 py-8 sm:px-12 sm:py-8',
};

/**
 * 响应式外边距
 */
export const margins = {
  section: 'my-8 sm:my-12 md:my-16',
  container: 'mx-4 sm:mx-6 md:mx-8 lg:mx-auto',
};

/**
 * 响应式网格列数
 */
export const gridColumns = {
  single: 'grid-cols-1',
  double: 'grid-cols-1 sm:grid-cols-2',
  triple: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  quad: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

/**
 * 响应式间距 (gap)
 */
export const gaps = {
  xs: 'gap-2 sm:gap-3',
  sm: 'gap-3 sm:gap-4',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-6 sm:gap-8',
  xl: 'gap-8 sm:gap-12',
};

/**
 * 触摸友好的最小点击区域
 * Apple HIG: 44x44pt
 * Material Design: 48x48dp
 */
export const touchTargets = {
  sm: 'min-h-[40px] min-w-[40px]',
  md: 'min-h-[44px] min-w-[44px]',
  lg: 'min-h-[48px] min-w-[48px]',
};

/**
 * 移动端安全的点击区域 (添加额外的 padding)
 */
export const safeClickArea = 'p-2 -m-2';

/**
 * 响应式圆角
 */
export const radius = {
  sm: 'rounded sm:rounded-md',
  md: 'rounded-lg sm:rounded-xl',
  lg: 'rounded-2xl sm:rounded-3xl',
  full: 'rounded-full',
};

/**
 * 响应式阴影
 */
export const shadows = {
  sm: 'shadow-sm hover:shadow-md',
  md: 'shadow-md hover:shadow-lg',
  lg: 'shadow-lg hover:shadow-xl',
  xl: 'shadow-xl hover:shadow-2xl',
};

/**
 * 生成响应式容器类
 */
export function responsiveContainer(maxWidth: 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'xl'): string {
  const widths = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    '2xl': 'max-w-[1600px]',
  };
  
  return `w-full ${widths[maxWidth]} mx-auto px-4 sm:px-6 md:px-8 lg:px-12`;
}

/**
 * 移动端优化滚动容器
 */
export const mobileScrollContainer = `
  overflow-x-auto 
  -mx-4 
  px-4 
  sm:mx-0 
  sm:px-0
  scrollbar-thin 
  scrollbar-thumb-slate-300 
  scrollbar-track-transparent
  hover:scrollbar-thumb-slate-400
`;

/**
 * 响应式隐藏/显示工具类
 */
export const hideOnMobile = 'hidden sm:block';
export const showOnMobile = 'block sm:hidden';
export const hideOnTablet = 'sm:hidden lg:block';
export const hideOnDesktop = 'lg:hidden';

/**
 * 生成响应式字体类
 */
export function responsiveFontSize(mobile: number, tablet?: number, desktop?: number): string {
  const mobileSize = `text-[${mobile}px]`;
  const tabletSize = tablet ? ` sm:text-[${tablet}px]` : '';
  const desktopSize = desktop ? ` lg:text-[${desktop}px]` : '';
  return `${mobileSize}${tabletSize}${desktopSize}`;
}

/**
 * 生成响应式内边距类
 */
export function responsivePadding(mobile: string, tablet?: string, desktop?: string): string {
  const mobilePadding = `p-${mobile}`;
  const tabletPadding = tablet ? ` sm:p-${tablet}` : '';
  const desktopPadding = desktop ? ` lg:p-${desktop}` : '';
  return `${mobilePadding}${tabletPadding}${desktopPadding}`;
}

/**
 * 移动端友好的列表项样式
 */
export const mobileListItem = `
  flex 
  items-center 
  gap-3 
  p-4 
  sm:p-5
  border-b 
  border-slate-100
  last:border-b-0
  active:bg-slate-50
  transition-colors
`;

/**
 * 移动端卡片列表样式
 */
export const mobileCardList = `
  divide-y 
  divide-slate-100 
  border 
  border-slate-200 
  rounded-2xl 
  overflow-hidden 
  bg-white
`;

/**
 * 统一动画和过渡效果
 * 用于提升视觉一致性和交互体验
 */

/**
 * CSS 动画关键帧 (添加到 globals.css)
 */
export const globalAnimations = `
/* Slide animations */
@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Fade animations */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale animations */
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scale-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

/* Pulse animations */
@keyframes pulse-soft {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* Bounce animations */
@keyframes bounce-soft {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* Shake animation */
@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

/* Spin animation */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Utility classes */
.animate-slide-down {
  animation: slide-down 0.3s ease-out;
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}

.animate-slide-in-left {
  animation: slide-in-left 0.3s ease-out;
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-fade-in-up {
  animation: fade-in-up 0.4s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}

.animate-scale-out {
  animation: scale-out 0.2s ease-out;
}

.animate-pulse-soft {
  animation: pulse-soft 2s ease-in-out infinite;
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

.animate-bounce-soft {
  animation: bounce-soft 1s ease-in-out infinite;
}

.animate-bounce {
  animation: bounce 1s ease-in-out infinite;
}

.animate-shake {
  animation: shake 0.3s ease-in-out;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Transition utilities */
.transition-all-fast {
  transition: all 0.15s ease-in-out;
}

.transition-all {
  transition: all 0.2s ease-in-out;
}

.transition-all-slow {
  transition: all 0.3s ease-in-out;
}

.transition-transform {
  transition: transform 0.2s ease-in-out;
}

.transition-opacity {
  transition: opacity 0.2s ease-in-out;
}

.transition-colors {
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
}

/* Hover scale effects */
.hover-scale {
  transition: transform 0.2s ease-in-out;
}

.hover-scale:hover {
  transform: scale(1.02);
}

.hover-scale:active {
  transform: scale(0.98);
}

/* Smooth scrolling */
.smooth-scroll {
  scroll-behavior: smooth;
}

/* Touch feedback */
.touch-feedback {
  transition: transform 0.1s ease-in-out;
}

.touch-feedback:active {
  transform: scale(0.95);
}
`;

/**
 * 统一的过渡持续时间
 */
export const transitionDuration = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
};

/**
 * 统一的缓动函数
 */
export const easing = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
};

/**
 * 常用的过渡组合
 */
export const transitions = {
  // 快速交互 (按钮、图标)
  interactive: `transition-all ${transitionDuration.fast} ${easing.easeInOut}`,
  
  // 标准过渡 (卡片、链接)
  standard: `transition-all ${transitionDuration.normal} ${easing.easeInOut}`,
  
  // 慢速过渡 (背景、大元素)
  slow: `transition-all ${transitionDuration.slow} ${easing.easeInOut}`,
  
  // 仅颜色过渡
  colors: `transition-colors ${transitionDuration.fast} ${easing.easeInOut}`,
  
  // 仅变换过渡
  transform: `transition-transform ${transitionDuration.normal} ${easing.easeOut}`,
};

/**
 * 移动端友好的滚动行为
 */
export const scrollBehaviors = {
  smooth: 'scroll-behavior: smooth',
  auto: 'scroll-behavior: auto',
};

/**
 * 添加全局动画到 CSS
 * 在 globals.css 中添加: {globalAnimations}
 */
export function injectGlobalAnimations(): void {
  if (typeof document !== 'undefined') {
    const styleId = 'global-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = globalAnimations;
      document.head.appendChild(style);
    }
  }
}

import { createNextConfig } from '@vetsphere/shared/lib/next-config';

export default createNextConfig({
  dirname: __dirname,
  allowedDevOrigins: ['vetsphere.cn', 'www.vetsphere.cn'],
});

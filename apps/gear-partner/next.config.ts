import { createNextConfig } from '@vetsphere/shared/lib/next-config';

export default createNextConfig({
  dirname: __dirname,
  allowedDevOrigins: ['gear.vetsphere.cn', 'gear.vetsphere.com'],
});

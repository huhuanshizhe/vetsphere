import { createNextConfig } from '@vetsphere/shared/lib/next-config';

export default createNextConfig({
  dirname: __dirname,
  allowedDevOrigins: ['guidance.vetsphere.cn'],
});

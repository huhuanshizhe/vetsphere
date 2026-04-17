import { createNextConfig } from '@vetsphere/shared/lib/next-config';

export default createNextConfig({
  dirname: __dirname,
  allowedDevOrigins: ['edu.vetsphere.cn', 'edu.vetsphere.com'],
});

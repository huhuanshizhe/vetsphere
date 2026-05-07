import { createNextConfig } from '@vetsphere/shared/lib/next-config';

export default createNextConfig({
  dirname: __dirname,
  allowedDevOrigins: ['guidance.vetsphere.cn', 'localhost:3006', '127.0.0.1:3006'],
});

import { createNextConfig } from '@vetsphere/shared/lib/next-config';

export default createNextConfig({
  allowedDevOrigins: ['admin.vetsphere.cn'],
});
/**
 * /api/v1/admin/verifications/[id]
 *
 * 通用医生认证审核详情 + 操作端点。
 * 实现复用 cn-verifications/[id]（同一张 cn_verification_requests 表）。
 * 旧路径 /api/v1/admin/cn-verifications/[id] 仍然可用（保留作向后兼容）。
 */
export { GET, POST } from '../../cn-verifications/[id]/route';

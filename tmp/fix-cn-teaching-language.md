# 修复错误的授课语言 CN 值

## 问题描述

用户发现之前错误设置的授课语言 `CN` 没有消失，正确的 `zh` 已经出现，但 `CN` 仍然存在。

## 问题原因

之前代码中使用了错误的国家代码 `CN`（China）而不是语言代码 `zh`（中文）作为授课语言。

## 修复步骤

### 1. 代码修复

已修改文件：`packages/shared/src/components/courses/CourseFormFields.tsx`

```typescript
// 修复前
const TEACHING_LANGUAGES = [
  { value: 'CN', label: '中文' },  // ❌ 错误：CN 是国家代码
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'th', label: 'ภาษาไทย' },
];

// 修复后
const TEACHING_LANGUAGES = [
  { value: 'zh', label: '中文' },  // ✅ 正确：zh 是语言代码
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'th', label: 'ภาษาไทย' },
];
```

### 2. 数据库清理

执行 SQL 更新，将所有课程中的 `CN` 替换为 `zh`：

```sql
-- 第一步：移除 CN 并添加 zh
UPDATE courses 
SET teaching_languages = ARRAY_REMOVE(teaching_languages, 'CN') || ARRAY['zh']::text[]
WHERE teaching_languages::text LIKE '%CN%';

-- 第二步：去重（如果有重复的 zh）
UPDATE courses 
SET teaching_languages = ARRAY(SELECT DISTINCT UNNEST(teaching_languages) ORDER BY 1)
WHERE id = 'c-1775734593549';
```

### 3. 验证结果

修复后的数据库数据：

```sql
SELECT id, title, publish_language, teaching_languages 
FROM courses 
WHERE id IN ('c-1775734593549', 'c-1772761607759');
```

结果：
- `c-1775734593549`: `["en", "zh"]` ✅
- `c-1772761607759`: `["zh"]` ✅

## 受影响的数据

共修复了 2 门课程：
1. `c-1775734593549` - Small Animal Neurology - 5-Day Training Camp
2. `c-1772761607759` - 测试

## 验证方法

### 前台验证

1. 访问国际站：http://vetsphere.net
2. 查看课程列表页面
3. 检查课程详情中的授课语言显示
4. 确认只显示 `zh`（中文），不再显示 `CN`

### 后台验证

1. 访问 admin 后台：http://localhost:3002/admin/courses
2. 编辑任意课程
3. 检查授课语言选项
4. 确认只有 `zh`、`en`、`ja`、`th` 四个选项

## 修复时间

2026-04-10

## 相关文件

- `packages/shared/src/components/courses/CourseFormFields.tsx` - 授课语言选项定义
- `apps/admin/src/app/(admin)/courses/[id]/page.tsx` - 课程编辑页面
- `apps/edu-partner/src/components/courses/CourseFormFields.tsx` - 教育合作伙伴课程表单

# 修复源语言字段无法编辑问题

## 问题描述

用户反馈：课程中只有源语言（英语）的标题、描述、讲师简介无法编辑，有光标但打不进去字。其他语言版本的内容都能正常编辑。

## 根本原因

**读写不一致问题**：当数据库同时存在 `title`（源语言字段）和 `title_en`（带后缀字段）时：

### 修复前的逻辑

**读取时** (`getLocalizedValue`)：
```typescript
// 优先检查带后缀的字段
const suffixValue = obj?.['title_en'];
if (suffixValue !== undefined && suffixValue !== null) return String(suffixValue);

// 如果是源语言，检查不带后缀的字段
if (editLang === publishLang) {
  const baseValue = obj?.['title'];
  if (baseValue !== undefined && baseValue !== null) return String(baseValue);
}
```
✅ 返回 `title_en` 的值

**写入时** (`setLocalizedValue`)：
```typescript
const field = editLang === publishLang ? 'title' : 'title_en';
// 写入到 'title' 字段 ❌
setEditForm(prev => ({ ...prev, [field]: value }));
```
❌ 写入到 `title` 字段

### 问题表现

1. 用户看到 `title_en` 的值（例如："Small Animal Neurology"）
2. 用户输入新值（例如："New Title"）
3. 新值写入到 `title` 字段
4. 但 UI 仍然显示 `title_en` 的旧值
5. 看起来就像"打不进去字"

## 修复方案

确保**读写一致**：如果带后缀的字段存在，优先使用带后缀的字段（包括源语言）。

### 修复后的逻辑

**读取时**：
```typescript
const suffixKey = `title_${editLang}`; // 'title_en'
if (obj && suffixKey in obj) {
  const suffixValue = obj[suffixKey];
  if (suffixValue !== undefined && suffixValue !== null) {
    return String(suffixValue); // 返回 title_en 的值
  }
}
```

**写入时**：
```typescript
const suffixKey = `title_${editLang}`; // 'title_en'
const useSuffix = editForm && suffixKey in editForm; // 检查 title_en 是否存在
const field = useSuffix ? suffixKey : (editLang === publishLang ? 'title' : 'title_en');
// 如果 title_en 存在，写入到 title_en ✅
setEditForm(prev => ({ ...prev, [field]: value }));
```

### 修复效果

- ✅ 如果数据库有 `title_en`，读取和写入都使用 `title_en`
- ✅ 如果数据库只有 `title`，读取和写入都使用 `title`
- ✅ 读写保持一致，用户可以正常编辑

## 修改的文件

1. **课程编辑页面**：`apps/admin/src/app/(admin)/courses/[id]/page.tsx`
   - 修改 `getLocalizedValue` 函数
   - 修改 `setLocalizedValue` 函数

2. **产品编辑页面**：`apps/admin/src/app/(admin)/products/[id]/page.tsx`
   - 修改 `getLocalizedValue` 函数
   - 修改 `setLocalizedValue` 函数

## 测试步骤

### 课程编辑测试

1. 访问：http://localhost:3002/admin/courses
2. 点击一个源语言为英语的课程（例如：c-1775734593549）
3. 切换到英语标签（源语言）
4. 尝试编辑：
   - ✅ 课程标题
   - ✅ 课程描述
   - ✅ 讲师简介
5. 点击"保存修改"
6. 刷新页面，确认修改已保存

### 产品编辑测试

1. 访问：http://localhost:3002/admin/products
2. 点击一个源语言为英语的产品
3. 切换到英语标签（源语言）
4. 尝试编辑：
   - ✅ 产品名称
   - ✅ 产品描述
5. 点击"保存修改"
6. 刷新页面，确认修改已保存

## 数据库验证

可以使用以下 SQL 验证修改是否正确保存：

```sql
-- 检查课程字段
SELECT id, title, title_en, publish_language 
FROM courses 
WHERE id = 'c-1775734593549';

-- 检查产品字段
SELECT id, name, name_en, publish_language 
FROM products 
WHERE id = 'your-product-id';
```

## 预期结果

- ✅ 源语言字段可以正常编辑
- ✅ 输入的文字立即显示在输入框中
- ✅ 保存后，数据库中的对应字段被更新
- ✅ 刷新页面后，修改的内容仍然显示

## 修复时间

2026-04-10

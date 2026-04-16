# Admin 课程/产品编辑功能修复总结

## 修复内容

### 1. 课程编辑页面 (`apps/admin/src/app/(admin)/courses/[id]/page.tsx`)

**已修复的问题：**
1. ✅ 设置 `isReadOnly = false`，允许编辑所有状态的_course_
2. ✅ 将所有输入框的 className 从 `bg-slate-50` 改为 `bg-white`
3. ✅ 添加 `cursor-text` 样式，明确显示输入框可编辑
4. ✅ 添加详细的调试日志到标题输入框

**修改的输入框类型：**
- 课程标题（text input）
- 课程描述（textarea）
- 专科分类（text input）
- 难度级别（select）
- 多货币价格（number inputs）
- 最大容量（number input）
- 授课语言（buttons）
- 媒体 URL（text inputs）
- 讲师信息（text inputs + textarea）
- 资格证书（text inputs）
- 课程日期（date inputs）
- 课程日程（text inputs）
- 上课地点（text inputs）
- 交通指南（textarea）
- 其他备注（textarea）

### 2. 产品编辑页面 (`apps/admin/src/app/(admin)/products/[id]/page.tsx`)

**已修复的问题：**
1. ✅ 设置 `isReadOnly = false`，允许编辑所有状态的产品
2. ✅ 将所有输入框的 className 从 `bg-slate-50` 改为 `bg-white`

## 测试方法

### 步骤 1：刷新浏览器
访问 http://localhost:3002/admin/courses 并按 `Ctrl+Shift+R` 强制刷新

### 步骤 2：打开开发者工具
按 `F12` 打开 Console 标签

### 步骤 3：测试编辑功能
1. 点击任意课程进入编辑页面
2. 尝试点击"课程标题"输入框
3. 尝试输入文字
4. 观察 Console 中是否有日志输出

### 预期结果
- ✅ 输入框背景为白色（`bg-white`）
- ✅ 鼠标悬停时显示文本光标（`cursor-text`）
- ✅ 可以正常聚焦和输入文字
- ✅ Console 显示调试日志（仅标题输入框）

### 调试日志示例
```
[Title Input] {
  event: 'onChange',
  value: '测试文字',
  editLang: 'zh',
  publishLang: 'en',
  currentValue: '小动物神经学 - 5 天训练营',
  fieldKey: 'title_zh',
  fieldValue: '小动物神经学 - 5 天训练营',
  baseFieldValue: undefined
}
```

## 数据库验证

已确认数据库中的课程数据结构正常：

```sql
SELECT id, title, title_zh, title_en, publish_language, status 
FROM courses 
WHERE status = 'published';
```

示例数据：
- `id`: c-1775734593549
- `title`: Small Animal Neurology - 5-Day Training Camp
- `title_zh`: 小动物神经学 - 5 天训练营
- `title_en`: Small Animal Neurology - 5-Day Training Camp
- `publish_language`: en
- `status`: published

## 多语言逻辑验证

`getLocalizedValue` 函数逻辑正确：

1. **当 editLang = 'zh' 时**：
   - 优先检查 `title_zh`
   - 如果不存在且是源语言，检查 `title`
   - 返回相应的值

2. **当 editLang = 'en' 且 publishLang = 'en' 时**：
   - 优先检查 `title_en`
   - 如果不存在，检查 `title`（源语言字段）
   - 返回相应的值

## 下一步

如果编辑功能仍然有问题，请检查：
1. 浏览器 Console 是否有 JavaScript 错误
2. Network 标签中 API 请求是否成功
3. 输入框的 computed styles 是否有其他 CSS 覆盖

## 修改时间
2026-04-10

# Admin 课程编辑功能测试指南

## 测试步骤

1. **打开浏览器访问**：http://localhost:3002/admin/login

2. **登录 Admin**：
   - 邮箱：admin@vetsphere.pro
   - 密码：admin123

3. **导航到课程编辑页面**：
   - 点击左侧菜单"课程管理"
   - 点击任意一个课程（特别是已上架的课程）

4. **测试输入框编辑**：
   - 尝试点击"课程标题"输入框
   - 尝试输入一些文字
   - 观察：
     - 输入框是否可以聚焦？（光标是否出现）
     - 输入的文字是否显示？
     - 浏览器控制台是否有错误？

5. **检查控制台日志**：
   - 按 F12 打开开发者工具
   - 切换到 Console 标签
   - 尝试编辑标题时，查看是否有日志输出
   - 日志应该显示类似：
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

## 可能的问题和解决方案

### 问题 1：输入框无法聚焦
**症状**：点击输入框没有任何反应，光标不出现

**可能原因**：
- CSS z-index 问题（有其他元素覆盖）
- 输入框被设置了 `pointer-events: none`
- React 事件处理问题

**解决方案**：检查输入框的 computed styles

### 问题 2：输入框可以聚焦但无法输入
**症状**：可以聚焦，但输入的文字不显示

**可能原因**：
- React controlled component 的 value 为 undefined
- `onChange` 事件触发但状态未更新
- `getLocalizedValue` 返回空字符串

**解决方案**：检查控制台日志，确认 `getLocalizedValue` 返回值

### 问题 3：输入框看起来是灰色的
**症状**：输入框背景是灰色的，看起来像被禁用

**原因**：使用了 `bg-slate-50` 样式

**解决方案**：这只是视觉效果，实际上可以编辑。建议改为 `bg-white`

### 问题 4：保存时提示错误
**症状**：可以编辑但保存失败

**可能原因**：
- API 权限问题
- 数据格式不正确
- RLS 策略限制

**解决方案**：检查 Network 标签中的 API 请求和响应

## 当前代码状态

已修改的内容：
1. `isReadOnly` 已设置为 `false`（第 51 行）
2. 标题输入框已添加详细的调试日志
3. 标题输入框 className 已改为 `bg-white`

待确认的问题：
- 其他输入框是否也无法编辑？
- 是所有课程都无法编辑，还是只有已上架的课程？
- 浏览器控制台是否有 JavaScript 错误？

# 远程手术指导应用架构设计 V2

## 文档信息
- **版本**: 2.0
- **日期**: 2026-04-17
- **状态**: 待审核
- **作者**: Qoder

---

## 一、背景与目标

### 1.1 当前问题
现有远程指导应用存在以下核心问题：

1. **角色体验不区分** - 宠物医生、专家、观察员看到相同界面
2. **流程冗长** - 需要多次点击才能进入手术室
3. **状态过于复杂** - 11种状态，临床场景难以理解
4. **视频功能薄弱** - 缺少多视频源、实时标注、虚拟器械
5. **观察员入口隐藏** - 应急链接生成流程过于复杂
6. **缺少虚拟候诊室** - 没有等待体验和进度提示

### 1.2 设计目标
- **三秒原则**: 关键信息在3秒内可见
- **一键入房**: 最少操作进入手术室
- **角色优先**: 根据角色自动提供定制化界面
- **实时协作**: 专家可实时标注指导

---

## 二、角色定义与权限矩阵

### 2.1 核心角色

| 角色 | 来源 | 入场方式 | 核心能力 |
|-----|------|---------|---------|
| **主刀医生 (Surgeon)** | 平台登录医生 | 自动定向 | 发布视频、语音、请求帮助、切换视频源 |
| **助手 (Assistant)** | 平台登录医生 | 会话邀请 | 发布视频、语音、辅助操作 |
| **指导专家 (Expert)** | 平台登录/应急链接 | 自动定向/链接直达 | 观看视频、语音指导、实时标注、虚拟器械叠加 |
| **协调员 (Moderator)** | 平台管理员 | 自动定向 | 全部权限 + 会话管理 |
| **观察员 (Observer)** | 应急链接 | 链接直达 | 仅观看，无发布权限 |

### 2.2 权限矩阵

```
┌─────────────────────────────────────────────────────────────────────┐
│                        权限矩阵                                       │
├──────────────┬─────────┬─────────┬──────────┬───────────┬───────────┤
│ 权限          │ 主刀    │ 助手    │ 专家     │ 协调员    │ 观察员    │
├──────────────┬─────────┬─────────┬──────────┬───────────┬───────────┤
│ 发布视频      │   ✓    │   ✓    │    ✗     │    ✓     │    ✗     │
│ 发布音频      │   ✓    │   ✓    │    ✓     │    ✓     │    ✗     │
│ 观看视频      │   ✓    │   ✓    │    ✓     │    ✓     │    ✓     │
│ 实时标注      │   ✗    │   ✗    │    ✓     │    ✓     │    ✗     │
│ 虚拟器械      │   ✗    │   ✗    │    ✓     │    ✓     │    ✗     │
│ 截图标记      │   ✓    │   ✓    │    ✓     │    ✓     │    ✗     │
│ 切换视频源    │   ✓    │   ✓    │    ✗     │    ✓     │    ✗     │
│ 管理会话      │   ✗    │   ✗    │    ✗     │    ✓     │    ✗     │
│ 查看术前摘要  │   ✓    │   ✓    │    ✓     │    ✓     │    ✓     │
│ 查看时间轴    │   ✓    │   ✓    │    ✓     │    ✓     │    ✓     │
└──────────────┴─────────┴─────────┴──────────┴───────────┴───────────┘
```

---

## 三、简化状态流程

### 3.1 状态简化方案

**当前状态 (11种)**:
```
draft → requested → triaged → expert_assigned → scheduled → ready → live → paused → ended → archived → cancelled
```

**新状态 (4种)**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   等待中    │ ──► │   进行中    │ ──► │   已结束    │ ──► │   已归档    │
│  (waiting)  │     │   (live)    │     │   (ended)   │     │  (archived) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
  ┌─────────┐        ┌─────────┐        ┌─────────┐
  │  取消   │        │  暂停   │        │  取消   │
  │(cancelled)│      │ (paused)│        │(cancelled)│
  └─────────┘        └─────────┘        └─────────┘
```

### 3.2 状态映射表

| 旧状态 | 新状态 | 说明 |
|-------|-------|------|
| draft, requested, triaged, expert_assigned, scheduled, ready | **waiting** | 统称为"等待中" |
| live | **live** | 进行中 |
| paused | **paused** | 暂停（临时状态） |
| ended | **ended** | 已结束，可查看录制 |
| archived | **archived** | 已归档，仅管理员可访问 |
| cancelled | **cancelled** | 已取消 |

### 3.3 状态转换规则

```typescript
// 状态转换逻辑
type SessionState = 'waiting' | 'live' | 'paused' | 'ended' | 'archived' | 'cancelled';

function canTransitionTo(current: SessionState, target: SessionState): boolean {
  const transitions: Record<SessionState, SessionState[]> = {
    'waiting': ['live', 'cancelled'],
    'live': ['paused', 'ended'],
    'paused': ['live', 'ended'],
    'ended': ['archived'],
    'archived': [],
    'cancelled': [],
  };
  return transitions[current]?.includes(target) ?? false;
}

// 自动状态推进
function autoProgressState(session: Session): SessionState {
  // 房间已创建 + 有人连接 → live
  if (session.room_created && session.active_participants > 0) {
    return 'live';
  }
  // 所有人离开 + 曾处于live → ended
  if (session.was_live && session.active_participants === 0) {
    return 'ended';
  }
  return session.state;
}
```

---

## 四、虚拟候诊室设计

### 4.1 候诊室入口逻辑

```
┌─────────────────────────────────────────────────────────────────────┐
│                        入口路由设计                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  用户访问 guidance.vetsphere.cn                                      │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────┐                                │
│  │   会话桥接 (Session Bridge)      │                                │
│  │   检查 vetsphere.cn 登录态       │                                │
│  └─────────────────────────────────┘                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐     ┌─────────────────┐                        │
│  │   有登录态?     │──NO──│   跳转登录页    │                        │
│  └─────────────────┘     └─────────────────┘                        │
│           │ YES                                                      │
│           ▼                                                          │
│  ┌─────────────────────────────────┐                                │
│  │   获取用户角色和会话权限          │                                │
│  └─────────────────────────────────┘                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │   有进行中会话? │                                                 │
│  └─────────────────┘                                                │
│           │                                                          │
│     YES   │   NO                                                    │
│           ▼                                                          │
│  ┌───────────────┐  ┌───────────────┐                               │
│  │ 直达候诊室    │  │ 会话列表页    │                               │
│  │ (最近会话)    │  │ (可新建/选择) │                               │
│  └───────────────┘  └───────────────┘                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 候诊室页面布局

```
┌─────────────────────────────────────────────────────────────────────┐
│                      虚拟候诊室 (Waiting Room)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    会话信息卡片                                │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │  TPLO手术远程指导                    [进行中 ● 绿色]   │ │   │
│  │  │  ──────────────────────────────────────────────────── │ │   │
│  │  │  术式: TPLO胫骨平台截骨术                              │ │   │
│  │  │  患者: 犬 ·病例号 #2026-0417-03                        │ │   │
│  │  │  机构: 北京宠物医院 ·骨科                               │ │   │
│  │  │  ──────────────────────────────────────────────────── │ │   │
│  │  │  预约时间: 14:00 - 16:00                               │ │   │
│  │  │  已进行: 45分钟                                        │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    设备就绪检查                                │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │  🎥 摄像头     ● 已连接 · Logitech C920                │ │   │
│  │  │  🎤 麦克风     ● 已连接 · 内置麦克风                    │ │   │
│  │  │  📶 网络状态   ● 良好 · 35ms延迟                        │ │   │
│  │  │  🖥️ 屏幕       ● 正常                                   │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    当前参与人员                                │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │  🧑‍⚕️ 张医生 (主刀)      ● 已入房                       │ │   │
│  │  │  👨‍⚕️ 王教授 (专家)      ● 已入房                       │ │   │
│  │  │  👩‍⚕️ 李护士 (助手)      ○ 等待中                       │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                                                                │   │
│  │           ┌─────────────────────────────────────┐             │   │
│  │           │     🚪 进入手术室                    │             │   │
│  │           │     (大按钮，一键入房)               │             │   │
│  │           └─────────────────────────────────────┘             │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  快捷操作: [分享观察员链接] [查看术前摘要] [返回会话列表]      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 候诊室核心功能

1. **会话状态卡片** - 一眼看清当前会话状态
2. **设备就绪检查** - 实时检测摄像头/麦克风/网络状态
3. **参与人员列表** - 显示谁已入房、谁在等待
4. **一键入房按钮** - 大按钮，点击即进入手术室
5. **快捷操作栏** - 分享链接、查看摘要等

### 4.4 设备就绪检查实现

```typescript
// 设备状态检测
type DeviceStatus = {
  type: 'camera' | 'microphone' | 'network' | 'screen';
  status: 'ready' | 'warning' | 'error' | 'checking';
  label: string;
  detail?: string;
};

async function checkDeviceStatus(): Promise<DeviceStatus[]> {
  const statuses: DeviceStatus[] = [];
  
  // 摄像头检测
  const cameras = await navigator.mediaDevices.enumerateDevices()
    .then(d => d.filter(d => d.kind === 'videoinput'));
  statuses.push({
    type: 'camera',
    status: cameras.length > 0 ? 'ready' : 'error',
    label: '摄像头',
    detail: cameras[0]?.label || '未检测到',
  });
  
  // 麦克风检测
  const mics = await navigator.mediaDevices.enumerateDevices()
    .then(d => d.filter(d => d.kind === 'audioinput'));
  statuses.push({
    type: 'microphone',
    status: mics.length > 0 ? 'ready' : 'error',
    label: '麦克风',
    detail: mics[0]?.label || '未检测到',
  });
  
  // 网络延迟检测
  const latency = await measureNetworkLatency();
  statuses.push({
    type: 'network',
    status: latency < 100 ? 'ready' : latency < 300 ? 'warning' : 'error',
    label: '网络状态',
    detail: `${latency}ms延迟`,
  });
  
  return statuses;
}
```

---

## 五、角色定制化工作空间

### 5.1 主刀医生视角

```
┌─────────────────────────────────────────────────────────────────────┐
│                      手术室 - 主刀医生视角                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                         主视频区                                │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │                                                            │ │ │
│  │  │     【术野摄像头画面 - 大画面】                            │ │ │
│  │  │      1280x720 或更高分辨率                                 │ │ │
│  │  │                                                            │ │ │
│  │  │     专家标注实时叠加显示:                                  │ │ │
│  │  │      → 箭头指示方向                                        │ │ │
│  │  │      → 线条标记切割路径                                    │ │ │
│  │  │      → 文字提示"注意神经"                                  │ │ │
│  │  │                                                            │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────────┐   │ │
│  │  │  视频源切换:                                             │   │ │
│  │  │  [术野 🎥] [全景 📹] [内窥镜 🔬]                         │   │ │
│  │  │  当前: 术野摄像头                                        │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────┐                                       │
│  │   专家视频小窗            │  ← 右下角悬浮                         │
│  │   🧑‍⚕️ 王教授              │                                       │
│  │   [语音开] [摄像头关]     │                                       │
│  └──────────────────────────┘                                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                        操作工具栏                               │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │  🎤 麦克风: [开/关]  📹 摄像头: [开/关]                   │ │ │
│  │  │  ⚠️ 紧急求助: [一键呼叫]  📸 截图: [标记关键帧]          │ │ │
│  │  │  ────────────────────────────────────────────────────── │ │ │
│  │  │  专家状态: 王教授 ●在线  语音已连接                       │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    简化时间轴 (底部折叠)                        │ │
│  │  ──●──────●─────────●───────────●──────────▶                   │ │
│  │    开始    切皮     骨切开      当前                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**主刀医生核心需求**:
- 术野视频占主要画面
- 专家标注实时显示
- 快速切换视频源
- 紧急求助一键呼叫
- 专家视频小窗确认指导状态

### 5.2 指导专家视角

```
┌─────────────────────────────────────────────────────────────────────┐
│                      手术室 - 专家视角                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    术野视频 + 标注层                            │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │                                                            │ │ │
│  │  │     【接收到的术野画面】                                   │ │ │
│  │  │                                                            │ │ │
│  │  │     ┌────────────────────────────────────────┐            │ │ │
│  │  │     │  ✏️ 标注工具栏 (左侧悬浮)              │            │ │ │
│  │  │     │  ──────────────────────────────────── │            │ │ │
│  │  │     │  [画线 ━]  [箭头 →]  [文字 T]         │            │ │ │
│  │  │     │  [圆圈 ○]  [矩形 □]  [清除 ✕]        │            │ │ │
│  │  │     │  ──────────────────────────────────── │            │ │ │
│  │  │     │  🏥 虚拟器械:                          │            │ │ │
│  │  │     │  [手术刀] [止血钳] [骨钻] [缝合针]    │            │ │ │
│  │  │     └────────────────────────────────────────┘            │ │ │
│  │  │                                                            │ │ │
│  │  │     标注内容实时同步到主刀画面                              │ │ │
│  │  │                                                            │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────┐                                       │
│  │   我的视频小窗            │  ← 右下角悬浮                         │
│  │   🧑‍⚕️ 王教授              │                                       │
│  │   [语音开] [摄像头关]     │                                       │
│  └──────────────────────────┘                                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                        术前摘要面板                             │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │  📋 术前摘要 (可展开/折叠)                               │ │ │
│  │  │  ────────────────────────────────────────────────────    │ │ │
│  │  │  患者信息: 5岁金毛，体重32kg                             │ │ │
│  │  │  诊断: 左后肢胫骨平台骨折                                 │ │ │
│  │  │  手术方案: TPLO截骨+钢板固定                              │ │ │
│  │  │  风险点: 注意腓神经，避免过度切割                         │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                        指导工具栏                               │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │  🎤 语音指导: [开]  📸 截图标记: [标记当前帧]             │ │ │
│  │  │  ⏸️ 暂停建议: [请求暂停]  📝 添加备注: [快速记录]         │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**专家核心需求**:
- 清晰观看术野画面
- 标注工具（画线、箭头、文字）
- 虚拟器械叠加功能
- 术前摘要随时查看
- 语音指导优先级最高

### 5.3 观察员视角（无登录）

```
┌─────────────────────────────────────────────────────────────────────┐
│                      观察室 - 观察员视角                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                         观看视频区                              │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │                                                            │ │ │
│  │  │     【纯观看模式 - 无任何操作按钮】                        │ │ │
│  │  │                                                            │ │ │
│  │  │     接收术野画面                                           │ │ │
│  │  │     可看到专家标注叠加                                     │ │ │
│  │  │                                                            │ │ │
│  │  │     无麦克风、无摄像头权限                                 │ │ │
│  │  │                                                            │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                        会话信息面板                             │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │  📋 TPLO手术远程指导                                      │ │ │
│  │  │  ────────────────────────────────────────────────────    │ │ │
│  │  │  术式: TPLO胫骨平台截骨术                                 │ │ │
│  │  │  患者: 犬 · 北京宠物医院                                  │ │ │
│  │  │  ────────────────────────────────────────────────────    │ │ │
│  │  │  参与者:                                                  │ │ │
│  │  │   🧑‍⚕️ 张医生 (主刀) ●在线                                │ │ │
│  │  │   👨‍⚕️ 王教授 (专家) ●在线                                │ │ │
│  │  │  ────────────────────────────────────────────────────    │ │ │
│  │  │  已进行: 45分钟                                           │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │           观察员: 您以观察身份参与，无发布权限                  │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    离开按钮                                     │ │
│  │           ┌─────────────────────────────────────┐              │ │
│  │           │     🚪 离开观察室                    │              │ │
│  │           └─────────────────────────────────────┘              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**观察员核心需求**:
- 仅观看，无任何操作权限
- 会话信息展示（不涉及隐私详情）
- 简洁界面，无干扰
- 一键离开

---

## 六、实时标注系统设计

### 6.1 标注数据结构

```typescript
// 标注类型定义
type AnnotationType = 
  | 'line'        // 画线
  | 'arrow'       // 箭头
  | 'text'        // 文字
  | 'circle'      // 圆圈
  | 'rectangle'   // 矩形
  | 'instrument'; // 虚拟器械

type Annotation = {
  id: string;
  type: AnnotationType;
  sessionId: string;
  createdBy: string;      // 用户ID
  createdByRole: string;  // 角色
  createdAt: string;      // 时间戳
  
  // 坐标数据（相对于视频画面的百分比）
  position: {
    x: number;  // 0-100
    y: number;  // 0-100
  };
  
  // 类型特定数据
  data: {
    // 线条
    endPosition?: { x: number; y: number };
    
    // 文字
    text?: string;
    fontSize?: number;
    
    // 形状
    radius?: number;      // 圆圈半径
    width?: number;       // 矩形宽度
    height?: number;      // 矩形高度
    
    // 器械
    instrumentType?: 'scalpel' | 'clamp' | 'drill' | 'needle' | 'suction';
  };
  
  // 样式
  style: {
    color: string;        // 默认红色 #FF4444
    strokeWidth?: number;
    opacity?: number;
  };
  
  // 持续时间（可选，默认持续显示）
  duration?: number;      // 毫秒，0表示永久
  
  // 关联的视频帧（可选）
  videoFrameId?: string;
};
```

### 6.2 标注同步机制

使用 LiveKit DataChannel 实现实时标注同步：

```typescript
// 标注同步实现
import { Room, DataPacket_Kind } from 'livekit-client';

const ANNOTATION_TOPIC = 'annotation';

class AnnotationSync {
  private room: Room;
  private annotations: Map<string, Annotation> = new Map();
  
  constructor(room: Room) {
    this.room = room;
    this.setupDataChannel();
  }
  
  private setupDataChannel() {
    // 监听标注数据
    this.room.on('data-received', (payload, participant) => {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(payload.data));
      
      if (data.type === 'annotation') {
        this.handleAnnotation(data.annotation, participant.identity);
      }
    });
  }
  
  // 发送标注
  sendAnnotation(annotation: Annotation) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({
      type: 'annotation',
      annotation,
    }));
    
    this.room.localParticipant.publishData(
      data,
      DataPacket_Kind.RELIABLE,
      { topic: ANNOTATION_TOPIC }
    );
    
    // 本地也保存
    this.annotations.set(annotation.id, annotation);
  }
  
  // 处理接收到的标注
  private handleAnnotation(annotation: Annotation, senderId: string) {
    this.annotations.set(annotation.id, annotation);
    this.renderAnnotation(annotation);
  }
  
  // 渲染标注到视频层
  private renderAnnotation(annotation: Annotation) {
    // 根据类型渲染不同的形状
    const overlay = document.getElementById('annotation-overlay');
    if (!overlay) return;
    
    const element = this.createAnnotationElement(annotation);
    overlay.appendChild(element);
    
    // 如果有持续时间，自动消失
    if (annotation.duration && annotation.duration > 0) {
      setTimeout(() => {
        element.remove();
        this.annotations.delete(annotation.id);
      }, annotation.duration);
    }
  }
  
  private createAnnotationElement(annotation: Annotation): HTMLElement {
    const el = document.createElement('div');
    el.id = `annotation-${annotation.id}`;
    el.style.position = 'absolute';
    el.style.left = `${annotation.position.x}%`;
    el.style.top = `${annotation.position.y}%`;
    el.style.color = annotation.style.color;
    
    switch (annotation.type) {
      case 'arrow':
        // 创建SVG箭头
        el.innerHTML = this.createArrowSVG(annotation);
        break;
      case 'text':
        el.textContent = annotation.data.text || '';
        el.style.fontSize = `${annotation.data.fontSize || 14}px`;
        break;
      case 'instrument':
        el.innerHTML = this.createInstrumentIcon(annotation.data.instrumentType);
        el.style.fontSize = '24px';
        break;
      // ... 其他类型
    }
    
    return el;
  }
}
```

### 6.3 标注工具栏UI组件

```tsx
// 标注工具栏组件
function AnnotationToolbar({ onAnnotation }: { onAnnotation: (a: Annotation) => void }) {
  const [activeTool, setActiveTool] = useState<AnnotationType>('arrow');
  const [color, setColor] = useState('#FF4444');
  
  const tools = [
    { type: 'line', icon: '━', label: '画线' },
    { type: 'arrow', icon: '→', label: '箭头' },
    { type: 'text', icon: 'T', label: '文字' },
    { type: 'circle', icon: '○', label: '圆圈' },
    { type: 'rectangle', icon: '□', label: '矩形' },
    { type: 'clear', icon: '✕', label: '清除' },
  ];
  
  const instruments = [
    { type: 'scalpel', icon: '🔪', label: '手术刀' },
    { type: 'clamp', icon: '🔗', label: '止血钳' },
    { type: 'drill', icon: '⚙️', label: '骨钻' },
    { type: 'needle', icon: '🪡', label: '缝合针' },
    { type: 'suction', icon: '💧', label: '吸引器' },
  ];
  
  return (
    <div className="annotation-toolbar">
      <div className="tool-group">
        <span className="group-label">标注工具</span>
        {tools.map(tool => (
          <button
            key={tool.type}
            className={activeTool === tool.type ? 'active' : ''}
            onClick={() => setActiveTool(tool.type)}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      
      <div className="tool-group">
        <span className="group-label">虚拟器械</span>
        {instruments.map(inst => (
          <button
            key={inst.type}
            onClick={() => setActiveTool('instrument')}
          >
            {inst.icon}
          </button>
        ))}
      </div>
      
      <div className="color-picker">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </div>
    </div>
  );
}
```

### 6.4 标注存储与回放

```typescript
// 标注存储到数据库
async function saveAnnotation(annotation: Annotation) {
  await supabaseAdmin.from('guidance_annotations').insert({
    id: annotation.id,
    session_id: annotation.sessionId,
    created_by: annotation.createdBy,
    created_by_role: annotation.createdByRole,
    annotation_type: annotation.type,
    position_data: annotation.position,
    annotation_data: annotation.data,
    style_data: annotation.style,
    created_at: annotation.createdAt,
    duration_ms: annotation.duration,
    video_frame_id: annotation.videoFrameId,
  });
  
  // 同时记录事件
  await recordGuidanceEvent(
    annotation.sessionId,
    'annotation_added',
    { userId: annotation.createdBy },
    annotation.createdByRole,
    { annotation_id: annotation.id, type: annotation.type }
  );
}

// 标注回放（录制回放时）
async function getAnnotationsForSession(sessionId: string) {
  const { data } = await supabaseAdmin
    .from('guidance_annotations')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  
  return data?.map(row => ({
    id: row.id,
    type: row.annotation_type,
    sessionId: row.session_id,
    createdBy: row.created_by,
    createdByRole: row.created_by_role,
    createdAt: row.created_at,
    position: row.position_data,
    data: row.annotation_data,
    style: row.style_data,
    duration: row.duration_ms,
    videoFrameId: row.video_frame_id,
  }));
}
```

---

## 七、观察员应急入口优化

### 7.1 当前流程 vs 新流程

**当前流程**:
```
登录 → 会话列表 → 详情页 → 生成应急链接 → 复制发送 → 观察员收到 → 输入名字 → 入房
```

**新流程**:
```
分享链接按钮 → 一键生成并复制 → 观察员收到 → 输入名字 → 入房
```

### 7.2 观察员入口页面优化

```tsx
// 简化的观察员入口页面
function ObserverJoinPage({ inviteToken }: { inviteToken: string }) {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  
  async function handleJoin() {
    setLoading(true);
    
    // 直接请求入房凭证，无需任何其他验证
    const response = await fetch('/api/guidance/guest/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteToken,
        guestName: displayName || '观察员',
        role: 'observer',
      }),
    });
    
    const { data } = await response.json();
    
    // 直接入房
    window.location.href = `/room/${data.session_id}?token=${data.token}`;
  }
  
  return (
    <div className="observer-join-page">
      <div className="join-card">
        <h1>进入远程指导观察室</h1>
        <p>您将以观察员身份参与，仅可观看，无发布权限。</p>
        
        <input
          placeholder="您的显示名称（可选）"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        
        <button onClick={handleJoin} disabled={loading}>
          {loading ? '正在连接...' : '立即进入'}
        </button>
      </div>
    </div>
  );
}
```

### 7.3 一键分享链接功能

```tsx
// 候诊室内的分享按钮
function ShareObserverLink({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);
  
  async function handleShare() {
    // 生成一次性观察员链接
    const response = await fetch(`/api/guidance/sessions/${sessionId}/observer-link`, {
      method: 'POST',
    });
    
    const { data } = await response.json();
    const link = data.join_url;
    
    // 复制到剪贴板
    await navigator.clipboard.writeText(link);
    setCopied(true);
    
    // 3秒后恢复
    setTimeout(() => setCopied(false), 3000);
  }
  
  return (
    <button onClick={handleShare} className="share-button">
      {copied ? '✓ 链接已复制' : '🔗 分享观察员链接'}
    </button>
  );
}
```

---

## 八、页面路由重新设计

### 8.1 新路由结构

```
/guidance                    →  角色定向页（自动跳转到对应工作台）
/guidance/sessions           →  会话列表（可选入口）
/guidance/new                →  新建会话
/guidance/[sessionId]        →  虚拟候诊室（等待入房）
/guidance/[sessionId]/room   →  手术室（角色定制化）
/guidance/[sessionId]/ended  →  会话结束页（查看录制）

/join/[inviteToken]          →  观察员/专家应急入口
/join/[inviteToken]/room     →  直接入房（无登录）
```

### 8.2 路由实现

```tsx
// 角色定向页
// /guidance - 自动跳转
async function GuidanceRootPage() {
  const { user, isSyncing, canAccessDoctorWorkspace } = useAuth();
  
  // 正在同步登录态
  if (isSyncing) {
    return <LoadingState message="正在同步登录状态..." />;
  }
  
  // 未登录
  if (!user) {
    redirect('/auth?redirect=/guidance');
  }
  
  // 有进行中的会话
  const activeSession = await getActiveSession(user.id);
  if (activeSession) {
    redirect(`/guidance/${activeSession.id}`);
  }
  
  // 无进行中会话，显示列表
  redirect('/guidance/sessions');
}
```

---

## 九、数据库变更

### 9.1 新增表

```sql
-- 标注表
CREATE TABLE guidance_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES guidance_sessions(id),
  created_by UUID NOT NULL,
  created_by_role TEXT NOT NULL,
  annotation_type TEXT NOT NULL,
  position_data JSONB NOT NULL,
  annotation_data JSONB DEFAULT '{}',
  style_data JSONB DEFAULT '{"color": "#FF4444"}',
  duration_ms INTEGER DEFAULT 0,
  video_frame_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 观察员链接表（一次性令牌）
CREATE TABLE guidance_observer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES guidance_sessions(id),
  token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'observer',
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9.2 状态字段简化

```sql
-- 添加新状态字段（兼容旧状态）
ALTER TABLE guidance_sessions 
ADD COLUMN session_state_v2 TEXT DEFAULT 'waiting';

-- 状态迁移脚本
UPDATE guidance_sessions 
SET session_state_v2 = CASE 
  WHEN status IN ('draft', 'requested', 'triaged', 'expert_assigned', 'scheduled', 'ready') THEN 'waiting'
  WHEN status = 'live' THEN 'live'
  WHEN status = 'paused' THEN 'paused'
  WHEN status = 'ended' THEN 'ended'
  WHEN status = 'archived' THEN 'archived'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'waiting'
END;

-- 创建索引
CREATE INDEX idx_guidance_sessions_state_v2 ON guidance_sessions(session_state_v2);
CREATE INDEX idx_guidance_annotations_session ON guidance_annotations(session_id);
CREATE INDEX idx_guidance_observer_links_token ON guidance_observer_links(token);
```

---

## 十、实施计划

### Phase 1: 基础重构（优先级最高）

**目标**: 简化流程，实现一键入房

1. 创建虚拟候诊室组件
2. 实现角色定向逻辑
3. 简化状态转换
4. 设备就绪检查

**预期时间**: 核心功能上线

### Phase 2: 手术室定制化

**目标**: 角色差异化界面

1. 主刀视角页面
2. 专家视角页面（含标注工具栏）
3. 观察员视角页面
4. 多视频源切换

### Phase 3: 实时标注系统

**目标**: 专家可实时标注指导

1. LiveKit DataChannel集成
2. 标注工具栏组件
3. 标注渲染层
4. 标注数据存储

### Phase 4: 观察员入口优化

**目标**: 一键分享、一键入房

1. 简化应急入口页面
2. 一键分享链接按钮
3. 观察员链接管理

### Phase 5: 虚拟器械叠加

**目标**: 专家远程指导增强

1. 器械图标库
2. 拖拽叠加交互
3. 位置同步

---

## 十一、技术选型

| 功能 | 技术方案 |
|-----|---------|
| 视频通信 | LiveKit (已集成) |
| 实时标注同步 | LiveKit DataChannel |
| 标注渲染 | SVG + CSS Overlay |
| 状态管理 | React Context + SWR |
| 设备检测 | navigator.mediaDevices API |
| 网络延迟 | LiveKit stats API |

---

## 十二、风险与注意事项

1. **兼容性**: 新状态字段需兼容旧状态，提供迁移脚本
2. **标注延迟**: 网络不佳时标注可能延迟，需显示发送状态
3. **隐私保护**: 观察员不应看到敏感患者信息
4. **录制同步**: 标注需与录制时间戳同步，便于回放
5. **权限边界**: 观察员链接需有有效期限制，防止滥用

---

## 附录：关键文件清单

**需要修改的文件**:
- `apps/remote-guidance/src/app/guidance/page.tsx` - 角色定向
- `apps/remote-guidance/src/components/guidance/GuidanceDashboard.tsx` - 简化
- `apps/remote-guidance/src/components/guidance/GuidanceSessionDetailClient.tsx` - 改为候诊室
- `apps/remote-guidance/src/components/guidance/GuidanceRoomPrepClient.tsx` - 角色定制化
- `apps/remote-guidance/src/components/guidance/GuidanceGuestJoinClient.tsx` - 简化

**需要新增的文件**:
- `apps/remote-guidance/src/components/guidance/WaitingRoom.tsx` - 候诊室
- `apps/remote-guidance/src/components/guidance/SurgeonRoom.tsx` - 主刀手术室
- `apps/remote-guidance/src/components/guidance/ExpertRoom.tsx` - 专家手术室
- `apps/remote-guidance/src/components/guidance/ObserverRoom.tsx` - 观察员页面
- `apps/remote-guidance/src/components/guidance/AnnotationToolbar.tsx` - 标注工具栏
- `apps/remote-guidance/src/components/guidance/AnnotationOverlay.tsx` - 标注渲染层
- `apps/remote-guidance/src/lib/annotation-sync.ts` - 标注同步
- `apps/remote-guidance/src/app/api/guidance/sessions/[id]/observer-link/route.ts` - 观察员链接API
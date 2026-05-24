export interface HandbookPageTypeRow {
  type: string;
  route: string;
  bestFor: string;
  outcome: string;
  chain: string;
}

export interface HandbookRuleRow {
  goal: string;
  pageType: string;
}

export interface HandbookWorkflowStep {
  title: string;
  href: string;
  bullets: string[];
}

export interface HandbookRecipe {
  title: string;
  emphasis: string[];
}

export interface HandbookTroubleshootingItem {
  title: string;
  checks: string[];
}

export const HANDBOOK_STATUS = 'Active operator handbook';
export const HANDBOOK_AUDIENCE = ['内容运营', '审核同学', 'AI operators', '增长负责人'];
export const HANDBOOK_SCOPE = ['apps/admin 内容模块', 'apps/intl 公开内容页'];

export const HANDBOOK_PAGE_TYPE_ROWS: HandbookPageTypeRow[] = [
  {
    type: 'Specialty hub',
    route: '/[locale]/specialties/[slug]',
    bestFor: '建立一个专科的主题权威和内容主枢纽。',
    outcome: '把流量继续路由到术式、课程、设备和 FAQ。',
    chain: 'Brief -> Outline -> Draft -> Internal links -> Meta',
  },
  {
    type: 'Procedure page',
    route: '/[locale]/procedures/[slug]',
    bestFor: '解释一个具体术式或临床工作流。',
    outcome: '承接高意图搜索并转入培训与设备决策。',
    chain: 'Brief -> Outline -> Draft -> FAQ -> Meta',
  },
  {
    type: 'Solution page',
    route: '/[locale]/solutions/[slug]',
    bestFor: '解释能力建设、采购路径或项目落地方案。',
    outcome: '把培训、设备与实施路径串成一个 adoption story。',
    chain: 'Brief -> Outline -> Draft -> Internal links',
  },
  {
    type: 'Compare page',
    route: '/[locale]/compare/[slug]',
    bestFor: '帮助诊所比较两个方案、设备或路径。',
    outcome: '把调查阶段流量转成咨询、课程或设备探索。',
    chain: 'Brief -> Outline -> Draft -> Claim review -> Meta',
  },
  {
    type: 'Resource page',
    route: '/[locale]/resources/[slug]',
    bestFor: '提供 checklist、worksheet、实施指引。',
    outcome: '用实操资料支撑转化并带来回访。',
    chain: 'Brief -> Outline -> Draft -> FAQ',
  },
  {
    type: 'FAQ hub',
    route: '/[locale]/faq/[slug]',
    bestFor: '承接高频疑问和 answer intent。',
    outcome: '补齐 GEO 覆盖，缩短答疑路径。',
    chain: 'Brief -> FAQ extract -> Draft',
  },
  {
    type: 'Glossary term',
    route: '/[locale]/glossary/[slug]',
    bestFor: '解释一个关键术语并链接深层页面。',
    outcome: '增强 semantic coverage 与内链网络。',
    chain: 'Brief -> Draft -> Internal links',
  },
  {
    type: 'Case page',
    route: '/[locale]/cases/[slug]',
    bestFor: '呈现 source-led 的案例语境和推理过程。',
    outcome: '提升高阶受众对专业度和可信度的判断。',
    chain: 'Brief -> Outline -> Draft -> Claim review',
  },
];

export const HANDBOOK_ROUTING_RULES: HandbookRuleRow[] = [
  { goal: '定义一个完整专科地图', pageType: 'Specialty hub' },
  { goal: '解释一个命名术式或临床工作流', pageType: 'Procedure page' },
  { goal: '比较两种治疗或设备路径', pageType: 'Compare page' },
  { goal: '给诊所一个可执行 checklist 或 worksheet', pageType: 'Resource page' },
  { goal: '把培训、设备与实施路径串成解决方案', pageType: 'Solution page' },
  { goal: '集中回答一组重复问题', pageType: 'FAQ hub' },
  { goal: '解释跨页面反复出现的术语', pageType: 'Glossary term' },
  { goal: '做 source-driven 的示例或病例解释', pageType: 'Case page' },
];

export const HANDBOOK_ROUTE_BUCKETS = [
  { contentType: 'specialty_hub', route: '/specialties' },
  { contentType: 'procedure', route: '/procedures' },
  { contentType: 'solution', route: '/solutions' },
  { contentType: 'compare_page', route: '/compare' },
  { contentType: 'resource', route: '/resources' },
  { contentType: 'faq_hub', route: '/faq' },
  { contentType: 'glossary_term', route: '/glossary' },
  { contentType: 'case', route: '/cases' },
];

export const HANDBOOK_PUBLISH_CONDITIONS = [
  'content_records.workflow_state = published',
  'content_site_views.publish_status = published',
  'content_site_views.route_status = active',
];

export const HANDBOOK_PLACEMENT_LOGIC = [
  'content_type 决定页面进入哪个公开列表和详情路由。',
  'is_featured 决定是否在公开列表中抬升为重点内容。',
  'display_order 决定同一列表里的展示排序。',
  'primary_specialty、primary_procedure、target_audience、search_intent 决定应如何围绕它构建相邻内容簇。',
];

export const HANDBOOK_WORKFLOW_STEPS: HandbookWorkflowStep[] = [
  {
    title: 'Planning',
    href: '/content/calendar',
    bullets: [
      '从 topic idea 或 campaign need 开始时，先在排期与 Brief 里建计划。',
      '补齐 target audience、search intent、primary angle。',
      '若页面对应既有内容对象，绑定 content ID，再跳去 AI 工作台。',
    ],
  },
  {
    title: 'AI drafting',
    href: '/ai/studio',
    bullets: [
      '只走结构化 task chain，不走 free chat。',
      '推荐顺序：brief planner -> outline -> draft -> FAQ/internal links/meta。',
      '临近发布前再跑 claim review 和 publish readiness checker。',
    ],
  },
  {
    title: 'Editing',
    href: '/content',
    bullets: [
      '优先确认 opening answer、summary、section headings。',
      '确保 references 可追溯、FAQ 不重复、SEO 不堆词。',
      '必要时补 slug、特色标签和站点视图。',
    ],
  },
  {
    title: 'Review queue',
    href: '/content/review',
    bullets: [
      'approve 只用于事实安全且结构完整的页面。',
      'request changes 用于 topic 正确但证据或编辑质量未达标。',
      'reject and archive 只在页面不应继续留在 active program 时使用。',
    ],
  },
  {
    title: 'Schedule and publish',
    href: '/content/calendar',
    bullets: [
      '通过 readiness 的页面会进入可排期候选池。',
      '一旦排期，会出现在 scheduled panel 与 review queue。',
      '只有 readiness 全部通过后才执行 publish。',
    ],
  },
];

export const HANDBOOK_RECIPES: HandbookRecipe[] = [
  {
    title: 'Specialty hub',
    emphasis: ['capability map', 'procedure clusters', 'training pathway', 'equipment readiness', 'FAQ cluster'],
  },
  {
    title: 'Procedure page',
    emphasis: ['indications and decision framing', 'training progression', 'equipment implications', 'workflow guardrails', 'adjacent comparisons and FAQs'],
  },
  {
    title: 'Compare page',
    emphasis: ['decision criteria', 'clinic fit by capability level', 'equipment and training tradeoffs', 'high-trust framing without unsupported claims'],
  },
  {
    title: 'Resource page',
    emphasis: ['checklist structure', 'implementation steps', 'handoff and team readiness', 'printable or skimmable formatting'],
  },
];

export const HANDBOOK_QUALITY_CHECKLIST = [
  '标题必须具体，且和业务目标、临床语境相关。',
  'Opening answer 要能在首屏快速回答用户主问题。',
  '正文必须有可扫读的 section headings。',
  'References 必须存在，并且 human-auditable。',
  '页面应该自然链接回其所属内容图谱。',
  '不能留下 unsupported medical 或 procurement claims。',
  '工作流状态、site view 与 route status 必须同时指向可发布值。',
];

export const HANDBOOK_RECOMMENDED_MIX = [
  'Specialty hubs: orthopedics, neurosurgery, soft tissue, ophthalmology。',
  'Procedure pages: TPLO, TTA, fracture fixation, external fixation, patellar luxation, hemilaminectomy。',
  'Compare pages: 高意图替代关系，如 TPLO vs TTA。',
  'Resource pages: 诊所执行型资产，如 pre-op checklist。',
  'Solution pages: 把 capability building、equipment readiness、training adoption 串起来。',
];

export const HANDBOOK_TROUBLESHOOTING: HandbookTroubleshootingItem[] = [
  {
    title: '页面在 admin 可见，但公开站没有出现',
    checks: [
      'workflow_state 是否已经是 published。',
      'site publish status 是否已经是 published。',
      'route status 是否仍为 active。',
      'content type 是否正确落在目标 bucket。',
      'slug 是否有效且未被错误覆盖。',
    ],
  },
  {
    title: 'AI 输出很弱或很泛',
    checks: [
      'Brief 是否足够具体。',
      'Target audience 是否清楚。',
      'Search intent 是否清楚。',
      'Primary angle 是否具体。',
      '知识库是否有足够 source material。',
    ],
  },
  {
    title: '页面类型选错了',
    checks: [
      'Checklist 应该进 resource page，而不是 specialty hub。',
      'Decision matrix 应该进 compare page，而不是 procedure page。',
      'Whole-specialty authority page 应该进 specialty hub，而不是 solution page。',
    ],
  },
];

export const HANDBOOK_PUBLIC_COLLECTIONS = [
  { label: 'Specialties', href: 'https://vetsphere.net/en/specialties' },
  { label: 'Procedures', href: 'https://vetsphere.net/en/procedures' },
  { label: 'Solutions', href: 'https://vetsphere.net/en/solutions' },
  { label: 'Compare', href: 'https://vetsphere.net/en/compare' },
  { label: 'Resources', href: 'https://vetsphere.net/en/resources' },
  { label: 'FAQ', href: 'https://vetsphere.net/en/faq' },
  { label: 'Glossary', href: 'https://vetsphere.net/en/glossary' },
  { label: 'Cases', href: 'https://vetsphere.net/en/cases' },
];

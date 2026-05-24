import Link from 'next/link';
import { BookOpen, Compass, Route, ShieldCheck, Sparkles } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import {
  HANDBOOK_AUDIENCE,
  HANDBOOK_PAGE_TYPE_ROWS,
  HANDBOOK_PLACEMENT_LOGIC,
  HANDBOOK_PUBLIC_COLLECTIONS,
  HANDBOOK_PUBLISH_CONDITIONS,
  HANDBOOK_QUALITY_CHECKLIST,
  HANDBOOK_RECIPES,
  HANDBOOK_RECOMMENDED_MIX,
  HANDBOOK_ROUTE_BUCKETS,
  HANDBOOK_ROUTING_RULES,
  HANDBOOK_SCOPE,
  HANDBOOK_STATUS,
  HANDBOOK_TROUBLESHOOTING,
  HANDBOOK_WORKFLOW_STEPS,
} from '@/lib/content-operations-handbook';

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ContentOperationsHandbookPage() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_42%),linear-gradient(135deg,#ffffff_0%,#f8fffc_48%,#ecfdf5_100%)]" padding="lg">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <BookOpen className="h-3.5 w-3.5" />
              Intl content operations handbook
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">国际站内容运营手册</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              给内容运营、审核、AI 操作与增长负责人直接使用的后台手册。这里集中说明页面类型怎么选、公开页如何生成、AI 链路怎么跑，以及发布前应该检查什么。
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Status: {HANDBOOK_STATUS}</span>
              {HANDBOOK_AUDIENCE.map((item) => (
                <span key={item} className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Audience: {item}</span>
              ))}
              {HANDBOOK_SCOPE.map((item) => (
                <span key={item} className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Scope: {item}</span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
            <Link href="/content/dashboard">
              <Button className="w-full justify-start" variant="secondary" icon={<Compass className="h-4 w-4" />}>
                内容面板
              </Button>
            </Link>
            <Link href="/content/calendar">
              <Button className="w-full justify-start" variant="secondary" icon={<Route className="h-4 w-4" />}>
                排期与 Brief
              </Button>
            </Link>
            <Link href="/content/review">
              <Button className="w-full justify-start" variant="secondary" icon={<ShieldCheck className="h-4 w-4" />}>
                审核队列
              </Button>
            </Link>
            <Link href="/ai/studio">
              <Button className="w-full justify-start" icon={<Sparkles className="h-4 w-4" />}>
                AI 工作台
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="space-y-4" padding="lg">
          <SectionTitle
            eyebrow="Page Type Matrix"
            title="先判断页面类型，再开始写内容"
            description="这个系统不是 generic blog。页面类型会直接决定公开路由、列表归属、内容结构和后续 AI task chain。"
          />

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Page type</th>
                  <th className="px-4 py-3">Public route</th>
                  <th className="px-4 py-3">Best used for</th>
                  <th className="px-4 py-3">Business outcome</th>
                  <th className="px-4 py-3">Recommended AI chain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {HANDBOOK_PAGE_TYPE_ROWS.map((row) => (
                  <tr key={row.type} className="align-top">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.route}</td>
                    <td className="px-4 py-3 text-slate-600">{row.bestFor}</td>
                    <td className="px-4 py-3 text-slate-600">{row.outcome}</td>
                    <td className="px-4 py-3 text-slate-600">{row.chain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="space-y-4" padding="lg">
          <SectionTitle
            eyebrow="Routing Rule"
            title="如果目标不清，先按业务目标选型"
            description="运营同学在建页前先做这一层分流，能显著减少选错 page type 的返工。"
          />
          <div className="space-y-3">
            {HANDBOOK_ROUTING_RULES.map((rule) => (
              <div key={rule.goal} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">If the main goal is</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{rule.goal}</p>
                <p className="mt-2 text-sm text-emerald-700">Create this: {rule.pageType}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4" padding="lg">
          <SectionTitle
            eyebrow="Generation Logic"
            title="公开页怎么出现"
            description="新增页面不需要开发再加硬编码路由，但必须把 content type、site view 与 publish 状态配对正确。"
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Route bucket mapping</p>
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2">content_type</th>
                      <th className="px-3 py-2">bucket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {HANDBOOK_ROUTE_BUCKETS.map((item) => (
                      <tr key={item.contentType}>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{item.contentType}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">{item.route}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">Publish conditions</p>
                <div className="mt-3">
                  <BulletList items={HANDBOOK_PUBLISH_CONDITIONS} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">Placement logic</p>
                <div className="mt-3">
                  <BulletList items={HANDBOOK_PLACEMENT_LOGIC} />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-4" padding="lg">
          <SectionTitle
            eyebrow="Public Collections"
            title="公开站的内容桶"
            description="运营在后台改完后，可以直接去这些集合页 spot check 列表位置、featured 状态和跳转表现。"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {HANDBOOK_PUBLIC_COLLECTIONS.map((collection) => (
              <a
                key={collection.href}
                href={collection.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                <p className="text-sm font-semibold text-slate-900">{collection.label}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">{collection.href.replace('https://vetsphere.net', '')}</p>
              </a>
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-4" padding="lg">
        <SectionTitle
          eyebrow="Workflow"
          title="标准操作链路"
          description="运营动作应该从规划到 AI、从编辑到审核，再进入排期与发布，而不是反复在多个入口来回切。"
        />
        <div className="grid gap-4 xl:grid-cols-5">
          {HANDBOOK_WORKFLOW_STEPS.map((step, index) => (
            <div key={step.title} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">
                  {index + 1}
                </span>
                <Link href={step.href} className="text-xs font-medium text-emerald-700 hover:text-emerald-800">
                  打开入口
                </Link>
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900">{step.title}</h3>
              <div className="mt-3">
                <BulletList items={step.bullets} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4" padding="lg">
          <SectionTitle
            eyebrow="AI Recipes"
            title="不同 page type 的提示重点"
            description="不要用同一套 prompt 去写所有页面。页面类型一旦不同，最应该强调的信息结构也不同。"
          />
          <div className="grid gap-4 md:grid-cols-2">
            {HANDBOOK_RECIPES.map((recipe) => (
              <div key={recipe.title} className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-900">{recipe.title}</h3>
                <div className="mt-3">
                  <BulletList items={recipe.emphasis} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4" padding="lg">
          <SectionTitle
            eyebrow="Pre-Publish"
            title="发布前检查"
            description="任何准备 publish 的页面都必须过完这张清单。它本质上是内容质量、证据治理和路由状态的交集。"
          />
          <div className="rounded-lg border border-slate-200 p-4">
            <BulletList items={HANDBOOK_QUALITY_CHECKLIST} />
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-sm font-semibold text-emerald-900">当前建议的第一波 production mix</p>
            <div className="mt-3">
              <BulletList items={HANDBOOK_RECOMMENDED_MIX} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="space-y-4" padding="lg">
        <SectionTitle
          eyebrow="Troubleshooting"
          title="常见问题排查"
          description="当页面不上线、AI 输出泛或 page type 选错时，先按下面的局部检查项回溯，不要直接重做整页。"
        />
        <div className="grid gap-4 xl:grid-cols-3">
          {HANDBOOK_TROUBLESHOOTING.map((item) => (
            <div key={item.title} className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <div className="mt-3">
                <BulletList items={item.checks} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

import { Link } from 'react-router-dom'
import type { components } from '@/types/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CoverSilhouette } from '@/components/common/CoverSilhouette'

type CampaignSummary = components['schemas']['CampaignSummary']

/** 场次类型闭集映射；契约枚举外的值不在这里兜底文案。 */
const TYPE_LABEL: Record<CampaignSummary['type'], string> = {
  FLASH: '限时抢购',
  NORMAL: '普通售卖',
  DISCOUNT: '折扣返场',
}

export function campaignTypeLabel(type: CampaignSummary['type']): string {
  return TYPE_LABEL[type]
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 开售时刻展示到分钟：M月d日 HH:mm；非法时刻返回空串。 */
export function formatStartAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

interface CampaignCardProps {
  readonly campaign: CampaignSummary
}

/**
 * 场次卡：场次名、关联商品、开售时刻、类型；整卡跳抢购页。
 * 倒计时数字只在首页右栏主角位渲染，列表项只展示开售时刻；不拉详情配额字段。
 */
export function CampaignCard({ campaign }: CampaignCardProps) {
  const code = `C-${String(campaign.id).padStart(2, '0')}`

  return (
    <Link to={`/campaigns/${campaign.id}`} className="group block min-w-0">
      <Card className="overflow-hidden border border-line transition-colors group-hover:border-line-2">
        <div className="relative h-[96px] overflow-hidden bg-ink-800">
          {campaign.coverUrl ? (
            <img
              src={campaign.coverUrl}
              alt={campaign.name}
              className="h-full w-full object-contain p-3"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <CoverSilhouette variant="box" className="h-10 w-10" />
            </div>
          )}
          <span className="absolute bottom-2 right-3 font-mono text-[11px] tracking-widest text-faint">
            {code}
          </span>
        </div>
        <div className="p-3.5">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline">{TYPE_LABEL[campaign.type]}</Badge>
            <span className="text-[11px] text-faint">{formatStartAt(campaign.startAt)}</span>
          </div>
          <h3 className="mt-2 truncate text-[14px] font-medium text-foreground">{campaign.name}</h3>
          <p className="mt-1 truncate text-[12px] text-muted">{campaign.productName}</p>
        </div>
      </Card>
    </Link>
  )
}

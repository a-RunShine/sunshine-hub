import { Link } from 'react-router-dom'
import type { CampaignSummary } from '@/api/campaign'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CoverSilhouette } from '@/components/common/CoverSilhouette'
import { DiagonalSurface } from '@/components/common/DiagonalSurface'
import { pad2 } from '@/lib/format'

const TYPE_LABEL: Record<CampaignSummary['type'], string> = {
  FLASH: '限时抢购',
  NORMAL: '普通售卖',
  DISCOUNT: '折扣返场',
}

export function formatStartAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

interface CampaignCardProps {
  readonly campaign: CampaignSummary
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <Link to={`/campaigns/${campaign.id}`} className="group block min-w-0">
      <Card className="overflow-hidden rounded-[2px] border border-line border-t-2 border-t-accent bg-ink-900 shadow-none transition-colors group-hover:border-line-2">
        <div className="relative h-[112px] overflow-hidden bg-ink-900">
          <DiagonalSurface variant="card" />
          {campaign.coverUrl ? (
            <img
              src={campaign.coverUrl}
              alt={campaign.name}
              className="relative z-[2] h-full w-full -rotate-2 object-contain p-3 drop-shadow-[0_14px_20px_rgba(0,0,0,0.72)] transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="relative z-[2] flex h-full items-center justify-center">
              <CoverSilhouette variant="box" className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="rounded-[2px] border-line text-[13px] text-[#c4cac6]">
              {TYPE_LABEL[campaign.type]}
            </Badge>
            <span className="text-[13px] tabular-nums text-[#c4cac6]">
              {formatStartAt(campaign.startAt)}
            </span>
          </div>
          <h3 className="mt-2.5 truncate text-[16px] font-semibold text-foreground">
            {campaign.name}
          </h3>
          <p className="mt-1 truncate text-[13px] text-[#c4cac6]">{campaign.productName}</p>
        </div>
      </Card>
    </Link>
  )
}

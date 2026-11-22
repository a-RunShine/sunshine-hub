import type { ProductSummary } from '@/api/catalog'
import { CoverSilhouette } from '@/components/common/CoverSilhouette'
import { silhouetteVariant } from './silhouette'

type CoverPlacement = 'tile' | 'lead' | 'accordion'

interface ProductCoverProps {
  readonly product: ProductSummary
  readonly placement?: CoverPlacement
}

const VIRTUAL_IMAGE_CLASSES: Record<CoverPlacement, string> = {
  tile: 'max-h-[158px] w-auto max-w-[88%] -rotate-2 object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.76)] transition-transform duration-300 group-hover:scale-[1.035]',
  lead: 'max-h-[250px] w-auto max-w-[94%] -rotate-3 object-contain drop-shadow-[0_24px_32px_rgba(0,0,0,0.72)] transition-transform duration-300 group-hover:scale-[1.03]',
  accordion:
    'block max-h-[365px] w-[min(88%,620px)] -rotate-2 select-none object-contain drop-shadow-[0_26px_34px_rgba(0,0,0,0.82)] transition-transform duration-300 ease-out group-hover:scale-[1.025] max-[860px]:max-h-[210px] max-[860px]:w-[min(92%,340px)]',
}

const PHYSICAL_IMAGE_CLASSES: Record<CoverPlacement, string> = {
  tile: 'studio-mask max-h-[158px] w-auto max-w-[88%] object-contain transition-transform duration-300 group-hover:scale-[1.035]',
  lead: 'studio-mask max-h-[245px] w-auto max-w-[92%] object-contain transition-transform duration-300 group-hover:scale-[1.03]',
  accordion:
    'studio-mask block aspect-[800/500] h-auto max-h-full w-auto max-w-[min(94%,640px)] select-none object-contain transition-transform duration-300 ease-out group-hover:scale-[1.025] max-[860px]:max-w-[min(96%,354px)]',
}

const SILHOUETTE_CLASSES: Record<CoverPlacement, string | undefined> = {
  tile: undefined,
  lead: 'h-[112px] w-auto text-[#4f5954]',
  accordion: 'h-[112px] w-auto text-[#4f5954]',
}

export function ProductCover({ product, placement = 'tile' }: ProductCoverProps) {
  if (!product.coverUrl) {
    return (
      <CoverSilhouette
        variant={silhouetteVariant(product)}
        className={SILHOUETTE_CLASSES[placement]}
      />
    )
  }

  return (
    <img
      src={product.coverUrl}
      alt={product.name}
      className={
        product.kind === 'VIRTUAL'
          ? VIRTUAL_IMAGE_CLASSES[placement]
          : PHYSICAL_IMAGE_CLASSES[placement]
      }
    />
  )
}

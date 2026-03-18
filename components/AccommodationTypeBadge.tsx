import { getAccommodationTypeById, getTypeLabelFromId, getTypeIcon, resolveAccommodationTypeId } from '@/lib/accommodationTypes'

interface Props {
  typeId: string | null | undefined
  variant?: 'full' | 'compact' | 'icon'
  className?: string
}

function PrestigeStars({ count }: { count: number }) {
  return (
    <span className="flex gap-px">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < count ? 'text-[#C9A84C]' : 'text-dark/20'} style={{ fontSize: 10 }}>
          ★
        </span>
      ))}
    </span>
  )
}

export default function AccommodationTypeBadge({ typeId, variant = 'compact', className = '' }: Props) {
  const resolved = resolveAccommodationTypeId(typeId)
  const typeInfo = resolved ? getAccommodationTypeById(resolved) : null
  const icon = getTypeIcon(typeId)
  const label = getTypeLabelFromId(typeId)
  const isCustom = !resolved && !!typeId

  if (variant === 'icon') {
    return <span title={label} className={className}>{icon}</span>
  }

  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <span>{icon}</span>
        <span>{label}</span>
        {isCustom && (
          <span className="ml-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">personnalisé</span>
        )}
      </span>
    )
  }

  // variant === 'full'
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
      {typeInfo && (
        <>
          <span className="text-dark/30">—</span>
          <PrestigeStars count={typeInfo.prestige} />
        </>
      )}
      {isCustom && (
        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">personnalisé</span>
      )}
    </span>
  )
}

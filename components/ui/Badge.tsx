import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'gold' | 'success' | 'warning' | 'error'
}

const variants = {
  default: 'bg-beige-100 text-dark/70 border-beige-300',
  gold: 'bg-gold-50 text-gold-700 border-gold-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
}

export default function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span className={cn('badge', variants[variant], className)}>
      {children}
    </span>
  )
}

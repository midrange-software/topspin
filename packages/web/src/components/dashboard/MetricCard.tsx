import { Card, CardContent } from '@/components/ui/card'

type MetricCardProps = {
  label: string
  value: string | number
  sub?: string
}

export function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

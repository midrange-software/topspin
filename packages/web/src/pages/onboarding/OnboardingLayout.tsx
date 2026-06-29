import { Fragment } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const steps = [
  { path: '/onboarding/create-org', label: 'Create Organization' },
  { path: '/onboarding/connect-github', label: 'Connect GitHub' },
  { path: '/onboarding/connect-jira', label: 'Connect Jira' },
  { path: '/onboarding/sync', label: 'Sync Data' },
]

export function OnboardingLayout() {
  const { pathname } = useLocation()
  const currentIndex = steps.findIndex((s) => s.path === pathname)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex h-16 items-center border-b px-8">
        <span className="text-lg font-semibold tracking-tight">Backspin</span>
      </div>
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <nav className="mb-10" aria-label="Setup progress">
          <ol className="flex items-start">
            {steps.map((step, i) => {
              const isComplete = i < currentIndex
              const isActive = i === currentIndex
              return (
                <Fragment key={step.path}>
                  <li className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium',
                        isComplete
                          ? 'border-primary bg-primary text-primary-foreground'
                          : isActive
                            ? 'border-primary text-primary'
                            : 'border-muted-foreground/30 text-muted-foreground',
                      )}
                    >
                      {isComplete ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <p
                      className={cn(
                        'mt-1 hidden text-center text-xs font-medium sm:block',
                        isActive ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {step.label}
                    </p>
                  </li>
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        'mt-4 h-px flex-1',
                        i < currentIndex ? 'bg-primary' : 'bg-border',
                      )}
                    />
                  )}
                </Fragment>
              )
            })}
          </ol>
        </nav>
        <Outlet />
      </div>
    </div>
  )
}

import { RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/lib/theme'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { store } from '@/app/store'
import { router } from '@/router'

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Provider store={store}>
          <RouterProvider router={router} />
          <Toaster />
        </Provider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

import { createRootRoute, createRoute } from '@tanstack/react-router'
import { RootLayout } from './routes/__root'
import { JukeboxPage } from './routes/index'
import { AnalyzePage } from './routes/analyze'
import { AboutPage } from './routes/about'

const rootRoute = createRootRoute({ component: RootLayout })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: JukeboxPage,
})

const analyzeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analyze',
  component: AnalyzePage,
})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  analyzeRoute,
  aboutRoute,
])

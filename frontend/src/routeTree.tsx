import { createRootRoute, createRoute } from '@tanstack/react-router'
import { RootLayout } from './routes/__root'
import { JukeboxPage } from './routes/index'
import { ScanPage } from './routes/scan-frame'
import { AboutPage } from './routes/about'

const rootRoute = createRootRoute({ component: RootLayout })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: JukeboxPage,
})

const scanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scan',
  component: ScanPage,
})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  scanRoute,
  aboutRoute,
])

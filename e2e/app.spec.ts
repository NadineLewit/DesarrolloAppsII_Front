import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

const project = {
  id: 7,
  name: 'Bacheo Centro',
  location: 'Centro',
  estimatedBudget: 100000,
  estimatedStartDate: '2026-09-22',
  estimatedDurationDays: 10,
  physicalProgress: 25,
  budgetProgress: 20,
  status: 'BORRADOR',
}

const order = {
  id: 12,
  origin: 'PROYECTO',
  projectId: 7,
  description: 'Reparar calzada',
  location: 'Centro',
  priority: 'ALTA',
  status: 'PENDIENTE',
  hasEvidence: false,
}

const pageResponse = (content: unknown[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
})

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

async function mockApi(page: Page, options: {
  invalidLogin?: boolean
  dashboardFailsOnce?: boolean
  role?: string
} = {}) {
  let dashboardAttempts = 0
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (path.endsWith('/auth/login')) {
      if (options.invalidLogin) return json(route, { message: 'Credenciales inválidas' }, 401)
      return json(route, { accessToken: 'e2e-token', username: 'tester', role: 'PERSONAL_OBRAS' })
    }
    if (path.endsWith('/auth/me')) return json(route, { username: 'tester', role: options.role ?? 'PERSONAL_OBRAS' })
    if (path.endsWith('/auth/logout')) return route.fulfill({ status: 204 })
    if (path.endsWith('/dashboard/summary')) {
      dashboardAttempts += 1
      if (options.dashboardFailsOnce && dashboardAttempts === 1) {
        return json(route, { message: 'Servicio no disponible' }, 503)
      }
      return json(route, {
        asOfDate: '2026-11-03', totalProjects: 1, activeProjects: 1, openWorkOrders: 1,
        externalWorkOrders: 0, delayedWorkOrders: 0, delayedProjects: 0,
        averagePhysicalProgress: 25, estimatedBudget: 100000, approvedBudget: 100000,
        usedBudget: 20000, budgetProgress: 20, crewLoads: [],
      })
    }
    if (path.endsWith('/projects')) return json(route, pageResponse([project]))
    if (path.endsWith('/work-orders')) return json(route, pageResponse([order]))
    if (path.endsWith('/resources')) {
      return json(route, { crews: [{ id: 1, nombre: 'Cuadrilla Alfa' }], materials: [], machinery: [] })
    }
    if (path.endsWith('/street-closures')) return json(route, pageResponse([]))
    return json(route, { message: `Mock faltante para ${path}` }, 404)
  })
}

async function seedSession(page: Page, role = 'PERSONAL_OBRAS') {
  await page.addInitScript(({ selectedRole }) => {
    window.sessionStorage.setItem('obras-publicas-session', JSON.stringify({
      name: 'tester', role: selectedRole, accessToken: 'e2e-token',
    }))
    window.sessionStorage.setItem('obras-publicas-access-token', 'e2e-token')
  }, { selectedRole: role })
}

test('E2E-01: inicia sesión y abre el tablero', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByLabel('Nombre de usuario').fill('tester')
  await page.getByLabel('Contraseña').fill('clave-segura')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: 'Tablero operativo' })).toBeVisible()
  await expect(page.getByText('Bacheo Centro')).toBeVisible()
})

test('E2E-02: rechaza credenciales inválidas sin crear sesión', async ({ page }) => {
  await mockApi(page, { invalidLogin: true })
  await page.goto('/')
  await page.getByLabel('Nombre de usuario').fill('tester')
  await page.getByLabel('Contraseña').fill('incorrecta')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('alert')).toContainText('Credenciales inválidas')
  expect(await page.evaluate(() => sessionStorage.getItem('obras-publicas-session'))).toBeNull()
})

test('E2E-03: navega por proyectos, órdenes, recursos y cortes', async ({ page }) => {
  await seedSession(page)
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Proyectos' }).click()
  await expect(page.getByText('Bacheo Centro')).toBeVisible()
  await page.getByRole('button', { name: 'Ordenes' }).click()
  await expect(page.getByText('OT #12 - Reparar calzada')).toBeVisible()
  await page.getByRole('button', { name: 'Recursos' }).click()
  await expect(page.getByText('Cuadrilla Alfa')).toBeVisible()
  await page.getByRole('button', { name: 'Cortes' }).click()
  await expect(page.getByRole('heading', { name: 'Cortes de calle' })).toBeVisible()
})

test('E2E-04: aplica permisos de rol en la interfaz', async ({ page }) => {
  await seedSession(page, 'INSPECTOR_OBRA')
  await mockApi(page, { role: 'INSPECTOR_OBRA' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Proyectos' }).click()
  await expect(page.getByRole('button', { name: 'Crear' })).toBeDisabled()
})

test('E2E-05: informa una caída y recupera la pantalla al reintentar', async ({ page }) => {
  await seedSession(page)
  await mockApi(page, { dashboardFailsOnce: true })
  await page.goto('/')
  await expect(page.getByText('Servicio no disponible')).toBeVisible()
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText('Obras activas')).toBeVisible()
})

test('E2E-06: no presenta violaciones de accesibilidad serias o críticas', async ({ page }) => {
  await seedSession(page)
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tablero operativo' })).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  const blocking = results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
})

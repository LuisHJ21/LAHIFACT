import { test, expect, type Page } from "@playwright/test";

async function openAdmin(page: Page, mobile: boolean, count = 12) {
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).slice(0, 7);
  const companies = Array.from({ length: count }, (_, index) => ({ id: index + 1, name: `Empresa ${String(index + 1).padStart(2, "0")} con una razón social extensa`, ruc: String(20100000000 + index), status: "active" }));
  const plan = { id: 1, name: "Plan empresarial", monthly_price: "100", annual_price: "1000", monthly_quota: 100, annual_quota: 1000, user_limit: 5 };
  const period = { id: 1, company_id: 1, quota: 100, user_limit: 5, starts_at: `${month}-01`, ends_at: "2099-01-01", due_at: `${month}-20`, price: "100" };
  const periods = count > 1 ? [period, { ...period, id: 2, company_id: 2, price: "90" }] : [period];
  const payments = [{ id: 1, company_id: 1, billing_period_id: 1, amount: "25", paid_at: `${month}-01`, reference: "Abono del mes" }, { id: 2, company_id: 1, billing_period_id: 1, amount: "10", paid_at: "2020-01-01", reference: "Pago anterior" }, ...(count > 1 ? [{ id: 3, company_id: 2, billing_period_id: 2, amount: "40", paid_at: "2020-01-01", reference: "Pago de otra empresa" }] : [])];
  let fail = false;
  let statusRequests = 0;
  await page.addInitScript(() => sessionStorage.setItem("token", "design-test"));
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const companyId = Number(route.request().headers()["x-company-id"] || 1);
    const invoice = { id: companyId * 100 + 1, document_type: url.searchParams.get("group") === "notes" ? "07" : "01", series: "F001", number: companyId, issued_at: `${month}-01`, status: "draft", environment: "beta", delivered: false,
      customer_snapshot: { name: `Cliente de empresa ${companyId}`, document_number: "20123456789", address: "Dirección fiscal" },
      items: [{ name: "Producto registrado", code: "P001", unit_code: "NIU", quantity: "1", price: "100", tax: "18", total: "118" }],
      totals: { total: "118", subtotal: "100", tax: "18", discount: "0" } };
    const submission = { id: companyId * 10, identifier: `DOC-${companyId}`, kind: "document", status: "queued", message: "Envío registrado", reference_date: `${month}-01`, environment: "beta", document_ids: [invoice.id], xml_path: "document.xml", cdr_path: null };
    if (path.endsWith("/auth/me")) return route.fulfill({ json: { id: 1, name: "María Pérez Administradora", role: "admin", email: "admin@example.test", company_id: null } });
    if (path.endsWith("/catalogs")) return route.fulfill({ json: {} });
    if (path.endsWith("/admin")) return route.fulfill({ status: fail ? 503 : 200, json: fail ? { message: "Administración no disponible" } : { companies, plans: [plan], users: [], periods, payments, subscriptions: companies.map((company) => ({ company_id: company.id, plan_id: 1, frequency: "monthly" })) } });
    if (path.endsWith("/account")) {
      const selectedPeriod = periods.find((item) => item.company_id === companyId) || { ...period, company_id: companyId };
      return route.fulfill({ json: { status: "suspended", period: selectedPeriod, subscription: { plan, frequency: "monthly" }, periods: periods.filter((item) => item.company_id === companyId), payments: payments.filter((payment) => payment.company_id === companyId), available: 100, consumed: 0, reserved: 0 } });
    }
    if (path.endsWith("/invoices")) return route.fulfill({ json: { data: [invoice], total: 1, current_page: 1, last_page: 1, from: 1, to: 1 } });
    if (/\/invoices\/\d+$/.test(path)) return route.fulfill({ json: { invoice, submissions: [submission] } });
    if (path.endsWith("/submissions")) return route.fulfill({ json: { data: [submission], total: 1, current_page: 1, last_page: 1, from: 1, to: 1 } });
    if (/\/submissions\/\d+\/xml$/.test(path)) return route.fulfill({ contentType: "application/xml", body: "<document />" });
    if (path.endsWith("/dashboard")) return route.fulfill({ json: { sales: "0", tax: "0", invoice_count: 0, customer_count: 0, days: [], recent: [], account: { status: "active", period, subscription: { plan, frequency: "monthly" }, available: 100, consumed: 0, reserved: 0 } } });
    if (path.endsWith("/status")) {
      statusRequests++;
      companies[0].status = route.request().postDataJSON().status;
      return route.fulfill({ json: companies[0] });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto("/");
  if (mobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Panel administrador", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Administración", exact: true })).toBeVisible();
  return { fail: () => { fail = true; }, recover: () => { fail = false; }, requests: () => statusRequests };
}

test("perfil accesible, búsqueda, paginación y métricas con estado real de servicio", async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openAdmin(page, isMobile);
  const topbar = page.locator(".topbar");
  await expect(topbar.getByText("Sesión activa")).toHaveCount(0);
  await expect(topbar.getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0);
  const profile = page.getByRole("button", { name: "Cuenta de María Pérez Administradora" });
  await profile.click();
  await expect(topbar.getByRole("button", { name: "Cerrar sesión" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(profile).toBeFocused();
  await expect(profile).toHaveAttribute("aria-expanded", "false");
  await profile.click();
  await page.locator(".topbar-company").click();
  await expect(profile).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".stat-card").filter({ hasText: "Pagos registrados del mes" })).toContainText("25.00");
  await expect(page.locator(".service-card")).toContainText("Suspendido");
  await expect(page.locator(".service-card")).toContainText("65.00");
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await expect(page.locator(".pager")).toContainText("Mostrando 11–12 de 12");
  await page.getByLabel("Buscar empresas por nombre o RUC").fill("20100000000");
  await expect(page.locator(".admin-company-table tbody tr")).toHaveCount(1);
  await page.getByLabel("Buscar empresas por nombre o RUC").fill("sin coincidencias");
  await expect(page.getByText("No encontramos empresas")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  await expect(page.locator(".admin-company-table tbody tr")).toHaveCount(10);
  await page.screenshot({ path: testInfo.outputPath("admin-design.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  if (!isMobile) {
    await page.setViewportSize({ width: 1024, height: 768 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  expect(errors).toEqual([]);
});

test("administrador inicia en SaaS y consulta historial separado sin acciones de escritura", async ({ page, isMobile }) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/") && !["GET", "HEAD", "OPTIONS"].includes(request.method())) writes.push(request.url());
  });
  await openAdmin(page, isMobile);
  if (isMobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  const sidebar = page.getByRole("navigation", { name: "Menú principal" });
  for (const name of ["Inicio", "Facturas y boletas", "Notas de crédito / débito", "Resumen diario", "Clientes", "Productos y servicios", "Almacenes", "Configuración SUNAT", "Datos de cuenta"]) {
    await expect(sidebar.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
  if (isMobile) await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Ver detalle de empresa", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Detalle de empresa", exact: true })).toBeVisible();
  await expect(page.getByText("Consulta administrativa de solo lectura.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Historial de comprobantes", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Cliente de empresa 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Emitir comprobante", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver", exact: true }).click();
  const modal = page.getByRole("dialog");
  await expect(modal.getByText("Producto registrado")).toBeVisible();
  for (const name of ["Enviar a SUNAT", "Marcar entregado al cliente", "Dar de baja", "Consultar / reintentar"]) await expect(modal.getByRole("button", { name, exact: true })).toHaveCount(0);
  await expect(modal.getByRole("button", { name: "Imprimir A4", exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await modal.getByRole("button", { name: "XML", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("DOC-1.xml");
  await modal.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: "Notas de crédito y débito", exact: true }).click();
  await expect(page.getByRole("button", { name: "Emitir nota", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Resúmenes y envíos SUNAT", exact: true }).click();
  await expect(page.getByText("DOC-1", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Consultar / reintentar", exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Empresa seleccionada" }).selectOption("2");
  await expect(page.getByRole("heading", { name: "Detalle de empresa", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Historial de comprobantes", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Cliente de empresa 2" })).toBeVisible();
  await expect(page.getByText("Cliente de empresa 1", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Pagos y periodos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pagos y periodos de la empresa", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar pago", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole("button", { name: "Volver a empresas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Administración", exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test("confirmación de estado, error recuperable y selector estático con una empresa", async ({ page, isMobile }) => {
  const controls = await openAdmin(page, isMobile, 1);
  await expect(page.getByRole("combobox", { name: "Empresa seleccionada" })).toHaveCount(0);
  const suspend = page.getByRole("button", { name: /Suspender empresa Empresa 01/ });
  await suspend.click();
  expect(controls.requests()).toBe(0);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(controls.requests()).toBe(0);
  await suspend.click();
  controls.fail();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Administración no disponible");
  await expect(page.locator(".admin-company-table")).toHaveCount(0);
  expect(controls.requests()).toBe(1);
  controls.recover();
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.locator(".admin-company-table")).toContainText("Suspendido");
});

test("sidebar y módulos sincronizados, pagos contextualizados y navegación por teclado", async ({ page, isMobile }, testInfo) => {
  await openAdmin(page, isMobile);
  const tabs = page.getByRole("navigation", { name: "Módulos administrativos" });
  const sidebar = page.getByRole("navigation", { name: "Menú principal" });
  if (isMobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  await sidebar.getByRole("button", { name: "Administración: Planes", exact: true }).click();
  await expect(tabs.getByRole("button", { name: "Planes", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("combobox", { name: "Empresa seleccionada" }).selectOption("2");
  await expect(tabs.getByRole("button", { name: "Planes", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Crear plan", exact: true })).toBeVisible();
  await tabs.getByRole("button", { name: "Usuarios", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(tabs.getByRole("button", { name: "Usuarios", exact: true })).toHaveAttribute("aria-current", "page");
  if (isMobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(sidebar.getByRole("button", { name: "Administración: Usuarios", exact: true })).toHaveAttribute("aria-current", "page");
  await sidebar.getByRole("button", { name: "Administración: Empresas", exact: true }).click();
  await page.locator(".service-card").getByRole("button", { name: "Ver pagos y vencimientos" }).click();
  const filter = page.getByLabel("Filtrar pagos por empresa");
  await expect(filter).toHaveValue("2");
  await expect(page.getByRole("table", { name: "Pagos registrados", exact: true }).locator("tbody tr")).toHaveCount(1);
  await expect(page.getByRole("table", { name: "Pagos registrados", exact: true })).toContainText("Pago de otra empresa");
  await expect(page.getByRole("table", { name: "Periodos y saldos" })).toContainText("50.00");
  await expect(page.locator(".stat-card").filter({ hasText: "Pagos registrados del mes" })).toContainText("25.00");
  await page.getByRole("button", { name: "Registrar pago", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Empresa y periodo").locator("option")).toHaveCount(2);
  await expect(page.getByRole("dialog").getByLabel("Empresa y periodo")).toContainText("Empresa 02");
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
  await filter.selectOption("3");
  await expect(page.getByText("No hay periodos para esta selección")).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar pago", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Ver todas las empresas", exact: true }).click();
  await expect(filter).toHaveValue("");
  await expect(page.getByRole("table", { name: "Pagos registrados", exact: true }).locator("tbody tr")).toHaveCount(3);
  if (isMobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(sidebar.getByRole("button", { name: "Administración: Pagos y vencimientos", exact: true })).toHaveAttribute("aria-current", "page");
  if (isMobile) await page.keyboard.press("Escape");
  if (!isMobile) {
    for (const width of [360, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
  }
  await page.screenshot({ path: testInfo.outputPath("admin-payments-context.png"), fullPage: true });
  if (!isMobile) {
    await sidebar.getByRole("button", { name: "Administración: Empresas", exact: true }).click();
    for (const width of [360, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const panel = await page.locator(".admin-panel").boundingBox();
      const service = await page.locator(".service-card").boundingBox();
      expect(panel).not.toBeNull();
      expect(service).not.toBeNull();
      if (width >= 1700) expect(service!.x).toBeGreaterThanOrEqual(panel!.x + panel!.width);
      else expect(service!.y).toBeGreaterThanOrEqual(panel!.y + panel!.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
  }
});

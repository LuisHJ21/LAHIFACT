import { test, expect, type Page } from "@playwright/test";

async function openWarehouses(page: Page, mobile: boolean) {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("empresa@lahifact.local");
  await page.getByLabel("Contraseña", { exact: true }).fill("LahifactLocal2026!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Resumen de tu negocio" })).toBeVisible();
  if (mobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("navigation", { name: "Menú principal" }).getByRole("button", { name: "Almacenes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Almacenes", exact: true })).toBeVisible();
}

test("almacenes distingue carga, vacío, búsqueda y error recuperable", async ({ page, isMobile }, testInfo) => {
  let fail = false;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/warehouses?**", async (route) => {
    await gate;
    await route.fulfill({
      status: fail ? 503 : 200,
      json: fail ? { message: "No se pudo cargar el directorio." } : { data: [], total: 0, current_page: 1, last_page: 1, from: null, to: null },
    });
  });
  await openWarehouses(page, isMobile);
  await expect(page.getByText("Cargando información…")).toBeVisible();
  release();
  await expect(page.getByText("Aún no hay almacenes")).toBeVisible();
  await expect(page.getByRole("button", { name: "Página siguiente" })).toHaveCount(0);
  await page.getByRole("button", { name: "Crear primer almacén" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Nombre", { exact: true }).fill("Almacén de prueba");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByLabel("Buscar registros").fill("sin coincidencias");
  await expect(page.getByText("No encontramos resultados")).toBeVisible();
  fail = true;
  await page.getByRole("button", { name: "Limpiar búsqueda", exact: true }).last().click();
  await expect(page.getByRole("alert")).toContainText("No se pudo cargar el directorio.");
  await expect(page.getByText("Aún no hay almacenes")).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByText("Aún no hay almacenes")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("warehouses-empty.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("almacenes conserva datos ante validación y conecta creación, edición y búsqueda reales", async ({ page, isMobile }, testInfo) => {
  await openWarehouses(page, isMobile);
  await page.getByRole("button", { name: "Nuevo registro", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  const name = `Almacén E2E ${Date.now()}`;
  await dialog.getByLabel("Nombre", { exact: true }).fill(name);
  await dialog.getByLabel("Dirección", { exact: true }).fill("Dirección de prueba");
  let finishValidation: () => void = () => {};
  const validation = new Promise<void>((resolve) => { finishValidation = resolve; });
  await page.route("**/api/v1/warehouses", async (route) => {
    if (route.request().method() === "POST") {
      await validation;
      await route.fulfill({ status: 422, json: { message: "Datos inválidos", errors: { name: ["Revisa el nombre del almacén."] } } });
    }
    else await route.continue();
  });
  await dialog.getByRole("button", { name: "Guardar registro" }).click();
  await expect(dialog.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  finishValidation();
  await expect(dialog.getByLabel("Nombre", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByLabel("Nombre", { exact: true })).toHaveValue(name);
  await expect(dialog.locator(".field-error")).toContainText("Revisa el nombre");
  await page.unroute("**/api/v1/warehouses");
  await dialog.getByRole("button", { name: "Guardar registro" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel("Buscar registros").fill(name);
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Editar" }).click();
  await dialog.getByLabel("Dirección", { exact: true }).fill("Dirección actualizada");
  await dialog.getByRole("button", { name: "Guardar registro" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(row).toContainText("Dirección actualizada");
  await expect(page.locator(".pager")).toContainText("Mostrando 1–1 de 1 registros");
  if (!isMobile) {
    await page.getByRole("button", { name: "Contraer menú" }).click();
    await expect(page.locator(".sidebar")).toHaveCSS("width", "80px");
    await expect(page.getByRole("navigation").getByRole("button", { name: "Almacenes", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: "Expandir menú" }).click();
  } else {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await expect(page.getByRole("dialog", { name: "Navegación de LAHIFACT" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar menú", exact: true }).last()).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("dialog").getByRole("button", { name: "Cerrar sesión" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Cerrar menú", exact: true }).last()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Abrir menú" })).toBeFocused();
  }
  await page.screenshot({ path: testInfo.outputPath("warehouses-results.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("tablet permite contraer navegación y paginar sin mostrar resultados obsoletos ante errores", async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, "La revisión de tablet usa el navegador de escritorio.");
  await page.setViewportSize({ width: 1024, height: 768 });
  let fail = false;
  await page.route("**/api/v1/warehouses?**", async (route) => {
    const current = Number(new URL(route.request().url()).searchParams.get("page"));
    await route.fulfill({ status: fail ? 503 : 200, json: fail
      ? { message: "No se pudo cargar el directorio." }
      : { data: [{ id: current, name: `Almacén página ${current}`, address: "Dirección de prueba" }], current_page: current, last_page: 2, total: 2, from: current, to: current } });
  });
  await openWarehouses(page, false);
  await expect(page.getByRole("button", { name: "Página anterior" })).toBeDisabled();
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Almacén página 2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
  await expect(page.locator(".pager")).toContainText("Mostrando 2–2 de 2 registros");
  await page.getByRole("button", { name: "Contraer menú" }).click();
  await expect(page.locator(".sidebar")).toHaveCSS("width", "80px");
  await page.screenshot({ path: testInfo.outputPath("warehouses-tablet.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  fail = true;
  await page.getByRole("button", { name: "Página anterior" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.locator(".pager")).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Almacén página 1" })).toBeVisible();
});

import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email = "empresa@lahifact.local") {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill(email);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("LahifactLocal2026!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Resumen de tu negocio" }),
  ).toBeVisible();
}
async function navigate(page: Page, name: string, mobile: boolean) {
  if (mobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .getByRole("navigation", { name: "Menú principal" })
    .getByRole("button", { name, exact: true })
    .click();
}
test("registra una factura al contado y exige configuración antes del envío", async ({
  page,
  isMobile,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  await navigate(page, "Facturas y boletas", isMobile);
  await page
    .getByRole("button", { name: "Emitir comprobante", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Cliente", exact: true })
    .selectOption({ label: "20100070970 · Cliente de ejemplo" });
  await dialog.getByRole("button", { name: /Producto de ejemplo/ }).click();
  await dialog.getByLabel("quantity 1").fill("2");
  await dialog.getByLabel("Descuento global (%)").fill("10");
  await dialog.getByRole("button", { name: "Registrar comprobante" }).click();
  await expect(page.getByRole("dialog")).toContainText("Pago al contado");
  await expect(page.getByRole("dialog")).toContainText("212.40");
  await page.getByRole("button", { name: "Enviar a SUNAT" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Configura el certificado digital",
  );
  await page.screenshot({
    path: testInfo.outputPath("invoice.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
test("crea y edita un cliente desde el directorio", async ({
  page,
  isMobile,
}) => {
  await login(page);
  await navigate(page, "Clientes", isMobile);
  await page.getByRole("button", { name: "Nuevo registro" }).click();
  const dialog = page.getByRole("dialog");
  const unique = String(Date.now()).slice(-8);
  await dialog.getByLabel("Tipo de documento").selectOption("1");
  await dialog.getByLabel("Número de documento").fill(unique);
  await dialog
    .getByLabel("Razón social o nombre")
    .fill(`Cliente E2E ${unique}`);
  await dialog.getByRole("button", { name: "Guardar registro" }).click();
  await expect(dialog).not.toBeVisible();
  const row = page
    .getByRole("row")
    .filter({ hasText: `Cliente E2E ${unique}` });
  await row.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Teléfono").fill("987654321");
  await page.getByRole("button", { name: "Guardar registro" }).click();
  await expect(row).toContainText("987654321");
});
test("el administrador puede revisar pagos y abrir una empresa", async ({
  page,
  isMobile,
}) => {
  await login(page, "admin@lahifact.local");
  await navigate(page, "Panel administrador", isMobile);
  await expect(
    page.getByRole("heading", { name: "Administración", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pagos y vencimientos" }).click();
  await expect(
    page.getByRole("heading", { name: "Programación de pagos" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page.getByRole("button", { name: "Abrir empresa" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Resumen de tu negocio" }),
  ).toBeVisible();
});

export type Company = {
  id: number;
  ruc: string;
  name: string;
  address: string;
  ubigeo: string;
  department: string;
  province: string;
  district: string;
  status: string;
  environment: "beta" | "production";
  has_credentials?: boolean;
  has_certificate?: boolean;
};
export type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "owner" | "operator";
  company_id: number | null;
  company?: Company;
};
export type Catalog = { code: string; description: string };
export type Catalogs = Record<string, Catalog[]>;
export type Customer = {
  id: number;
  name: string;
  document_type: string;
  document_number: string;
  address: string;
  email?: string;
  phone?: string;
};
export type Product = {
  id: number;
  name: string;
  code: string;
  price: string;
  kind: string;
  tax_code: string;
  tax_rate: string;
  unit_code: string;
  image_path?: string;
};
export type Series = {
  id: number;
  code: string;
  document_type: string;
  next_number: number;
  establishment_id: number;
};
export type Item = {
  product_id: number;
  code: string;
  name: string;
  quantity: string;
  price: string;
  unit_code: string;
  tax_code: string;
  tax_rate: string;
  base: string;
  tax: string;
  total: string;
  discount: string;
  discount_percent: string;
};
export type Totals = {
  total: string;
  tax: string;
  subtotal: string;
  taxable: string;
  exonerated: string;
  unaffected: string;
  discount: string;
};
export type Invoice = {
  id: number;
  document_type: string;
  series: string;
  number: number;
  issued_at: string;
  status: string;
  environment: string;
  delivered: boolean;
  customer_id: number;
  customer_snapshot: Customer;
  company_snapshot: Company;
  totals: Totals;
  items: Item[];
  reason?: string;
  reason_code?: string;
  reference_id?: number;
};
export type Submission = {
  id: number;
  kind: string;
  identifier: string;
  reference_date: string;
  status: string;
  ticket?: string;
  message?: string;
  response_code?: string;
  xml_path?: string;
  cdr_path?: string;
  document_ids: number[];
  environment: string;
};
export type Period = {
  id: number;
  company_id: number;
  quota: number;
  user_limit: number;
  starts_at: string;
  ends_at: string;
  due_at: string;
  price: string;
};
export type Plan = {
  id: number;
  name: string;
  monthly_quota: number;
  annual_quota: number;
  user_limit: number;
  monthly_price: string;
  annual_price: string;
};
export type Payment = {
  id: number;
  company_id: number;
  billing_period_id: number;
  amount: string;
  paid_at: string;
  reference: string;
};
export type Account = {
  period: Period;
  consumed: number;
  reserved: number;
  available: number;
  status: string;
  subscription: { frequency: string; plan: Plan };
  payments: Payment[];
  periods: Period[];
};
export type Page<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
};
export const money = (value: string | number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
    Number(value),
  );
export const date = (value: string) =>
  value.slice(0, 10).split("-").reverse().join("/");
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const documentNames: Record<string, string> = {
  "01": "Factura",
  "03": "Boleta",
  "07": "Nota de crédito",
  "08": "Nota de débito",
};
export const statusNames: Record<string, string> = {
  draft: "Registrado",
  queued: "En cola",
  sending: "Enviando",
  pending: "Pendiente de CDR",
  uncertain: "Por consultar",
  blocked: "Configuración pendiente",
  accepted: "Aceptado",
  rejected: "Rechazado",
  voided: "Anulado",
};

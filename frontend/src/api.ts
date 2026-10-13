import axios from "axios";
export const api = axios.create({
  baseURL: "/api/v1",
  headers: { Accept: "application/json" },
  timeout: 30000,
});
export const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const errors = error.response?.data?.errors;
    return errors
      ? Object.values(errors).flat().join(" ")
      : error.response?.data?.message || "No se pudo conectar con el servidor.";
  }
  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado.";
};
export async function download(path: string, filename: string) {
  const { data } = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

# Implementación del diseño administrativo de LAHIFACT

## 1. Estado actual del panel

El administrador gestiona el SaaS y consulta los registros operativos de las empresas clientes desde un detalle separado. Inicia directamente en Administración y su sidebar no incluye los módulos operativos del cliente.

- Módulos administrativos: Empresas, Planes, Pagos y vencimientos, y Usuarios. `Panel administrador` abre Empresas.
- `Ver detalle de empresa` sustituye al acceso anterior al dashboard operativo del cliente.
- Los indicadores son globales; Estado del servicio corresponde a la empresa activa. Este alcance se explica en la interfaz.
- `NAVBAR_LAHIFACT.md` prevalece para la barra superior. No hay búsqueda global ni indicador “Sesión activa”; ayuda y notificaciones dependen de fuentes válidas.
- Se conserva la marca azul del sidebar, alineada con la barra superior de 72 px. En pantallas pequeñas aparece un símbolo compacto de marca en la barra.
- El perfil contiene el acceso superior a cerrar sesión; se conserva el acceso del sidebar. Ambos usan el mismo manejador y servicio de sesión.
- El selector de empresa solo es interactivo para administradores con más de una empresa. Nombre y RUC proceden del contexto real.
- La configuración administrativa genérica no está definida y no se añade un acceso sin función.

## 2. Matriz de permisos y alcance de solo lectura

| Operación | Administrador SaaS |
|---|---|
| Registrar empresas y gestionar planes, usuarios, pagos y estado del servicio | Permitido en los módulos administrativos |
| Consultar historiales operativos de clientes | Permitido desde el detalle de empresa |
| Imprimir y descargar XML/CDR disponibles | Permitido |
| Emitir comprobantes o notas | No permitido |
| Enviar, reenviar o reintentar operaciones SUNAT | No permitido |
| Anular documentos o marcar su entrega | No permitido |
| Modificar catálogos o configuración operativa del cliente | No permitido |

`Invoices` e `InvoiceDetail` fuerzan el modo de consulta para el rol administrador, además de aceptar el modo explícito de solo lectura. `CompanyAccess.php` rechaza métodos HTTP no seguros del administrador en las rutas operativas protegidas por ese middleware. Las operaciones administrativas de `/admin` conservan su autorización propia; los usuarios clientes mantienen sus permisos operativos existentes.

### Solo lectura operativa y mantenimiento interno

La restricción impide al administrador crear o modificar registros operativos de clientes. No significa que todas las consultas sean lecturas pasivas de la base de datos.

`GET /account` utiliza `SubscriptionService::account()`, que llama a `current()`. Ese servicio puede crear periodos de facturación faltantes y actualizar el periodo asociado a cuotas reservadas, como parte del mantenimiento automático existente de suscripciones.

Un método HTTP seguro no garantiza por sí solo ausencia de efectos internos. Este comportamiento se conserva; eliminarlo durante las consultas requeriría un cambio adicional de arquitectura y reglas de servicio, no implementado en este rediseño.

## 3. Navegación, detalle de empresa e interacciones

### Navegación principal

- Sidebar y pestañas usan la lista compartida de `frontend/src/adminNavigation.ts` y un único estado en `frontend/src/App.tsx`.
- Cambiar de empresa conserva el módulo administrativo principal: Empresas, Planes, Pagos o Usuarios.
- Los accesos directos a Pagos desde el sidebar muestran todas las empresas.
- Las pestañas son botones de navegación mediante Tab/Shift+Tab y Enter/Espacio, sin roles ARIA de tabs incompletos.
- Los KPI globales no cambian al seleccionar una empresa o filtrar pagos.

### Detalle de empresa

`frontend/src/pages/CompanyDetail.tsx` reúne estas secciones:

1. Información y servicio.
2. Historial de comprobantes.
3. Notas de crédito y débito.
4. Resúmenes y envíos SUNAT.
5. Pagos y periodos.

Los historiales permiten consultar, filtrar y paginar registros existentes. `SubmissionHistory` consulta envíos por tipo y fecha mediante GET; `Account` muestra el historial financiero sin controles de escritura.

Al cambiar de empresa dentro del detalle se desmonta la vista anterior: `useData` cancela sus solicitudes pendientes mediante `AbortController`. Se reinician la sección del detalle, los filtros locales y el documento abierto. La nueva empresa comienza en **Información y servicio**; no conserva las selecciones del cliente anterior. Esto es distinto de conservar el módulo administrativo principal.

### Estados y acciones

- Perfil: iniciales por palabras, apertura con teclado, foco en la acción y cierre con Escape, clic exterior o salida del foco.
- Empresas: búsqueda por nombre/RUC, paginación, contador, estados vacíos diferenciados y formulario real de registro.
- Suspensión/reactivación: confirmación, bloqueo de envíos duplicados y refresco de datos. Un fallo de refresco no mantiene abierta una confirmación ya ejecutada.
- Administración: skeletons, error con reintento y ocultación de datos obsoletos tras una consulta fallida.
- Servicio: carga y error recuperable independientes del módulo principal.
- Pagos: filtro visible aplicado a periodos y pagos. En Administración, el acceso desde Estado del servicio preselecciona la empresa activa y `Ver todas las empresas` elimina el filtro. Dentro del detalle, el acceso abre la sección Pagos y periodos de esa empresa.
- El formulario administrativo de registro de pagos solo ofrece periodos de la empresa filtrada y se deshabilita si no hay periodos.
- Tras guardar un registro administrativo se cierra el formulario y se refrescan los datos. Si falla la actualización del selector de empresas, se informa que la operación ya se guardó para evitar repetirla.

### Responsive

- KPI en cuatro/dos/una columnas, menú contraíble y drawer móvil.
- Desplazamiento de tablas contenido dentro del panel, sin scroll horizontal de página en los escenarios verificados.
- En el módulo Empresas, la columna lateral de servicio aparece desde 1700 px; en anchos inferiores se apila debajo del módulo.
- El detalle de empresa tiene su propia cuadrícula de información/servicio, que se apila hasta 1200 px.

## 4. Componentes y API utilizadas

### Componentes y stack

- React, TypeScript, Vite, Tailwind y Lucide, con los tokens existentes de `frontend/src/styles.css`.
- Contexto de empresa/sesión y componentes `PageHeader`, `Modal`, `Empty`, `Loading`, `ErrorBox`, `Pager` y `useData`.
- Componentes administrativos: `AdminCompanies`, `ServiceStatusCard` y `UserProfile`.
- Consulta de empresa: `CompanyDetail`, `SubmissionHistory`, `Invoices`, `InvoiceDetail` y `Account`.
- Formateadores compartidos: `money`, `date` y `today`.

### Fuentes de consulta

Los paths siguientes son relativos al prefijo real `/api/v1`.

| Endpoint | Uso |
|---|---|
| `GET /admin` | Empresas, usuarios, planes, suscripciones, periodos y pagos del conjunto administrado |
| `GET /account` | Estado efectivo, plan, periodo, cuotas y pagos de la empresa seleccionada |
| `GET /invoices` | Historial paginado de comprobantes y notas, con filtros |
| `GET /invoices/{id}` | Detalle del documento y seguimiento SUNAT |
| `GET /invoices/{id}/qr` | QR utilizado en la impresión del documento |
| `GET /submissions` | Historial paginado de envíos, filtrable por tipo y fecha |
| `GET /submissions/{id}/xml` | Descarga del XML disponible |
| `GET /submissions/{id}/cdr` | Descarga del CDR disponible |

Para el administrador, `X-Company-Id` establece el contexto de las consultas operativas. El backend resuelve la empresa y filtra los registros por ella, incluidos detalle de comprobantes y descargas. Para usuarios clientes se utiliza la empresa asignada al usuario, no una selección arbitraria enviada en el header. La interfaz no sustituye estos controles.

Los endpoints administrativos existentes de creación, cambio de plan, registro de pagos y actualización de estado se mantienen bajo `/admin`.

## 5. Definiciones de métricas y fechas

| Indicador o dato | Definición |
|---|---|
| Empresas | Cantidad devuelta por `/admin`, incluyendo empresas suspendidas |
| Usuarios | Cantidad devuelta por `/admin`, incluyendo administradores de plataforma |
| Suscripciones registradas | Cantidad de asignaciones de plan, sin inferir actividad efectiva |
| Pagos registrados del mes | Suma de importes por mes de `paid_at`, usando el mes actual en `America/Lima` |
| Vencimiento de la tabla de empresas | Vencimiento del último periodo registrado, según el orden de `/admin`; no implica próximo vencimiento |
| Periodo del panel de servicio | Periodo recibido de `/account`, con fecha final exclusiva |
| Saldo del periodo | Importe del periodo menos sus pagos registrados, con mínimo cero |
| Pagos recientes | Orden por fecha de pago descendente, con desempate por identificador |

La moneda se formatea mediante `money` en PEN. Los pagos del mes no representan facturación electrónica ni una nueva definición contable de ingresos. El estado efectivo del servicio procede del backend; no se deduce únicamente del saldo del periodo mostrado o de una fecha. Los pagos recientes no representan auditoría ni atribuyen responsables o momentos de registro no disponibles.

## 6. Limitaciones y dependencias

### Funciones pendientes de una fuente real

| Función | Estado y dependencia |
|---|---|
| Notificaciones | Bloqueada: no hay endpoint de pendientes/contador en las rutas inspeccionadas |
| Ayuda y soporte | Bloqueada: faltan un destino de guía y un canal de contacto definidos |
| Actividad administrativa | Bloqueada: falta una fuente de auditoría; pagos recientes es una sección distinta |
| Suscripciones activas | Adaptación disponible: se muestran suscripciones registradas; falta el estado efectivo agregado |

No se muestran botones sin acción, contadores inventados ni ejemplos como operaciones reales.

### Paginación y rendimiento

`GET /admin` devuelve colecciones completas. Empresas filtra y pagina localmente, diez filas por página: esto reduce las filas visibles, pero **no reduce los registros descargados ni el trabajo del servidor**. El filtro administrativo de pagos también se aplica sobre esas colecciones completas. `/account` devuelve los periodos y pagos de la empresa sin paginación.

Los historiales de `/invoices` y `/submissions` sí utilizan paginación del backend.

Mejora futura, no implementada: separar KPI agregados de listados paginados y filtrados en servidor, preservando los alcances y permisos. Revisar también los historiales financieros cuando crezca su volumen. Esta evolución requeriría definir los contratos API correspondientes.

## 7. Última verificación registrada

**Referencia:** tercera revisión, separación del administrador y consulta operativa de solo lectura. Son resultados de las ejecuciones anteriores de implementación, no de esta actualización documental.

Las ejecuciones anteriores no registraron aquí una marca temporal ni una revisión Git del código probado. No se asignan retroactivamente. En futuras verificaciones, registrar fecha/hora y commit o referencia del estado de trabajo, indicando si existen cambios sin commit.

| Comando o comprobación | Resultado registrado |
|---|---|
| `npm run build` | Correcto |
| `npx playwright test tests/admin-design.spec.ts` | 8 correctos en escritorio/móvil |
| `npm run test:e2e` | 19 correctos y 1 omitido por diseño: tablet en el proyecto móvil |
| `docker compose exec -T api php artisan test --compact tests/Feature/BillingTest.php` | 19 correctos, 115 aserciones |
| Pint sobre `CompanyAccess.php` y `BillingTest.php` | Correcto, por rutas explícitas |
| `git diff --check` | Correcto |

### Alcance de la evidencia

- Las pruebas de `admin-design.spec.ts` usan respuestas controladas exclusivamente en Playwright. Verifican navegación, consulta sin controles de escritura, descarga XML, cambio de empresa y retorno a Administración.
- La suite E2E también incluye pruebas contra los servicios reales de desarrollo: emisión por usuarios clientes, creación/edición de clientes, consulta administrativa y navegación/almacenes.
- Las pruebas del backend utilizan SQLite en memoria. Cubren rechazo de escrituras operativas, aislamiento entre empresas, gestión SaaS de planes/pagos y creación operativa por el propietario.
- La aplicación utiliza las API reales; las respuestas controladas no forman parte de producción.
- Los 8 casos administrativos están incluidos en los 19 E2E correctos: no deben sumarse como pruebas distintas. Tampoco se suman los resultados de revisiones anteriores.

Se utilizó el PHP del contenedor existente porque el PHP 8.2 del host no satisface las dependencias del backend. Pint se ejecutó por rutas explícitas porque el contenedor no monta el directorio Git y no admite `--dirty`. La preparación de Boost no añadió dependencias nuevas; sus cambios generados de configuración se restauraron.

## 8. Historial de implementación

### Tercera revisión: administrador separado del espacio operativo

- Menú exclusivo del SaaS, inicio directo en Administración y detalle de empresa separado.
- Historial operativo sin emisión, envío, reintento, baja ni marcado de entrega.
- Restricción explícita del administrador en la API operativa, según instrucción del usuario.
- Resultados de verificación: sección 7.

### Segunda revisión: navegación y contexto

- Sidebar/pestañas sincronizados, módulo principal persistente y pagos filtrados por empresa.
- `npm run build`: correcto.
- `npx playwright test tests/admin-design.spec.ts`: 6 correctos en esa versión de la suite.
- `npx playwright test tests/admin-design.spec.ts --grep "sidebar y módulos"`: 2 correctos al ampliar la validación a 360, 768, 1024, 1440 y 1920 px, sin scroll horizontal de página y con apilado/columna lateral según el ancho.
- `npx playwright test tests/billing.spec.ts tests/interface.spec.ts --grep "el administrador|almacenes|tablet"`: 7 correctos y 1 omitido por diseño.
- En un intento concurrente de build y navegador se observó una recarga del frontend. La ejecución posterior de la suite pasó completa; las comprobaciones finales se realizaron sin ejecutar build y navegador simultáneamente.

### Primera implementación

- Navbar/perfil, tabla de empresas, métricas con fuentes reales y estado del servicio.
- `npm run build`: correcto.
- `npx playwright test tests/admin-design.spec.ts`: 4 correctos en esa versión de la suite.
- `npx playwright test tests/billing.spec.ts tests/interface.spec.ts`: 8 correctos, 1 omitido y 3 fallos iniciales. Dos eran un selector ambiguo corregido con coincidencia exacta; el tercero ocurrió durante el inicio de sesión del primer caso de escritorio.
- `npx playwright test tests/billing.spec.ts --grep "registra una factura|el administrador"`: 4 correctos al repetir los casos afectados.
- `git diff --check`: correcto.

Se preservaron los cambios locales previos del frontend. No se modificaron contratos de API, reglas financieras/tributarias ni servicios SUNAT. El cambio de autorización de la tercera revisión limita al administrador a consulta sobre registros operativos de clientes y conserva sus operaciones administrativas del SaaS.

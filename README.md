# LAHIFACT

El objetivo de esta aplicacion es crear un saas para que nuestros clientes puedan emitir su facturacion a Sunat como son facturas, boletas , notas de credito, notas de debito , comunicacion de baja y envio de resumen diario

# PANEL DEL USUARIO - MENU

Inicio ( Dashboard)
Emitir factura/boleta (venta)
Emitir Nota de credito/debito
Enviar Resumen Diario
Panel de Productos
Panel de clientes
Reportes
Configuracion Sunat
Maestro de Almacenes
Datos de cuenta

# PANEL DEL USUARIO - Dashboard

Debe mostrarme graficos donde pueda ver:

- el importe total de ventas
- NUmero de comprobantes
- IGV estimado
- Numero de clientes
- Ventas de los ultimos 7 dias
  Mostrarme unos widget con los ultimos copmprobantes emitidos
- Acceso rapido a emitir comprobante
- Cantidad de comprobantes disponibles segun el plan contratado

# PANEL DEL USUARIO - Emitir Boleta/factura

Debe haber una tabla donde me muestre el historial de boletas y facturas estilo punto de venta
Filtros: Por rango de fecha | buscar por numero del docuemnto, ruc,dni o cliente | por estado | por tipo
Opcion para emitir comprobante debe tener los siguientes datos

- Seleccion de boleta o factura
- Seleccion de Serie
- Fecha de emision
- cliente ( poderlo buscar por ruc dni o nombre)
- Productos ( se debe buscar por codigo o descripcion para añadirlo)
- Forma de pago (Solo al contado)
- Mostrar resumen de venta
- Imprimir comprobantes formatos A4, ticket segun impresora

Al seleccionar un comprobante debera mostrarme su resumen junto con la opcion de dar de baja

# PANEL DEL USUARIO - Emitir NC o ND

Debe haber una tabla donde me muestre el historial de NC , ND
Filtros: Por rango de fecha | buscar por numero del docuemnto, ruc,dni o cliente | por estado | por tipo
Opcion para emitir nueba nota debe tener los siguientes datos

- Escoger tipo de nota
- Motivo segun catalogo de sunat
- Escoger documento relaciondo de referencia ( debe haber un filtro para buscar documentos por cliente)
- Descripcion del motivo
- importe de ajuste de ser necesario
  mostrar resumen de la nota

# PANEL DEL USUARIO - Resumen diario

Debe haber una tabla donde me muestre el historial de resumenes enviados
Se puede enviar mas de un resumen por fecha
Debe tener un filtro por fecha
Mostrar los documentos pendientes de envio con un check list para seleccionar cuales enviar

# PANEL DEL USUARIO - Clientes

Debe aparecerme el directorio de clientes con la opcion de poder editar sus datos
Filtro de busqueda por nombre o numero de docuento
Una opcion para aagregar un nuevo cliente con las siguientes datos.

- Tipo de documeno por ejemplo DNI | RUC ( busca el catalogo de sunat)
- Razon Social o nombre
- Direccion
- Correo
- telefono

# PANEL DEL USUARIO - Productos

Debe aparecerme el directorio de productos con la opcion de poder editar sus datos
Filtro de busqueda por nombre
Una opcion para aagregar un nuevo producto con las siguientes datos.

- codigo ( autogenerado )
- Nombre
- precio
- Producto o servicio
- Imagen referencial al producto

# PANEL DEL USUARIO - Configuracion Sunat

Aqui se debe configurar el numero ruc de la empresa, su usuario y clave sol , poder subir su certificado digital, y contraseña del certificado.
razón social, domicilio fiscal, ubigeo, establecimientos y series .

# PANEL DEL USUARIO - Datos de cuenta

Cantidad de comprobantes disponibles
Plan cntratado
Fecha de pago
Historial de pagos
Estado del servicio (activo/suspendido)

# Panel del Administrador

En el panel del administrador quisiera poder administrar mis clientes datos de empresa y usuarios permitidos planes contratados
Configuracion de planes
Programacion de pagos
Reporteria
Ingreso de pago de manera manual

# Configuracion de Planes

- limite de comprobantes segun periodicidad (mensual o anual)
- usuarios permitifos
- Precio Mensual y Anual
- Cada cliente solo puede contratar servicio para un ruc

# Planes y renovacion

- Plan mensual: entrega una bolsa de comprobantes para cada periodo mensual de contratacion.
- Plan anual: entrega una unica bolsa de comprobantes para todo el periodo anual, sin renovaciones mensuales.
- El ciclo se determina por la fecha de contratacion, no por el mes o anio calendario.

# Restriccions

- Al llegar al lmite de comprobantes debe darle una alerta al cliente, el cliente puede registrar todo con normalidad pero debe impedir que envie a sunat.
- Si el usuario no paga su recibo se le debe suspender el servicio al dia siguiente, se debe bloquear el crear nuevos registros.
- El comprobante solo debe ser contabilizado al ser aceptado por sunat
- NC/ND, comunicacion de baja no afectan la cantidad de comprobantes disponibles del plan
- En caso de resumen diario solo cuenta la cantidad de boletas emitidas , no toma en cuenta las notas.
- Cupo consmido no se puede devolver de ninguna manera
- La renovacion de cupos es segun periodo de contratacion

# Reglas de consumo de cupos

- El cupo se descuenta unicamente al confirmar la ACEPTACION de SUNAT (CDR aceptado), en el periodo vigente en ese momento.
- El envio, la recepcion de un ticket, y los documentos rechazados o pendientes NO generan consumo definitivo.
- Cada factura o boleta aceptada consume una sola vez, incluso si hubo reintentos.
- Se reserva disponibilidad durante el procesamiento para evitar exceder el limite con envios simultaneos. La reserva se convierte en consumo al confirmar aceptacion y se libera ante rechazo definitivo. Si el resultado es incierto (caida de conexion), se consulta el estado antes de liberar o reenviar.
- Las notas de credito, notas de debito y comunicaciones de baja no consumen cupo.
- El consumo confirmado nunca se devuelve.

# Stack de desarrollo

React para el frontend
TailwindCSS para estilos
Axios para peticiones
Lucide icons
Base de datos Postgres
Usa Docker para el espacio de trabajo
Framework de trabajo laravel con la ultima version de php compatible para el backend
Para la gestion de estados usa el mismo context no instales bibliotecas como son zustand
Usa una paleta de golores basada en azul
Hazlo totalmente responsive para uso web y mobile o tablet

# BACKEND

La documentacion necesaria para la elaboracion de cada XML y las reglas de validacion actuales se encuentra en la carpeta "Documentacion SUNAT"
El excel de reglas de validacion esta actualizado y tambien contiene los catalogos necesarios y los codigos de retorno de la api sunat

# ENDPONITS SUNAT

ambiente de pruebas : https://e-beta.sunat.gob.pe/ol-ti-itcpfegembeta/billService?wsdl
ambiente de produccion: https://e-factura.sunat.gob.pe/ol-tiitcpfegem/billService?wsdl

consulta CDR y estado de envio: https://e-factura.sunat.gob.pe/ol-itwsconscpegem/billConsultService?wsdl

# Recomendaciones

El Sistema deberia poder reintentar el envio de comprobantes automatico si la peticion falla por caida del servicio de sunat

<!-- Quisiera implementar gestion de cajas , almacenes , stock , kardex para planes superiores -->

# Implementación y puesta en marcha

## Decisiones confirmadas

- React y TypeScript, TailwindCSS, Axios, Lucide y Context.
- API Laravel 13 con PHP 8.5, PostgreSQL 18 y colas en base de datos.
- Moneda: soles (`PEN`). Ventas únicamente al contado.
- Precios finales con impuestos incluidos. Afectaciones iniciales: gravada (18 %), exonerada e inafecta.
- Descuentos por ítem y descuento porcentual global. El descuento global se distribuye entre los ítems y se representa mediante descuentos de línea en el XML.
- Alta de empresas, planes, usuarios y pagos desde el administrador; un RUC por empresa.
- Responsable con acceso completo; operador con emisión, notas, resúmenes, clientes y productos.
- Impresión A4 y ticket de 80 mm con QR.
- La suspensión permite consultar y descargar historial; bloquea nuevos registros y envíos. Continúa consultando envíos ya iniciados.
- Reservas pendientes trasladadas al nuevo periodo antes de habilitar nuevos envíos. Consumo único al confirmar aceptación y sin devolución.

## Estructura

```text
backend/                  API, migraciones, servicios, jobs y pruebas
frontend/                 Aplicación React y pruebas de navegador
Documentacion SUNAT/      Guías y Excel de referencia
compose.yaml              Entorno de desarrollo Docker
```

## Instalación con Docker

Requisito: Docker Desktop con contenedores Linux. Ejecutar desde la raíz del proyecto:

```bash
docker compose build
docker compose run --rm api composer install --no-interaction
docker compose run --rm api php -r "file_exists('.env') || copy('.env.example', '.env');"
docker compose run --rm api php artisan key:generate
docker compose run --rm api php artisan migrate --no-interaction
docker compose run --rm api php artisan sunat:import-catalogs
docker compose run --rm api php artisan db:seed --no-interaction
docker compose up -d
```

Generar la clave solo durante la primera instalación. Conservar `APP_KEY`: protege las credenciales y certificados cifrados.

Para iniciar un entorno ya instalado:

```bash
docker compose up -d
```

- Web: **http://localhost:5173**
- API: **http://localhost:8000/api/v1**
- Correos locales de recuperación de contraseña: **http://localhost:8025**

Las variables de PostgreSQL, colas, correo y zona horaria se configuran en `compose.yaml`. Es un entorno de desarrollo. La API conserva esas variables mediante `artisan serve --no-reload`.

### Accesos locales de demostración

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@lahifact.local` | `LahifactLocal2026!` |
| Responsable de empresa | `empresa@lahifact.local` | `LahifactLocal2026!` |

El seeder se limita a ambientes `local` y `testing`. Crea un plan ilustrativo, pago local, series, cliente y productos. El RUC de la empresa de demostración es ficticio: crear una empresa con el RUC de prueba para validar SUNAT.

## Flujo SUNAT

1. El administrador crea una empresa, responsable y contratación.
2. Registra el pago del periodo. El vencimiento inicial es la fecha de inicio de cada periodo.
3. El responsable completa datos fiscales, establecimientos y series en **Configuración SUNAT**.
4. Carga un certificado vigente PFX/P12, contraseña, usuario SOL sin RUC y clave SOL. Para beta utiliza las credenciales de prueba indicadas por SUNAT.
5. Registra clientes y productos y crea una factura o boleta.
6. Revisa el comprobante y pulsa **Enviar a SUNAT**. Las boletas y notas con serie B se informan mediante resumen diario.
7. El worker genera y firma el XML, transmite el ZIP y guarda el CDR o ticket. El scheduler consulta resultados pendientes.
8. Solo la aceptación confirma el consumo. Las notas y bajas no consumen cupo.

La baja requiere un comprobante aceptado, no entregado y dentro del plazo aplicable. Para boletas se utiliza un resumen con estado anulado. La baja no devuelve el consumo confirmado.

Los reintentos de fallas explícitamente temporales usan espera progresiva. Una caída o respuesta duplicada conserva la reserva y pasa a consulta. No se reenvía automáticamente un documento cuyo resultado es incierto. En SUNAT beta, un envío sin ticket y con resultado incierto no puede reconciliarse mediante el servicio de consulta CDR de producción.

La conexión SOAP verifica TLS. Certificados, contraseñas y credenciales se almacenan cifrados; XML y CDR permanecen en almacenamiento privado por empresa y ambiente.

### Documentación y validaciones

`sunat:import-catalogs` lee el Excel proporcionado e importa catálogos, códigos de retorno y filas de referencia de validación, manteniendo la versión de origen. Las referencias no se ejecutan automáticamente como reglas: la API implementa las validaciones del alcance inicial y SUNAT aplica las reglas tributarias al recibir los documentos.

Operaciones gratuitas, exportaciones, ISC, ICBPER, detracciones, percepciones y modificación de cuotas de crédito requieren ampliaciones específicas. Los motivos de notas tienen restricciones según el documento original; el motivo de crédito 13 no corresponde al alcance al contado.

**Pendiente de verificación externa:** envío y aceptación reales en SUNAT beta con RUC y certificado del usuario. Las pruebas locales de CDR utilizan respuestas controladas, no una aceptación real de SUNAT.

## Verificación

```bash
docker compose exec api php artisan test --compact
docker compose exec api vendor/bin/pint --format agent
docker compose exec frontend npm run build
```

Las pruebas del backend fuerzan SQLite en memoria y comprueban esa configuración antes de ejecutar migraciones para aislarlas de PostgreSQL de desarrollo.

Las pruebas de XML cubren factura, boleta, notas de crédito y débito, resumen diario y comunicación de baja. Verifican versiones UBL, fechas, referencias y firmas digitales, incluyendo que una modificación del XML invalide la firma.

Pruebas de navegador contra el entorno local (requieren los datos del seeder):

```bash
npm --prefix frontend ci
npm --prefix frontend exec -- playwright install chromium
npm --prefix frontend run test:e2e
```

Cubren acceso, registro de factura al contado, bloqueo del envío sin configuración, creación y edición de clientes y navegación administrativa en escritorio y móvil. Generan registros de demostración en la base local.

## Operación del entorno

```bash
docker compose logs -f api worker scheduler
docker compose exec api php artisan billing:reconcile
docker compose exec api php artisan queue:restart
docker compose down
```

`docker compose down` conserva la base de datos en el volumen. Los valores comerciales del plan de demostración se pueden modificar desde **Administración → Planes**; cada periodo ya creado conserva sus cupos, precio y límite de usuarios.

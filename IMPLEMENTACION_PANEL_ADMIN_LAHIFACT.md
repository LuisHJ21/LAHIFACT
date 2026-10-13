# LAHIFACT — Implementación de pantallas del panel de administración SaaS

## 1. Objetivo

Implementar en la aplicación existente de **LAHIFACT** un panel administrativo coherente con la propuesta visual de referencia. El panel permitirá administrar y supervisar empresas, planes y suscripciones, pagos y vencimientos, usuarios, reportes y configuración de la plataforma.

La imagen de referencia es una guía visual, no una fuente de datos. Los importes, empresas, usuarios, fechas y métricas que aparecen en ella son ejemplos ilustrativos. En la aplicación se deben utilizar los datos reales disponibles.

**No reconstruir la aplicación desde cero.** Inspeccionar primero el proyecto y adaptar la implementación al framework, la arquitectura, los estilos, las rutas, los servicios y los permisos actuales.

## 2. Reglas fundamentales

1. Mantener la marca LAHIFACT y su identidad azul.
2. Reutilizar el stack tecnológico y las dependencias existentes.
3. Mantener el navbar acordado: logo, botón de menú, empresa activa con RUC, notificaciones, ayuda y perfil del administrador.
4. No incluir en el navbar el buscador global, el indicador “Sesión activa” ni un botón independiente “Cerrar sesión”.
5. La opción para cerrar sesión debe estar dentro del menú desplegable del perfil, si la aplicación ya utiliza ese patrón.
6. Conservar las rutas, permisos y flujos funcionales existentes.
7. No alterar las reglas de facturación electrónica, pagos, vencimientos ni integración con SUNAT.
8. No presentar datos simulados como datos reales.
9. Todos los botones, filtros, pestañas y acciones visibles deben funcionar o identificarse claramente como pendientes.
10. La autorización debe verificarse en el backend; ocultar una acción en la interfaz no sustituye los permisos del servidor.

## 3. Dirección visual

- Panel SaaS empresarial, moderno y sobrio.
- Sidebar azul con navegación agrupada.
- Fondo principal gris azulado claro.
- Paneles claros con bordes sutiles y sombras ligeras.
- Tarjetas con esquinas redondeadas.
- Tipografía sans serif legible e iconografía consistente.
- Espaciado uniforme y diseño responsive para escritorio, tablet y móvil.
- Estados de carga, error, vacío y éxito bien definidos.

### Paleta sugerida

Primero revisar los tokens de marca existentes. Si no hay un sistema definido, usar esta paleta como punto de partida:

| Token | Color | Uso |
|---|---|---|
| `primary` | `#1763E9` | Acciones principales y selección activa |
| `primary-hover` | `#0F50C7` | Hover de acciones |
| `primary-soft` | `#EAF1FF` | Fondos informativos suaves |
| `sidebar` | `#1554D1` | Fondo del menú lateral |
| `sidebar-deep` | `#123F9F` | Variación del menú |
| `page-bg` | `#F4F7FC` | Fondo de contenido |
| `surface` | `#FFFFFF` | Tarjetas y tablas |
| `text-primary` | `#14243D` | Títulos y texto principal |
| `text-secondary` | `#657795` | Descripciones y metadatos |
| `border` | `#E0E8F3` | Bordes y divisores |
| `success` | `#0CA678` | Activo, pagado o correcto |
| `success-soft` | `#E1F7EE` | Fondo de estado correcto |
| `warning` | `#B7791F` | Pendiente o próximo a vencer |
| `warning-soft` | `#FFF4D6` | Fondo de advertencia |
| `danger` | `#D64545` | Impago, error o acción destructiva |
| `danger-soft` | `#FDEAEA` | Fondo de error |
| `info` | `#2874D8` | Información contextual |

Los colores son una propuesta. No sobrescribir la paleta actual si ya está definida; adaptar los tokens de forma consistente.

## 4. Layout general

### 4.1 Sidebar

Mantener el logo LAHIFACT y organizar los módulos de forma clara.

**Espacio de trabajo**
- Inicio
- Facturas y boletas
- Notas de crédito / débito
- Resumen diario
- Productos y servicios
- Clientes
- Reportes
- Configuración SUNAT
- Almacenes
- Datos de cuenta

**Administración**
- Panel administrador
- Empresas
- Planes y suscripciones
- Pagos y vencimientos
- Usuarios
- Configuración

Requisitos:
- Revisar primero las rutas y los módulos existentes.
- No duplicar enlaces que ya estén presentes.
- Resaltar la ruta activa y agrupar visualmente las secciones.
- Mantener scroll independiente para la navegación y evitar que tape elementos.
- Permitir contraer el menú en tablet y escritorio; en móvil, utilizar un drawer.
- Respetar los permisos actuales y no mostrar módulos a usuarios no autorizados.

### 4.2 Navbar

El navbar debe seguir la versión acordada:
- Logo LAHIFACT en el bloque azul de la izquierda.
- Botón para contraer o expandir el sidebar.
- Empresa seleccionada, nombre y RUC.
- Icono de notificaciones con contador cuando corresponda.
- Icono de ayuda.
- Avatar, nombre y rol del administrador con menú desplegable.

No mostrar:
- Buscador global.
- Texto “Sesión activa”.
- Botón independiente “Cerrar sesión”.

La opción de cerrar sesión debe estar dentro del menú del perfil. Conservar las funciones reales de notificaciones, ayuda, selector de empresa y autenticación.

## 5. Pantalla 1 — Dashboard administrativo

Reutilizar la ruta actual del panel administrador. No cambiar rutas sin revisar el enrutamiento existente.

### Encabezado
- Título: `Panel de administración`.
- Descripción: `Resumen general de la plataforma.`
- Selector de periodo, solo si las métricas soportan filtrado por fechas.

### KPI
Crear cuatro tarjetas:
1. **Empresas** — total de empresas registradas.
2. **Usuarios** — usuarios registrados dentro del alcance permitido.
3. **Planes activos** — suscripciones activas según las reglas actuales.
4. **Ingresos del mes** — importe calculado con la definición financiera real del sistema.

Cada tarjeta puede incluir icono, valor principal, descripción secundaria y variación temporal solo si existe un periodo anterior comparable. No inventar variaciones, valores ni porcentajes. Usar carga, error y estados no disponibles cuando corresponda.

### Gráficos
**Ingresos y nuevas empresas**
- Gráfico combinado de barras y línea si existen datos históricos.
- Selector de periodo cuando esté soportado.
- Formato de moneda correcto, por ejemplo soles peruanos (`S/`).

**Distribución de planes**
- Gráfico de dona.
- Nombre del plan, cantidad y porcentaje.
- El total central debe coincidir con los datos agregados.

Si no existe una fuente de datos suficiente, mostrar un estado vacío o no disponible en lugar de valores ficticios.

## 6. Pantalla 2 — Empresas

### Encabezado
- Título: `Empresas`.
- Descripción: `Administra las empresas de tu plataforma.`
- Acción principal: `Nueva empresa`, conectada al formulario real de creación.

### Filtros
- Búsqueda por razón social o RUC.
- Filtro por estado, si está soportado.
- Filtro por plan, si está soportado.
- Acción para limpiar filtros.

### Tabla
Columnas sugeridas: RUC, razón social, plan, estado, vencimiento y acciones. Mostrar solo campos que existan en el modelo real. Incluir paginación si los servicios la soportan.

### Acciones
Según permisos y funciones existentes: ver detalles, editar, abrir o administrar empresa, consultar suscripción y pagos, suspender o reactivar servicio solo si esa funcionalidad existe y está autorizada. Confirmar acciones sensibles y mostrar el resultado de la operación.

## 7. Pantalla 3 — Detalle de empresa

Mostrar razón social y nombre comercial si existen, RUC, estado, plan y modalidad de suscripción, fecha de inicio, próximo vencimiento, contacto y dirección si están disponibles, y límites de uso del plan si el sistema los define.

Organizar el detalle en pestañas:
- Información
- Plan y suscripción
- Usuarios
- Pagos y vencimientos
- Configuración

Las pestañas deben utilizar datos y permisos reales. No mostrar límites o métricas inventados. Las acciones Editar, Cambiar plan y otras operaciones deben conectarse a los flujos existentes, con validaciones y confirmaciones cuando sean necesarias.

## 8. Pantalla 4 — Planes y suscripciones

Mostrar los planes configurados en la plataforma como tarjetas comparables o tabla, según la cantidad de planes.

Cada plan puede incluir nombre, precio y moneda, periodicidad, límites de comprobantes/usuarios/almacenes si existen, funciones incluidas, estado y número de empresas suscritas si se puede calcular.

Acciones posibles, solo si existen: crear plan, editar plan, activar o desactivar plan y ver empresas suscritas.

Reglas:
- No inventar precios ni límites.
- No cambiar automáticamente la suscripción de empresas al editar un plan.
- Advertir sobre efectos en suscripciones existentes antes de ejecutar cambios que puedan afectarlas.
- Respetar las reglas de renovación y cobro actuales.

## 9. Pantalla 5 — Pagos y vencimientos

### Encabezado
- Título: `Pagos y vencimientos`.
- Descripción: `Controla los pagos, facturas y renovaciones de las empresas.`

### Filtros
Estado del pago, empresa, plan, periodo de fechas y exportación solo si está implementada y autorizada.

### Tabla
Columnas sugeridas: empresa, plan, monto, estado, fecha de pago, vencimiento y acciones.

Estados sugeridos: Pagado, Pendiente, Impago, Vencido o En proceso. Utilizar los estados reales del backend.

Requisitos:
- Diferenciar fecha de pago y fecha de vencimiento.
- Diferenciar ingresos cobrados de importes pendientes.
- Mostrar moneda correcta.
- No registrar pagos ficticios ni simular cobros reales.
- No alterar las reglas de gracia, renovación, suspensión o reactivación.
- Las acciones de pago deben respetar los flujos y permisos existentes.

## 10. Pantalla 6 — Usuarios

### Encabezado
- Título: `Usuarios`.
- Descripción: `Administra los usuarios que pueden acceder al sistema.`
- Acción `Nuevo usuario`, si la creación está soportada.

### Filtros
Búsqueda por nombre o correo, filtro por rol, estado y empresa si corresponde.

### Tabla
Columnas sugeridas: nombre, correo, rol, empresa, estado y acciones.

Roles y estados deben provenir del modelo real. Respetar permisos y no permitir que un administrador otorgue privilegios que no le corresponden. Acciones posibles: ver detalles, editar, activar/desactivar y gestionar acceso si existe. Confirmar operaciones sensibles y registrar auditoría si el sistema la soporta.

## 11. Pantalla 7 — Reportes

Crear una vista para consultar y descargar reportes administrativos.

Categorías posibles: ingresos, empresas, usuarios, pagos y uso del sistema.

Controles: periodo, empresa, plan y estado cuando corresponda; botón `Generar reporte`; exportación a formatos que el backend soporte.

Los gráficos y totales deben proceder de consultas reales. No presentar gráficos de ejemplo como datos de producción. Mostrar estado de generación, errores y resultados vacíos.

## 12. Pantalla 8 — Configuración

Crear una pantalla agrupada por categorías, respetando las opciones que realmente soporte el sistema.

Categorías posibles: General, identidad de la plataforma, Notificaciones, Facturación, Seguridad, Integraciones y Apariencia.

Mostrar únicamente opciones implementadas. No crear formularios que aparenten guardar información si no existe un servicio persistente. Validar campos, mostrar errores junto a cada campo, confirmar el guardado, no exponer secretos y respetar permisos. Las opciones SUNAT deben permanecer en su módulo actual si ya existe una pantalla específica; no duplicar la configuración sin necesidad.

## 13. Componentes reutilizables

Antes de crear componentes, revisar si el proyecto ya tiene equivalentes. Reutilizar o adaptar:
- `AdminLayout`
- `AdminSidebar`
- `AdminNavbar`
- `PageHeader`
- `KpiCard`
- `ChartCard`
- `DataTable`
- `SearchInput`
- `FilterBar`
- `StatusBadge`
- `Pagination`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `ConfirmDialog`
- `Toast`
- `ProfileDropdown`
- `NotificationMenu`

Separar componentes visuales de servicios de datos y lógica de negocio. Evitar componentes monolíticos y duplicación de estilos.

## 14. Estados comunes

Todas las pantallas deben manejar, según corresponda:
- **Cargando:** skeleton o indicador que evite saltos visuales.
- **Vacío:** explicación clara y acción útil.
- **Sin coincidencias:** mensaje específico y opción para limpiar filtros.
- **Error:** mensaje comprensible y reintento cuando sea seguro; no exponer trazas ni detalles internos.
- **Éxito:** confirmación y actualización de datos afectados.
- **Sin permisos:** acceso denegado o acción no disponible.
- **Operación en curso:** evitar envíos duplicados.
- **Confirmación:** diálogo para acciones sensibles.

## 15. Responsive design

### Escritorio
- Sidebar expandida.
- Cuatro KPI en una fila cuando haya espacio.
- Gráficos en dos columnas.
- Tablas con columnas completas.
- Detalles de empresa organizados en paneles.

### Tablet
- Sidebar contraíble.
- KPI en dos columnas.
- Gráficos apilados cuando sea necesario.
- Tablas con desplazamiento horizontal controlado.

### Móvil
- Sidebar en drawer.
- KPI en una columna o cuadrícula compacta.
- Formularios en una columna.
- Tablas con scroll horizontal limitado o tarjetas.
- Acciones principales accesibles.
- Evitar scroll horizontal de toda la página.

## 16. Requisitos técnicos y de negocio

1. Inspeccionar `package.json`, rutas, layout, componentes, estilos, servicios, modelos y permisos antes de programar.
2. No asumir un framework hasta comprobarlo.
3. Reutilizar las dependencias existentes.
4. No cambiar contratos de API, rutas ni modelos sin una necesidad demostrada.
5. No eliminar funcionalidades actuales.
6. No alterar facturación electrónica, integración SUNAT ni reglas financieras.
7. No incluir datos ficticios en producción.
8. No exponer credenciales, tokens ni datos sensibles en logs.
9. Verificar autorización en backend para operaciones administrativas.
10. Mantener coherencia visual con el resto de LAHIFACT.

## 17. Plan de implementación

### Fase 1 — Auditoría
- Identificar stack y rutas existentes.
- Localizar componentes del layout y navbar.
- Identificar servicios para empresas, planes, pagos, usuarios y reportes.
- Revisar permisos y reglas de negocio.
- Identificar qué pantallas existen y cuáles faltan.

### Fase 2 — Layout y sistema visual
- Ajustar sidebar y navbar de acuerdo con la especificación actual.
- Definir tokens visuales reutilizables.
- Implementar estados comunes y componentes compartidos.
- Validar navegación y permisos.

### Fase 3 — Dashboard
- Implementar KPI y gráficos con datos reales.
- Añadir carga, error y estado vacío.

### Fase 4 — Empresas y detalle
- Implementar tabla, filtros y navegación a detalle.
- Conectar acciones existentes.
- Validar permisos y cambios de estado.

### Fase 5 — Planes, pagos y usuarios
- Implementar o mejorar las pantallas.
- Conectar servicios reales.
- Validar reglas de suscripción, pago y acceso.

### Fase 6 — Reportes y configuración
- Conectar consultas y exportaciones disponibles.
- Mostrar solo ajustes persistentes que realmente existan.

### Fase 7 — Pruebas
- Revisar escritorio, tablet y móvil.
- Ejecutar lint, pruebas y build disponibles.
- Verificar errores de consola y solicitudes de red.
- Comprobar que las funciones actuales sigan operativas.

## 18. Criterios de aceptación

- [ ] El panel mantiene la identidad visual de LAHIFACT.
- [ ] El navbar respeta el diseño acordado: sin buscador, sin “Sesión activa” y sin botón independiente de cerrar sesión.
- [ ] El menú del perfil permite cerrar sesión.
- [ ] El sidebar mantiene rutas y permisos existentes.
- [ ] El dashboard utiliza datos reales.
- [ ] Empresas permite buscar, filtrar, paginar y ejecutar las acciones existentes.
- [ ] El detalle de empresa muestra información real y pestañas funcionales.
- [ ] Planes y suscripciones respetan las reglas existentes.
- [ ] Pagos y vencimientos distinguen correctamente estados, importes y fechas.
- [ ] Usuarios respeta roles y permisos.
- [ ] Reportes usan datos reales y exportan solo mediante funciones soportadas.
- [ ] Configuración persiste cambios reales y no expone secretos.
- [ ] Todas las pantallas contemplan estados de carga, error y vacío.
- [ ] La aplicación es responsive.
- [ ] No se han alterado las integraciones con SUNAT ni las reglas de negocio.
- [ ] Las pruebas y el build disponibles terminan correctamente.

## 19. Instrucción final para el asistente de programación

Implementa estas pantallas directamente en la aplicación actual de LAHIFACT. No entregues únicamente maquetas ni reescribas el sistema desde cero.

Primero audita el código, identifica las pantallas y servicios existentes y prepara un plan de cambios breve. Implementa progresivamente el layout compartido, el dashboard y luego cada módulo. Reutiliza rutas y componentes siempre que sea posible. Usa datos reales y documenta cualquier pantalla o acción que dependa de un servicio que todavía no exista.

Al finalizar, informa:
1. Archivos creados y modificados.
2. Pantallas implementadas.
3. Servicios y endpoints reutilizados.
4. Funcionalidades que quedaron pendientes.
5. Pruebas y comandos ejecutados.

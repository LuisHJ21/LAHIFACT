# LAHIFACT --- Rediseño del panel de administración SaaS

## 1. Objetivo

Mejorar el panel de administración de **LAHIFACT**, plataforma SaaS de
facturación electrónica para Perú, tomando como referencia la propuesta
visual proporcionada.

El panel debe funcionar como un **centro de control administrativo**
para supervisar empresas clientes, usuarios, planes, pagos, vencimientos
y actividad reciente.

La implementación debe realizarse sobre el proyecto existente. No
reconstruir la aplicación desde cero ni reemplazar la lógica de negocio,
las API, las rutas o las integraciones de facturación electrónica y
SUNAT.

## 2. Principios de implementación

1.  Inspeccionar primero el framework, la arquitectura, los estilos, las
    rutas y los servicios existentes.
2.  Reutilizar el stack tecnológico y los componentes instalados.
3.  Separar el dashboard general de los módulos administrativos.
4.  Mantener la identidad visual azul de LAHIFACT.
5.  Usar datos reales obtenidos de los servicios existentes. Los valores
    de la imagen son solo ejemplos visuales.
6.  No crear acciones visuales que no funcionen.
7.  No modificar reglas tributarias, cálculos financieros ni contratos
    de API como parte de un cambio visual.
8.  Implementar progresivamente y verificar que las funciones actuales
     sigan operativas.

### Alcance y jerarquía de especificaciones

- Este documento define el panel administrativo. Para la barra superior,
  `NAVBAR_LAHIFACT.md` prevalece ante cualquier discrepancia: no incluir
  búsqueda global, “Sesión activa” ni un botón independiente de cerrar sesión.
- Diferenciar la administración global del SaaS de la empresa seleccionada
  y de la operación tributaria. Los KPI representan el conjunto administrado;
  el panel Estado del servicio representa únicamente a la empresa activa.
- Mantener una pantalla `Administración` con indicadores globales y módulos
  Empresas, Planes, Pagos y vencimientos, y Usuarios. El dashboard `Inicio`
  continúa siendo el resumen operativo de la empresa, no el resumen del SaaS.
- No añadir un dashboard administrativo independiente hasta definir su
  contenido y navegación. La vista inicial administrativa es Empresas.
- El administrador gestiona el SaaS, no opera la facturación de sus clientes.
  Al iniciar sesión entra directamente en Administración. Consulta los
  registros operativos únicamente desde `Ver detalle de empresa`, en modo
  solo lectura. No debe emitir, enviar, anular o editar registros de clientes.

## 3. Dirección visual

### Estilo

-   SaaS empresarial moderno, claro y profesional.
-   Navegación lateral azul.
-   Área de trabajo gris azulado claro.
-   Tarjetas con superficies claras, bordes sutiles y sombras suaves.
-   Iconografía consistente.
-   Jerarquía tipográfica clara y espaciado uniforme.
-   Uso moderado de colores de estado.
-   Diseño responsive para escritorio, tablet y móvil.

### Paleta de referencia

Si el proyecto ya cuenta con tokens de marca, reutilizarlos y adaptar
únicamente lo necesario. Si no existen, utilizar estos valores:

  Token              Color       Uso
  ------------------ ----------- ------------------------------------------
  `primary`          `#1763E9`   Botones principales, enlaces y selección
  `primary-hover`    `#0F50C7`   Hover de acciones
  `primary-soft`     `#EAF1FF`   Fondos suaves
  `sidebar`          `#1554D1`   Navegación lateral
  `sidebar-deep`     `#123F9F`   Variación del fondo lateral
  `page-bg`          `#F4F7FC`   Fondo del contenido
  `surface`          `#FFFFFF`   Paneles, tarjetas y tablas
  `text-primary`     `#14243D`   Títulos y contenido
  `text-secondary`   `#657795`   Descripciones y metadatos
  `border`           `#E0E8F3`   Bordes y separadores
  `success`          `#0CA678`   Estados activos o pagados
  `success-soft`     `#E1F7EE`   Fondo de estado correcto
  `warning`          `#B7791F`   Pendientes y vencimientos próximos
  `warning-soft`     `#FFF4D6`   Fondo de advertencia
  `danger`           `#D64545`   Impagos, errores y acciones destructivas
  `danger-soft`      `#FDEAEA`   Fondo de error
  `info`             `#2874D8`   Información general

### Componentes visuales

-   Sidebar de aproximadamente 250--270 px en escritorio.
-   Barra superior de 64--76 px.
-   Título principal de 28--32 px.
-   Títulos de panel de 16--20 px.
-   Texto general de 14--16 px.
-   Radio de 10--16 px en tarjetas.
-   Bordes discretos y sombras ligeras.
-   Estados hover, focus, active y disabled visibles.
-   No depender únicamente del color para comunicar estados.
-   Comprobar contraste de texto normal de al menos 4.5:1 y de controles,
    indicadores esenciales y texto grande de al menos 3:1. Conservar los
    tokens existentes si ya satisfacen estos criterios.
-   Controles táctiles de referencia: al menos 44 × 44 px.

## 4. Layout general

### 4.1 Sidebar

Mantener el logo **LAHIFACT** y organizar los módulos en grupos.

**Espacio de trabajo (solo usuarios de empresas)** - Inicio - Facturas y boletas - Notas de crédito
/ débito - Resumen diario - Productos y servicios - Clientes -
Reportes - Configuración SUNAT - Almacenes - Datos de cuenta

**Administración** - Panel administrador - Empresas - Planes y
suscripciones - Pagos y vencimientos - Usuarios

Los usuarios administradores de plataforma ven exclusivamente el grupo
Administración. Los usuarios de empresas conservan su espacio de trabajo
según los permisos existentes. No colocar accesos operativos de clientes
en el sidebar del administrador, ni siquiera para consultar historiales.

Los accesos de Empresas, Planes, Pagos y vencimientos y Usuarios deben
activar los mismos módulos que las pestañas, compartiendo un único estado
de navegación. `Panel administrador` abre la vista inicial Empresas.
Solo el módulo correspondiente debe tener `aria-current="page"` en cada
zona de navegación. Cambiar de empresa no debe reiniciar la pestaña activa.

La configuración administrativa no está definida en este alcance. No
crear un acceso genérico ni reutilizar Configuración SUNAT como si fuera
la configuración global de la plataforma.

Instrucciones: - Conservar rutas, permisos y elementos existentes;
adaptar nombres a los que utilice realmente el proyecto. - Destacar
claramente la opción activa. - Usar iconos consistentes. - Permitir
scroll independiente dentro de la navegación y evitar que tape
elementos. - Mantener accesible cerrar
sesión. - En tablet, permitir contraer el menú. - En móvil, utilizar un
drawer. - Incluir tooltips cuando el menú esté contraído. - No duplicar
módulos ni exponer opciones administrativas a usuarios sin permisos.

Mostrar un indicador de conexión únicamente si existe una comprobación
real de conectividad. Un mensaje decorativo no representa el estado de
red o disponibilidad del servicio.

### 4.2 Barra superior

Incluir: - Empresa seleccionada, nombre y RUC. - Selector de empresa si
el usuario puede administrar varias. - Avatar, nombre y rol del usuario.
- Menú de perfil con cierre de sesión.

No incluir búsqueda global. Las búsquedas pertenecen a cada módulo.
Notificaciones y ayuda se incorporan cuando exista una fuente de pendientes
o un destino válido, respectivamente. Documentar su indisponibilidad y no
mostrar controles sin acción ni contadores inventados.

Si el usuario solo tiene acceso a una empresa, no necesita un selector
interactivo.

### 4.3 Encabezado de página

-   Título: `Administración`
-   Descripción: `Gestiona tus empresas, planes y pagos del servicio.`
-   Acción principal según módulo: `Registrar empresa`, `Crear plan`,
    `Registrar pago` o `Crear usuario`.

El botón debe abrir el flujo de creación existente del módulo activo.
En Pagos, el formulario conserva el filtro de empresa y solo ofrece los
periodos correspondientes. Si no hay periodos, deshabilitar el registro
de pago y explicar por qué.

## 5. Indicadores principales (KPI)

Mostrar cuatro tarjetas en escritorio, dos columnas en tablet y una
columna en móvil.

### Empresas

-   Número total de empresas accesibles en la administración, incluyendo
    las suspendidas; no contar únicamente las filas de la página visible.
-   Descripción: `Total de empresas registradas`.

### Usuarios

-   Número total de usuarios del sistema administrado, incluyendo los
    administradores de plataforma, según la fuente actual de `/admin`.
-   Descripción: `Usuarios del sistema administrado`.
-   Si se desea contar solo usuarios de empresas, cambiar también el nombre
    y la descripción para reflejar ese alcance; no cambiarlo silenciosamente.

### Suscripciones

-   Objetivo condicionado a datos: `Suscripciones activas`, contando solo
    las consideradas activas por las reglas del backend.
-   No contar el catálogo de planes como suscripciones activas ni inferir
    actividad solo por la existencia de una asignación empresa-plan.
-   Adaptación aceptada para la API actual: `Suscripciones registradas`,
    cantidad de asignaciones devueltas por `/admin`. Descripción:
    `Asignaciones de plan, sin inferir actividad`.
-   La adaptación no equivale a completar la fuente de suscripciones activas.

### Pagos registrados del mes

-   Suma de importes de pagos registrados cuya fecha `paid_at` corresponde
    al mes actual en `America/Lima`, según la fuente actual de `/admin`.
-   Mostrar el mes de referencia. La fecha de registro no sustituye a la
    fecha de pago. Los pagos parciales cuentan por su importe registrado.
-   Si la fuente incorpora anulaciones, devoluciones o estados de pago,
    validar las reglas de inclusión con el backend antes de sumarlos.
-   No etiquetar este indicador como ingresos cobrados o liquidados sin
    una definición contable y una fuente que lo respalden.
-   Mostrar la moneda correcta, por ejemplo `S/ 39.00`.
-   Usar `Total facturado este mes` solo si realmente corresponde a
    facturación. No confundir importes cobrados con comprobantes
    emitidos.

Requisitos: - Obtener datos desde los servicios existentes. -
Centralizar formato de moneda y fechas. - Mostrar skeletons durante la
carga. - Mostrar error o estado no disponible si falla la consulta. - No
mostrar variaciones porcentuales inventadas. Calcularlas solo con datos
históricos comparables. - Diferenciar pagos registrados, ingresos
cobrados y facturación electrónica.

## 6. Navegación por pestañas

Incluir: - Empresas - Planes - Pagos y vencimientos - Usuarios

Cada pestaña debe tener estado activo visible, navegación accesible por
teclado y contenido del módulo correspondiente. Respetar permisos. Si ya
existen rutas independientes, conservarlas y usar las pestañas como
navegación hacia esas rutas.

En la arquitectura actual, utilizar botones de navegación con Tab,
Shift+Tab y Enter/Espacio, y `aria-current="page"`. No asignar roles ARIA
de `tablist`/`tab` sin implementar también el patrón completo de teclado.
El sidebar y las pestañas usan la misma lista de módulos y selección.
El acceso directo a Pagos desde el sidebar muestra todas las empresas.

## 7. Módulo Empresas

### Panel de empresas registradas

-   Título: `Empresas registradas`.
-   Descripción: `Administra las empresas del sistema.`
-   Búsqueda por nombre o RUC.
-   Tabla de empresas.
-   Contador de resultados y paginación cuando corresponda.

### Columnas sugeridas

-   Empresa
-   RUC
-   Plan
-   Estado manual
-   Vencimiento del periodo
-   Acciones

Mostrar solo campos que existan en el modelo o puedan obtenerse de los
servicios reales.

El estado manual de la empresa no equivale al estado efectivo del servicio
ni al estado del pago. Si se muestra el último periodo registrado, indicarlo
explícitamente. Usar `Próximo vencimiento` únicamente cuando una fuente
real identifique el siguiente vencimiento aplicable.

### Acciones por empresa

Según permisos y funcionalidades disponibles: - Abrir o administrar
empresa como consulta de solo lectura. - Ver detalles. - Gestionar plan. -
Consultar pagos y vencimientos. - Suspender o reactivar servicio, si
está soportado.

Confirmar acciones sensibles. No cambiar reglas de suspensión,
reactivación o impago como parte del rediseño. Respetar autorización del
backend.

### Estados vacíos

Si no existen empresas: - Título: `Aún no hay empresas registradas`. -
Texto:
`Registra una empresa para comenzar a administrar sus planes y usuarios.` -
Acción: `Registrar empresa`.

Si la búsqueda no encuentra coincidencias: - Título:
`No encontramos empresas`. - Texto: `Prueba con otro nombre o RUC.` -
Acción: `Limpiar búsqueda`.

Las acciones deben abrir los flujos reales.

### Detalle de empresa en modo administrativo

La acción principal de cada fila es `Ver detalle de empresa`, no un acceso
al dashboard operativo del cliente. Mantener al administrador dentro de
Administración, con identificación de empresa/RUC y `Volver a empresas`.

Secciones del detalle:

- Información y servicio: datos fiscales públicos, plan, estado efectivo,
  periodo, vencimiento y comprobantes disponibles/consumidos/reservados.
- Historial de comprobantes: facturas y boletas existentes, con búsqueda,
  filtros, paginación y detalle.
- Notas de crédito y débito: consulta del historial y detalle.
- Resúmenes y envíos SUNAT: historial paginado, filtros por tipo/fecha,
  estado, respuesta, ticket y archivos disponibles.
- Pagos y periodos: consulta del servicio contratado por esta empresa.

Se permite imprimir documentos y descargar XML/CDR disponibles. No mostrar
emisión, envío/reenvío, baja, marcado de entrega, edición de catálogos ni
configuración SUNAT en esta consulta.

El backend debe rechazar escrituras operativas del rol administrador en
los endpoints de empresa. Las altas y cambios propios del SaaS (empresas,
planes, usuarios, pagos y estado del servicio) continúan en `/admin`.
Los datos consultados deben quedar limitados a la empresa seleccionada;
cambiar de empresa cancela consultas pendientes y descarta datos anteriores.

## 8. Panel Estado del servicio

Mostrar información de la empresa seleccionada: - Estado actual del
servicio. - Plan vigente. - Próximo pago o importe pendiente, si
corresponde. - Próximo vencimiento. - Estado del pago. - Acceso a
`Ver pagos y vencimientos`.

Para la fuente actual `/account`, presentar plan, periodo contratado
(indicando que su fin es exclusivo), vencimiento del periodo, importe y
saldo pendiente del periodo. No describir ese saldo como próximo pago.
El acceso `Ver pagos y vencimientos` abre el módulo con un filtro visible
de la empresa seleccionada. Incluir una acción para ver todas las empresas.
El filtro aplica tanto a periodos/saldos como a pagos registrados.
Mantener los KPI globales independientes de este filtro.

Estados sugeridos: Activo, Pendiente, Próximo a vencer, Vencido y
Suspendido. Utilizar los estados reales del backend. No inferir el
estado financiero solo a partir de la fecha si existen periodos de
gracia, pagos en proceso o excepciones.

Indicar claramente a qué empresa corresponden los datos. Diferenciar
próximo pago, pago pendiente y último pago. No mostrar importes o fechas
que no existan en la fuente de datos.

## 9. Actividad reciente

Agregar un panel `Actividad reciente` con las últimas acciones
administrativas.

Eventos de referencia: - Empresa actualizada. - Nuevo usuario. - Pago
registrado. - Plan activado.

Cada elemento puede incluir icono/categoría, acción, resumen, fecha y
hora y usuario responsable.

Requisitos: - Usar eventos reales o una fuente de auditoría
disponible. - No presentar ejemplos ficticios como operaciones reales. -
Ordenar por fecha descendente. - Respetar la zona horaria y los
permisos. - Incluir `Ver todas` si existe o se implementa un
historial. - Si no existe auditoría, documentar esa limitación y no
inventar actividad.

Si solo hay datos de pagos, se permite un panel separado `Pagos recientes`,
con empresa, importe, referencia y fecha de pago. No cumple el requisito de
auditoría administrativa y no debe llamarse `Actividad reciente` ni inventar
el responsable o el momento de registro de una operación.

## 10. Tarjeta de ayuda y soporte

Incluir: - Título: `¿Necesitas ayuda?` - Texto:
`Consulta nuestra base de conocimientos o comunícate con nuestro soporte.` -
Acción `Ver guía rápida`. - Acción `Contactar soporte`.

Conectar las acciones a recursos reales. No crear botones sin acción. Si
todavía no existen destinos válidos, documentar el pendiente o no
mostrar las acciones.

Registrar como dependencias el destino de guía/base de conocimientos y el
canal de soporte. Un enlace interno a datos de cuenta no sustituye soporte.

## 11. Componentes reutilizables

Revisar los componentes actuales antes de crear otros. Reutilizar o
adaptar: - `AdminLayout` - `AdminSidebar` - `AdminTopbar` -
`PageHeader` - `KpiCard` - `AdminTabs` - `DataTable` - `SearchInput` -
`StatusBadge` - `Pagination` - `EmptyState` - `LoadingState` -
`ErrorState` - `ConfirmDialog` - `Toast` - `ActivityList` -
`ServiceStatusCard` - `HelpCard`

Separar presentación, datos y operaciones. Evitar un único componente
gigante para todo el panel.

## 12. Responsive design

### Escritorio

-   Sidebar expandida.
-   Cuatro KPI en una fila si el ancho lo permite.
-   Tabla de empresas en el área principal.
-   Estado del servicio en una columna lateral.
-   Mostrar esa columna únicamente cuando la tabla conserve espacio útil;
    en anchos menores, colocar el estado del servicio debajo del módulo.
-   Actividad reciente debajo de la tabla.
-   Ayuda en la columna lateral si hay espacio.

### Tablet

-   Sidebar contraíble.
-   KPI en dos columnas.
-   Tabla con desplazamiento horizontal controlado si hace falta.
-   Paneles reorganizados en una o dos columnas.

### Móvil

-   Sidebar en drawer.
-   KPI en una columna.
-   Acciones principales accesibles.
-   Formularios en una sola columna.
-   Tabla con scroll horizontal limitado o tarjetas por empresa.
-   Evitar scroll horizontal de toda la página.
-   Áreas táctiles cómodas.

### Escenarios verificables

- Validar 360, 768, 1024 y 1440 px, más un escritorio amplio para comprobar
  la columna lateral, con nombres largos de empresa y usuario.
- Ningún escenario debe producir scroll horizontal de toda la página.
- El desplazamiento de tablas debe quedar contenido dentro de su panel.
- Verificar sidebar contraído, drawer, filtro de pagos y controles de perfil.
- Restaurar el foco al cerrar drawer, perfil con Escape y confirmaciones.

## 13. Estados de interfaz

Todos los módulos relevantes deben considerar:

-   **Cargando:** skeletons o indicadores que eviten saltos visuales.
-   **Vacío:** explicar qué falta y ofrecer una acción útil.
-   **Error:** mensaje comprensible y reintento cuando sea seguro; no
    exponer trazas ni detalles internos.
-   **Éxito:** confirmar operaciones y refrescar datos afectados.
-   **Sin permisos:** denegar acceso de acuerdo con la política actual.
-   **Operación en curso:** evitar envíos duplicados y deshabilitar
    temporalmente el control.

## 14. Restricciones técnicas y de negocio

-   Inspeccionar `package.json`, rutas, componentes, estilos, servicios
    y modelos antes de modificar código.
-   No asumir un framework concreto hasta revisar el proyecto.
-   Reutilizar dependencias instaladas.
-   No cambiar rutas, contratos de API, campos ni modelos sin necesidad
    demostrada.
-   No eliminar funciones existentes.
-   No alterar facturación electrónica, notas de crédito/débito ni
    integración SUNAT.
-   No cambiar reglas de pago, vencimiento, suspensión o renovación por
    motivos visuales.
-   No exponer credenciales ni información sensible.
-   La autorización debe validarse en backend; ocultar botones no
    sustituye los permisos del servidor.
-   No usar datos ficticios en producción.
-   No introducir acciones financieras reales en botones de
    demostración.
-   Centralizar estilos en el mecanismo que ya utilice el proyecto.

## 15. Plan de implementación

### Fase 1 --- Auditoría

-   Identificar stack, rutas y layout.
-   Localizar servicios de empresas, usuarios, planes y pagos.
-   Identificar permisos y reglas de estado.
-   Comprobar si existe auditoría.
-   Preparar una lista de componentes reutilizables.

### Fase 2 --- Layout administrativo

-   Mejorar sidebar y barra superior.
-   Ajustar encabezado de Administración.
-   Unificar espaciado, tipografía, colores y estados.
-   Validar navegación y permisos.

### Fase 3 --- Indicadores y navegación

-   Conectar KPI con datos reales.
-   Implementar pestañas administrativas.
-   Añadir carga, error y estado no disponible.

### Fase 4 --- Empresas y estado del servicio

-   Mejorar búsqueda y tabla.
-   Implementar acciones existentes con permisos.
-   Construir el panel de estado.
-   Verificar pagos, vencimientos y reglas de suspensión.

### Fase 5 --- Actividad y soporte

-   Conectar actividad a una fuente real.
-   Añadir accesos de ayuda únicamente con destinos válidos.

### Fase 6 --- Responsive y validación

-   Probar escritorio, tablet y móvil.
-   Ejecutar lint, pruebas y build disponibles.
-   Revisar consola y solicitudes de red.
-   Verificar que las operaciones existentes continúen funcionando.

## 16. Criterios de aceptación

-   [ ] Se conserva la marca y el estilo azul de LAHIFACT.
-   [ ] El layout es coherente con el resto del sistema.
-   [ ] El menú conserva rutas y permisos.
-   [ ] El encabezado muestra empresa y usuario correctos.
-   [ ] Los KPI usan datos reales y definiciones correctas.
-   [ ] La búsqueda por nombre o RUC funciona.
-   [ ] La tabla refleja datos del backend.
-   [ ] Las acciones por empresa respetan permisos.
-   [ ] El panel de servicio distingue estados y vencimientos.
-   [ ] Sidebar y pestañas comparten el módulo activo, sin pantallas duplicadas.
-   [ ] Cambiar de empresa conserva el módulo administrativo activo.
-   [ ] El administrador inicia en el SaaS y no ve el menú operativo del cliente.
-   [ ] `Ver detalle de empresa` abre historiales dentro de Administración.
-   [ ] Los historiales del administrador son de solo lectura y corresponden
    exclusivamente a la empresa seleccionada.
-   [ ] La API rechaza escrituras operativas del administrador, conservando
    sus operaciones administrativas y las operaciones autorizadas de clientes.
-   [ ] El acceso a pagos desde el panel de servicio aplica un filtro visible
    y permite volver al conjunto de empresas.
-   [ ] Los KPI globales no cambian por el filtro de pagos o empresa activa.
-   [ ] No hay botones sin acción.
-   [ ] Se muestran estados de carga, error y vacío.
-   [ ] El panel funciona en escritorio, tablet y móvil.
-   [ ] La facturación electrónica y SUNAT no se han alterado.
-   [ ] Las pruebas y el build disponibles terminan correctamente.

### Funciones condicionadas a una fuente o destino real

Evaluar cada elemento como **Disponible y verificado**, **Adaptación
aceptada** o **Bloqueado por dependencia**, indicando fuente y motivo.
Un elemento bloqueado no debe contabilizarse como implementado.

-   [ ] Suscripciones activas: fuente efectiva agregada del backend; mientras
    falte, se acepta el KPI diferenciado de suscripciones registradas.
-   [ ] Actividad administrativa: fuente de auditoría con eventos reales;
    los pagos recientes son una sección distinta.
-   [ ] Notificaciones: fuente de pendientes y acciones de lectura disponibles.
-   [ ] Ayuda y soporte: guía y canal de contacto con destinos válidos.

Documentar las dependencias en `IMPLEMENTACION_DISENO_ADMIN.md`.

## 17. Instrucción final para el asistente de programación

Implementa este rediseño directamente en el proyecto actual de LAHIFACT.
No entregues solamente una maqueta o una lista de recomendaciones:
modifica los componentes y estilos reales siguiendo la arquitectura
existente.

Empieza con una auditoría breve del código y de los servicios
disponibles. Implementa primero el layout administrativo, los KPI y la
sección Empresas; luego añade Estado del servicio, actividad reciente y
ayuda. Usa datos reales, conserva las reglas de negocio y documenta los
puntos que requieran una API o fuente de datos que todavía no exista.

Al finalizar, informa: 1. Archivos creados y modificados. 2. Componentes
y rutas reutilizados. 3. Servicios reales conectados. 4. Pruebas y
comandos ejecutados. 5. Pendientes o dependencias que impidan completar
alguna función.

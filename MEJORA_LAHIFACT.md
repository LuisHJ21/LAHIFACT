# LAHIFACT --- Plan de mejora de interfaz y experiencia de usuario

## 1. Objetivo

Mejorar la interfaz existente de **LAHIFACT**, un sistema de facturación
electrónica para empresas peruanas, conservando su identidad visual y su
estructura funcional actual.

La mejora debe enfocarse en: - Dar una apariencia más profesional,
moderna y consistente. - Aprovechar mejor el espacio de trabajo
disponible. - Mejorar la legibilidad, la jerarquía visual y la
navegación. - Hacer que los módulos compartan un mismo sistema de
diseño. - Mejorar los estados vacíos, las tablas, los filtros, los
formularios y las acciones. - Mantener la compatibilidad con la lógica
de negocio, las API y las rutas actuales.

**No reconstruyas el sistema desde cero ni reemplaces funcionalidades
existentes.** Primero inspecciona el proyecto y adapta la propuesta a su
stack, arquitectura y componentes actuales.

## 2. Diagnóstico de la pantalla actual

La pantalla de Almacenes presenta una base clara, pero puede mejorar en
los siguientes aspectos:

1.  El menú lateral ocupa una parte considerable del ancho disponible y
    tiene muchos elementos de navegación; debe conservarse legible y
    permitir desplazamiento correcto.
2.  El área central tiene bastante espacio vacío, especialmente cuando
    no hay registros.
3.  El estado vacío es poco accionable: debe explicar la situación y
    ofrecer una acción para crear el primer almacén.
4.  La búsqueda y el contador están separados visualmente de las
    acciones de gestión; se debe organizar una barra de herramientas
    coherente.
5.  El encabezado del módulo puede reforzar la jerarquía entre título,
    descripción, acciones principales y navegación contextual.
6.  La paginación aparece incluso con cero registros; debe mostrar un
    estado coherente y deshabilitar o esconder controles cuando no
    correspondan.
7.  Los botones, campos, etiquetas, bordes y estados deben compartir
    medidas y estilos.
8.  El encabezado de sesión, los datos de la empresa y el perfil
    necesitan una alineación consistente y un comportamiento responsive.
9.  El mensaje de conexión a la empresa en el menú debe integrarse mejor
    con la navegación, sin competir visualmente con los módulos.
10. Deben contemplarse estados de carga, error, búsqueda sin
    coincidencias y lista vacía por primera vez.

## 3. Dirección de diseño

### Identidad visual

Mantener: - Nombre y marca **LAHIFACT**. - Azul como color principal. -
Menú lateral azul. - Fondo de trabajo gris azulado muy claro. - Tarjetas
y superficies claras. - Estilo empresarial, ordenado y sobrio.

Evitar: - Rediseños radicales que cambien la identidad. - Gradientes
fuertes, exceso de colores o sombras pronunciadas. - Tarjetas
innecesarias para cada elemento. - Animaciones llamativas. - Cambios de
texto funcionales que puedan alterar el significado tributario.

### Paleta recomendada

Usar los colores existentes como referencia y centralizarlos en
variables o tokens. Si no hay una paleta definida en el código, partir
de esta:

  -----------------------------------------------------------------------
  Token                   Color                   Uso
  ----------------------- ----------------------- -----------------------
  `primary`               `#1D5FE9`               Acciones principales,
                                                  enlaces y selección
                                                  activa

  `primary-hover`         `#174FC5`               Hover de botones
                                                  primarios

  `primary-soft`          `#EAF1FF`               Fondos suaves y
                                                  selección secundaria

  `sidebar`               `#1956D8`               Fondo de navegación
                                                  lateral

  `sidebar-deep`          `#1749B2`               Variación para
                                                  separación o pie del
                                                  menú

  `page-bg`               `#F4F7FC`               Fondo del área de
                                                  trabajo

  `surface`               `#FFFFFF`               Tarjetas, formularios y
                                                  tablas

  `text-primary`          `#14233B`               Títulos y contenido
                                                  principal

  `text-secondary`        `#64748B`               Descripciones y
                                                  metadatos

  `border`                `#E1E8F2`               Bordes y divisores

  `success`               `#0F9F6E`               Estados correctos

  `success-soft`          `#E4F7EF`               Fondo de estados
                                                  correctos

  `warning`               `#B77912`               Advertencias y
                                                  pendientes

  `warning-soft`          `#FFF4D8`               Fondo de advertencias

  `danger`                `#D64545`               Errores y acciones
                                                  destructivas

  `danger-soft`           `#FDEAEA`               Fondo de errores

  `info`                  `#2874D8`               Información contextual
  -----------------------------------------------------------------------

Los valores anteriores son una propuesta. Si el proyecto ya define
colores de marca, reutilizar los actuales y ajustar solo los que sean
necesarios.

### Tipografía

-   Usar la fuente actual si es legible y consistente.
-   Priorizar una sans serif moderna y neutral.
-   Títulos de página: 28--32 px en escritorio.
-   Títulos de secciones: 16--20 px.
-   Texto principal: 14--16 px.
-   Texto auxiliar: 12--14 px.
-   Evitar textos pequeños para acciones importantes.
-   Usar pesos tipográficos para jerarquizar, no solo el color.

### Bordes, radios y sombras

-   Campos y botones: radio de 8--10 px.
-   Paneles principales: radio de 12--16 px.
-   Bordes finos y discretos.
-   Sombras suaves solo cuando ayuden a separar niveles.
-   Estados `hover`, `focus`, `active` y `disabled` claramente
    diferenciados.

## 4. Estructura de la aplicación

### 4.1 Menú lateral

Mantener el menú azul de LAHIFACT y mejorar su comportamiento:

-   Ancho orientativo de 248--272 px en escritorio.
-   Logotipo con alineación y margen consistentes.
-   Elementos de navegación con iconos del mismo tamaño y trazo.
-   Separar los módulos por grupos con títulos discretos.
-   Resaltar la ruta activa con fondo claro, texto e icono azules y una
    señal visual secundaria.
-   Mantener el contraste suficiente entre iconos, texto y fondo.
-   Evitar que el indicador de scroll tape los elementos.
-   El menú debe desplazarse de manera independiente al contenido.
-   Mantener visibles, cuando sea posible, el bloque de conexión y la
    opción de cerrar sesión.
-   En pantallas medianas, permitir contraer el menú a una barra de
    iconos.
-   En móvil, convertirlo en un drawer que se abra y cierre con un
    botón.
-   Incluir tooltips cuando esté contraído.
-   Respetar las rutas y permisos actuales.

No eliminar, renombrar ni reordenar módulos sin comprobar las
dependencias funcionales existentes.

### 4.2 Barra superior

Mejorar el encabezado que muestra la empresa y el usuario:

**Zona izquierda** - Selector de empresa, si la aplicación permite
trabajar con más de una. - Nombre de empresa. - RUC debajo o como dato
secundario. - Icono o avatar de empresa.

**Zona derecha** - Estado de sesión con indicador discreto. - Avatar del
usuario. - Nombre y rol. - Menú de perfil con las opciones que ya
soporte el sistema. - Botón de cerrar sesión con jerarquía secundaria,
evitando competir con la acción principal de cada módulo.

En pantallas pequeñas, compactar los datos secundarios sin perder acceso
a las funciones.

### 4.3 Área principal

Establecer un patrón común para las páginas:

1.  Ruta de navegación o breadcrumb, cuando aporte contexto.
2.  Título del módulo.
3.  Descripción corta.
4.  Acción principal alineada a la derecha.
5.  Barra de filtros y búsqueda.
6.  Contenido: tabla, formulario, indicadores o estado vacío.
7.  Paginación y metadatos al pie, cuando correspondan.

El contenido debe adaptarse al ancho disponible y conservar márgenes
uniformes.

## 5. Rediseño específico del módulo Almacenes

### Encabezado

Mostrar: - Título: `Almacenes`. - Descripción:
`Organiza los almacenes de tu empresa.` - Botón primario:
`+ Nuevo almacén` o el texto funcional que ya utilice el sistema.

Usar el nombre de acción que coincida con el lenguaje actual de
LAHIFACT. Si el sistema utiliza "Nuevo registro" en todos sus módulos
por una razón funcional, conservarlo hasta validar el cambio.

### Panel de contenido

Crear un contenedor principal con: - Fondo de superficie. - Borde
discreto. - Radio uniforme. - Barra de herramientas superior. - Área de
resultados. - Pie para el resumen y la paginación.

### Barra de herramientas

-   Búsqueda con icono y placeholder:
    `Buscar por nombre, código o documento...`
-   Contador de resultados.
-   Filtros adicionales solo si existen campos relevantes, por ejemplo
    estado o tipo.
-   Botón para limpiar filtros cuando haya filtros activos.

La búsqueda debe funcionar realmente sobre los datos mostrados o
utilizar la API existente. No crear controles visuales sin
comportamiento.

### Estado vacío

Cuando la empresa aún no tenga almacenes, mostrar un estado vacío
centrado, pero no excesivamente separado de la barra de herramientas:

-   Icono de almacén o caja con tamaño moderado.
-   Título: `Aún no hay almacenes`.
-   Descripción:
    `Registra tu primer almacén para organizar mejor tus operaciones.`
-   Acción: `Crear primer almacén`.

La acción debe abrir el formulario o modal real de creación, si existe.
Si no existe, revisar la arquitectura y crear el flujo usando las
validaciones y servicios adecuados.

Cuando una búsqueda no tenga coincidencias, usar otro mensaje: - Título:
`No encontramos resultados`. - Descripción:
`Prueba con otro nombre, código o documento.` - Acción secundaria:
`Limpiar búsqueda`.

### Tabla cuando existan registros

Mostrar una tabla limpia con las columnas que correspondan al modelo
real de almacén. Como base, evaluar:

-   Código
-   Nombre del almacén
-   Dirección o ubicación
-   Estado
-   Fecha de creación, si existe y es útil
-   Acciones

Reglas: - No inventar campos que no existan en el modelo o API. - Usar
encabezados claros. - Alinear los valores de forma consistente. -
Mostrar estados mediante etiquetas discretas. - Usar menú de acciones
por fila para ver, editar o desactivar según los permisos disponibles. -
Confirmar antes de ejecutar acciones destructivas. - Permitir búsqueda,
ordenación y paginación solo si están soportadas por la lógica real. -
Mantener encabezados visibles en tablas largas cuando resulte útil. - En
móvil, habilitar scroll horizontal controlado o una presentación en
tarjetas.

### Paginación

-   Mostrar `Mostrando X–Y de Z registros` cuando haya resultados.
-   Deshabilitar anterior/siguiente en los extremos.
-   No mostrar una paginación activa si hay cero registros.
-   Mantener el número de página al cambiar de vista solo si el
    comportamiento actual lo requiere.
-   Evitar que los botones parezcan activos cuando no pueden usarse.

## 6. Sistema de componentes reutilizables

Crear o mejorar componentes comunes según la arquitectura existente:

-   `AppShell` o layout principal.
-   `Sidebar`
-   `Topbar`
-   `PageHeader`
-   `Breadcrumbs`
-   `PrimaryButton`
-   `SecondaryButton`
-   `IconButton`
-   `SearchInput`
-   `Select` y filtros
-   `Card` o panel
-   `StatusBadge`
-   `DataTable`
-   `Pagination`
-   `EmptyState`
-   `LoadingState`
-   `ErrorState`
-   `ConfirmDialog`
-   `Toast` o notificación temporal

No duplicar componentes que ya existan. Antes de crear uno, buscar si
hay una implementación reutilizable y extenderla cuando sea apropiado.

## 7. Comportamiento y estados

Todos los módulos deben contemplar, según corresponda:

### Carga

-   Indicador de carga o skeleton con dimensiones similares al contenido
    final.
-   Evitar saltos grandes de diseño durante la carga.

### Vacío

-   Explicar por qué no hay contenido.
-   Ofrecer una acción útil cuando proceda.

### Error

-   Mostrar un mensaje comprensible.
-   Ofrecer reintentar cuando sea seguro.
-   No exponer trazas técnicas ni datos sensibles al usuario.

### Éxito

-   Confirmación visual discreta al crear, editar o completar una
    operación.
-   Actualizar los datos de la pantalla de acuerdo con el flujo real.

### Formularios

-   Etiquetas visibles y asociadas a sus campos.
-   Indicar campos obligatorios.
-   Mostrar errores junto al campo correspondiente.
-   Deshabilitar el envío durante el procesamiento cuando sea necesario.
-   Evitar borrar los datos ingresados si ocurre un error recuperable.

## 8. Responsive design

### Escritorio

-   Sidebar expandida.
-   Barra superior completa.
-   Contenido con ancho aprovechado y márgenes consistentes.
-   Tablas con todas las columnas necesarias.

### Tablet

-   Sidebar contraíble.
-   Reducir espacios sin comprimir la información.
-   Adaptar tablas y formularios al ancho disponible.

### Móvil

-   Navegación en drawer.
-   Acciones principales accesibles.
-   Formularios en una sola columna.
-   Tablas con desplazamiento controlado o tarjetas.
-   Evitar scroll horizontal de toda la página.
-   Botones con área táctil adecuada.

## 9. Accesibilidad y usabilidad

-   Mantener contraste suficiente.
-   Mostrar un foco visible al navegar con teclado.
-   No comunicar el estado únicamente mediante color.
-   Añadir etiquetas accesibles a los botones que solo tengan iconos.
-   Usar HTML semántico.
-   Respetar `prefers-reduced-motion` si hay animaciones.
-   Evitar elementos interactivos demasiado pequeños.
-   Mantener los textos tributarios y nombres de acciones precisos.

## 10. Restricciones técnicas

1.  Inspeccionar primero el `package.json`, las rutas, los componentes,
    los estilos globales y los servicios actuales.
2.  Identificar el framework y la versión real; no asumir que el
    proyecto usa React, Vue, Tailwind u otra tecnología hasta
    comprobarlo.
3.  Reutilizar el stack instalado. No migrar de framework como parte de
    esta tarea.
4.  No eliminar funcionalidades, permisos, validaciones, integraciones
    SUNAT ni flujos de facturación.
5.  No cambiar contratos de API, nombres de campos, modelos de datos ni
    rutas sin una necesidad demostrada.
6.  No reemplazar datos reales por datos ficticios.
7.  No introducir librerías nuevas si las existentes resuelven la
    necesidad.
8.  Mantener los cambios de diseño separados de la lógica tributaria y
    financiera.
9.  No exponer tokens, credenciales, RUC privados ni información
    sensible en logs.
10. Evitar refactorizaciones masivas que no sean necesarias para mejorar
    la interfaz.

## 11. Plan de implementación

### Fase 1 --- Auditoría

-   Revisar la estructura actual.
-   Identificar componentes compartidos y estilos duplicados.
-   Localizar el código de la página Almacenes.
-   Identificar las acciones y los servicios de búsqueda, creación,
    edición y paginación.
-   Documentar riesgos de regresión antes de cambiar el código.

### Fase 2 --- Fundamentos visuales

-   Centralizar colores, tipografía, radios, bordes, sombras y
    espaciados.
-   Definir estilos consistentes para botones, campos, etiquetas y
    paneles.
-   No cambiar todavía los flujos de negocio.

### Fase 3 --- Layout general

-   Mejorar sidebar, barra superior y área de contenido.
-   Ajustar scroll, menú activo, responsive y alineación.
-   Verificar las rutas y permisos.

### Fase 4 --- Módulo Almacenes

-   Rediseñar encabezado y barra de herramientas.
-   Mejorar estado vacío, búsqueda, tabla y paginación.
-   Conectar todas las acciones a los flujos reales existentes.

### Fase 5 --- Extensión al resto de módulos

-   Aplicar los componentes compartidos a facturas, notas de
    crédito/débito, resumen diario, productos, clientes, reportes y
    configuración SUNAT.
-   Respetar las necesidades específicas de cada módulo.

### Fase 6 --- Validación

-   Ejecutar las comprobaciones y pruebas disponibles.
-   Revisar el comportamiento en escritorio, tablet y móvil.
-   Corregir errores de consola y problemas visuales.
-   Comprobar que los flujos de negocio siguen funcionando.

## 12. Criterios de aceptación

-   [ ] Se conserva la marca LAHIFACT y su identidad azul.
-   [ ] La navegación lateral funciona y resalta correctamente la página
    activa.
-   [ ] El encabezado de empresa y usuario es consistente y responsive.
-   [ ] El contenido aprovecha mejor el espacio disponible.
-   [ ] El módulo Almacenes presenta estados vacío, búsqueda sin
    resultados, carga y error.
-   [ ] La búsqueda y las acciones usan la lógica o API real.
-   [ ] La paginación es coherente con el número de resultados.
-   [ ] Los formularios muestran validaciones claras.
-   [ ] Los componentes comunes se reutilizan en los módulos.
-   [ ] La interfaz funciona en escritorio, tablet y móvil.
-   [ ] No se han eliminado rutas, permisos ni funciones existentes.
-   [ ] Las integraciones de facturación electrónica y SUNAT siguen
    funcionando.
-   [ ] No se han introducido datos ficticios en operaciones reales.
-   [ ] Las comprobaciones disponibles terminan sin errores relevantes.

## 13. Instrucción final para el asistente de programación

Implementa la mejora sobre el código existente de LAHIFACT. **No te
limites a proponer cambios ni generes únicamente una maqueta: modifica
los componentes y estilos reales del proyecto.**

Empieza auditando la arquitectura y los flujos existentes. Después
mejora el layout compartido y completa el módulo Almacenes como
referencia visual y funcional. Reutiliza los componentes creados para el
resto de páginas.

Prioriza claridad, consistencia, accesibilidad, responsive design y
preservación de la lógica de negocio. Al finalizar, informa qué archivos
cambiaste, qué decisiones tomaste, qué pruebas ejecutaste y qué aspectos
quedaron pendientes.

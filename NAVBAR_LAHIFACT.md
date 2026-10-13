# LAHIFACT — Especificación del navbar

## Objetivo

Actualizar la barra superior (navbar) de LAHIFACT para que sea más limpia, compacta y consistente con la identidad visual existente.

**Importante:** quitar del navbar el campo de búsqueda global, el mensaje “Sesión activa” y el botón “Cerrar sesión”. No deben reservar espacio ni dejar huecos vacíos en su lugar.

El cambio debe aplicarse al código existente, conservando las rutas, el comportamiento de la sesión, los permisos y las funcionalidades actuales.

## Diseño deseado

### 1. Bloque de marca

- Mantener el bloque azul corporativo a la izquierda.
- Conservar el logotipo y el nombre **LAHIFACT**.
- Mantener las proporciones y el estilo actual de marca.
- No duplicar el logotipo en otra zona del navbar.

### 2. Botón del menú lateral

- Ubicar el botón para contraer/expandir el sidebar inmediatamente después del bloque de marca.
- Usar un botón compacto, con fondo claro, borde sutil e icono centrado.
- Incluir tooltip y etiqueta accesible.
- Mantener su funcionalidad actual.

### 3. Selector de empresa

Mostrar los datos de la empresa activa:
- Avatar o recuadro con la inicial de la empresa.
- Nombre de la empresa.
- RUC como texto secundario.
- Indicador desplegable si el usuario puede cambiar de empresa.

Reglas:
- Si el usuario solo tiene acceso a una empresa, no mostrar un selector interactivo innecesario.
- No modificar la lógica de selección de empresa.
- Mantener el nombre y RUC provenientes de los datos reales.
- En pantallas pequeñas, reducir el texto secundario sin ocultar la identidad de la empresa activa.

### 4. Zona derecha

Mostrar únicamente:
1. Icono de notificaciones, con contador si existen notificaciones pendientes.
2. Icono de ayuda.
3. Perfil del usuario administrador.

Usar separadores verticales muy sutiles entre grupos, sin recargar el diseño.

### 5. Perfil del administrador

Mostrar:
- Avatar con iniciales o imagen disponible.
- Nombre del usuario.
- Rol como texto secundario.
- Indicador desplegable.

Al pulsar el perfil, abrir un menú desplegable que contenga las opciones disponibles para la cuenta. **La opción “Cerrar sesión” debe ubicarse dentro de este menú**, no como botón independiente en el navbar.

No inventar opciones de perfil que no existan. Si la aplicación ya cuenta con un menú de usuario, reutilizarlo y ajustar su presentación.

## Distribución visual

- Altura orientativa del navbar: 68–76 px en escritorio.
- Bloque de marca con ancho coherente con el sidebar.
- Contenido alineado verticalmente al centro.
- Espaciado uniforme entre controles.
- Tipografía clara, con nombre de empresa y usuario destacados y metadatos en un tono secundario.
- Bordes suaves y sombras discretas.
- Fondo blanco o ligeramente azulado, respetando los tokens existentes.
- Mantener el azul corporativo de LAHIFACT.
- Evitar que el navbar compita visualmente con el contenido principal.

## Responsive

### Escritorio
- Mostrar logo, botón del sidebar, empresa, notificaciones, ayuda y perfil.
- Eliminar por completo el espacio destinado al buscador y al indicador de sesión.

### Tablet
- Mantener el selector de empresa y el perfil.
- Reducir metadatos si el ancho es limitado.
- Conservar accesibles notificaciones y ayuda.

### Móvil
- Mantener el logo o una versión compacta.
- Mostrar el botón del menú lateral.
- Usar una representación compacta del selector de empresa.
- Mantener notificaciones y perfil accesibles.
- Ocultar el texto secundario cuando sea necesario para evitar desbordamiento.
- No provocar scroll horizontal.

## Interacción y accesibilidad

- Todos los iconos que ejecuten acciones deben ser botones reales.
- Añadir etiquetas accesibles (`aria-label` o equivalente) a botones de icono.
- Mostrar estados hover, focus y active.
- El menú de perfil debe abrirse y cerrarse correctamente.
- Cerrar el menú al seleccionar una opción o al hacer clic fuera, siguiendo los patrones ya utilizados por el proyecto.
- Mantener la navegación por teclado.
- No comunicar el estado únicamente mediante color.

## Restricciones técnicas

1. Inspeccionar el componente actual del navbar y sus estilos antes de modificarlo.
2. Reutilizar el framework, los componentes y las dependencias existentes.
3. No reconstruir el layout general.
4. No modificar las reglas de autenticación o cierre de sesión; solo mover el acceso a cerrar sesión al menú del perfil.
5. No cambiar la lógica de selección de empresa, notificaciones o ayuda.
6. No eliminar servicios ni rutas que se utilicen en otras partes del sistema.
7. No dejar contenedores vacíos, márgenes sobrantes ni separadores huérfanos tras quitar búsqueda y estado de sesión.
8. Mantener compatibilidad con el resto de páginas de LAHIFACT.

## Criterios de aceptación

- [ ] El buscador no aparece en el navbar.
- [ ] El mensaje “Sesión activa” no aparece en el navbar.
- [ ] No existe un botón independiente de “Cerrar sesión”.
- [ ] “Cerrar sesión” está disponible dentro del menú del perfil.
- [ ] El logo LAHIFACT se conserva.
- [ ] El botón para contraer el sidebar sigue funcionando.
- [ ] La empresa activa y su RUC se muestran correctamente.
- [ ] Notificaciones y ayuda siguen funcionando.
- [ ] El perfil muestra el nombre y rol reales.
- [ ] No quedan huecos vacíos donde estaban el buscador y el estado de sesión.
- [ ] El navbar funciona en escritorio, tablet y móvil.
- [ ] No se han alterado la autenticación ni los permisos.

## Instrucción final

Implementa los cambios directamente en el proyecto existente de LAHIFACT. Primero localiza el componente del navbar y sus estilos; después realiza el ajuste mínimo necesario para obtener la distribución descrita. Reutiliza el menú del perfil si ya existe y conserva la lógica de negocio.

Al terminar, informa qué archivos modificaste y qué verificaciones ejecutaste.

# Contexto del proyecto Equilibria

## Idea general

Equilibria es un MVP fullstack para repartir tareas de forma justa dentro de grupos de convivencia, viajes o compañeros de casa.

La idea central es evitar que una persona acumule siempre más carga que otras. Para eso la app registra integrantes, tareas, puntos, recompensas e historial, y usa reglas programadas para sugerir o sortear quién debería hacer cada tarea.

La app no usa IA como funcionalidad principal. La lógica base es determinística y transparente.

## Stack

- Frontend: HTML, CSS y JavaScript sin frameworks.
- Backend: Node.js con Express.
- Base de datos: JSON local en `data/db.json`.
- Servidor principal: `server.js`.

## Cómo ejecutar

Desde la raíz del proyecto:

```bash
npm install
npm start
```

Después abrir:

```text
http://localhost:3000
```

Si el servidor ya está corriendo y se hacen cambios en backend, hay que reiniciarlo:

```bash
Ctrl + C
npm start
```

Si el navegador queda cacheado:

```text
Cmd + Shift + R
```

## Estructura principal

```text
.
├── data/db.json
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── groupRoutes.js
│   ├── services/
│   │   └── equilibriaService.js
│   ├── storage/
│   │   └── database.js
│   └── utils/
│       ├── ids.js
│       └── security.js
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

## Modelo de datos

### Usuarios

Cada usuario tiene:

- `id`
- `name`
- `email`
- `password`

La contraseña se guarda hasheada con SHA-256.

### Grupos

Cada grupo tiene:

- `id`
- `userId`
- `name`
- `members`
- `tasks`
- `history`

Cada usuario ve solo sus grupos.

### Integrantes

Cada integrante tiene:

- `id`
- `name`
- `points`
- `tasksCompleted`
- `rewards`

### Tareas

Cada tarea tiene:

- `id`
- `name`
- `votes`
- `difficulty`
- `assignedTo`
- `completed`

Actualmente se usa un solo voto de dificultad, hecho por la persona que está usando la app. Se guarda como array `votes: [valor]` para mantener compatibilidad con el modelo original.

### Historial

Cada registro tiene:

- `id`
- `taskName`
- `memberName`
- `pointsGained`
- `date`

## API disponible

### Usuarios

- `POST /api/register`
- `POST /api/login`

### Grupos

- `GET /api/groups/:userId`
- `POST /api/groups`
- `DELETE /api/groups/:groupId`

### Integrantes

- `POST /api/groups/:groupId/members`
- `DELETE /api/groups/:groupId/members/:memberId`

### Tareas

- `POST /api/groups/:groupId/tasks`
- `PUT /api/groups/:groupId/tasks/:taskId/complete`

### Historial

- `GET /api/groups/:groupId/history`

## Lógica de equilibrio

### Dificultad

La persona que crea la tarea elige una dificultad de `1` a `5`.

La app no deja guardar una tarea si no se eligió dificultad.

### Sugerencia inteligente

La sugerencia automática elige al integrante con menos puntos acumulados.

Si hay empate en puntos, prioriza a quien tiene menos tareas completadas.

### Sorteo ponderado

El sorteo ponderado favorece a quienes tienen menos puntos.

La fórmula usa un peso mayor para personas con menor carga acumulada. No es random puro.

### Simulación

Antes de confirmar una tarea, la app muestra cómo quedarían los puntos si la persona seleccionada realiza la tarea.

Ejemplo:

```text
Si Ana realiza "Comprar comida", pasa de 10 a 14 puntos.
```

### Estado del grupo

Se calcula por diferencia entre el puntaje mayor y menor:

- Diferencia menor o igual a 5: `Equilibrado`
- Diferencia menor o igual a 12: `En observación`
- Diferencia mayor a 12: `Desbalanceado`

### Recompensas

Según puntos acumulados:

- `>= 30`: recompensa alta
- `>= 15`: recompensa media
- `< 15`: sin recompensa

La sección de recompensas muestra tarjetas por integrante y una barra de progreso hacia la próxima recompensa.

## Detalles de experiencia de usuario

- Las secciones funcionan con navegación interna desde la barra superior.
- Agregar integrantes mantiene al usuario en la sección `Integrantes`.
- El sorteo ponderado tiene animación visual antes de seleccionar resultado.
- Al completar una tarea se muestra un modal de felicitaciones con puntos y recompensa.
- Las eliminaciones de grupos e integrantes usan un modal visual propio de Equilibria, no el cartel nativo del navegador.

## Flujo principal de la app

1. Crear cuenta o iniciar sesión.
2. Crear grupo.
3. Agregar integrantes.
4. Crear tarea.
5. Elegir dificultad.
6. Guardar tarea.
7. Ver sugerencia automática.
8. Opcionalmente usar sorteo ponderado.
9. Ver simulación.
10. Confirmar asignación.
11. Sumar puntos, actualizar recompensa y guardar historial.
12. Mostrar animación de felicitaciones.

## Cambios y decisiones que fuimos haciendo

### Autenticación

- Se agregó crear cuenta, iniciar sesión y cerrar sesión.
- Cada usuario ve solo sus grupos.
- Si se intenta crear una cuenta con email repetido, la app manda al login y precarga el email.
- Se corrigió un bug donde la cuenta se creaba pero aparecía error `null`; el problema era usar `event.currentTarget` después de un `await`.

### Navegación

- Originalmente había sidebar vertical.
- Se cambió a navegación superior tipo píldora, inspirada en la referencia visual del usuario.
- Las secciones ahora funcionan como pantallas reales: solo una está visible a la vez.

### Estética

- Se cambió a una estética más premium y digital:
  - fondo oscuro;
  - gradientes violeta/naranja;
  - contenedor principal grande con bordes redondeados;
  - glassmorphism;
  - puntos sutiles en el fondo;
  - tarjetas con glow suave.

### Grupos

- Se agregó crear grupos.
- Se agregó seleccionar grupo activo.
- Se agregó eliminar grupo con confirmación.
- Al borrar el grupo activo, la app selecciona otro grupo si existe, o vuelve a la pantalla de grupos.

### Integrantes

- Se agregó agregar integrantes.
- Se corrigió el flujo para que, al agregar un integrante, la app permanezca en la sección Integrantes y permita seguir agregando.
- Se agregó eliminar integrantes con confirmación.
- El historial ya registrado se conserva por nombre aunque se borre el integrante.

### Tareas y dificultad

- Primero había varios votos manuales.
- Luego se hizo que hubiera un voto por integrante automáticamente.
- Finalmente se simplificó porque la app se usa una persona a la vez:
  - ahora hay un solo voto de dificultad;
  - lo elige quien crea la tarea;
  - no hay valor por defecto;
  - se debe elegir dificultad antes de guardar.
- Si se empieza a escribir una nueva tarea, se limpia la sugerencia anterior para no mostrar una recomendación vieja.

### Sorteo ponderado

- Originalmente mostraba solo un mensaje/toast.
- Se agregó una animación dentro del panel:
  - el botón pasa a `Sorteando...`;
  - las filas de probabilidades se resaltan una por una;
  - al final queda el resultado seleccionado;
  - la simulación se actualiza con la persona sorteada.

### Recompensas y celebración

- Se agregó una sección de recompensas con tarjetas por integrante.
- Se agregó barra de progreso hacia la siguiente recompensa.
- Al completar una tarea aparece un modal/animación de felicitaciones:
  - nombre del integrante;
  - tarea completada;
  - puntos ganados;
  - premio actual;
  - progreso hacia la próxima recompensa;
  - botones para seguir o ver recompensas.

## Problemas ya corregidos

- Error `null` al registrar usuario.
- Las secciones aparecían todas juntas en la pantalla.
- La navegación lateral no cambiaba realmente de vista.
- El botón de agregar integrante se agrandaba demasiado.
- El servidor debía reiniciarse para que nuevas rutas backend funcionaran.
- El botón de eliminar integrante aparecía pero no funcionaba si el backend seguía corriendo con versión vieja.
- La dificultad tenía un `3` por defecto y generaba sugerencia sin decisión real del usuario.

## Decisiones pendientes o posibles mejoras

- Agregar modo opcional:
  - `Estimación rápida`: vota quien crea la tarea.
  - `Votación grupal`: vota cada integrante y se calcula promedio.
- Agregar edición de grupos, integrantes o tareas.
- Agregar eliminación de tareas pendientes.
- Mejorar permisos/auth con sesiones reales o tokens.
- Migrar JSON local a SQLite si se quiere mayor robustez.
- Integrar IA solo como capa de explicación o asistencia, no como reemplazo de la lógica base.

## Nota para futura integración de IA

La IA debería funcionar como apoyo, por ejemplo:

- explicar por qué se sugiirió una persona;
- detectar posibles conflictos o desbalances;
- resumir historial;
- sugerir ajustes de reglas;
- redactar mensajes para el grupo.

Pero la IA no debería confirmar tareas ni modificar puntos automáticamente sin confirmación del usuario.

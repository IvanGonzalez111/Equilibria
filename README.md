# Equilibria MVP

Aplicación web fullstack para organizar tareas de grupo con asignación justa, puntos, recompensas e historial.

## Stack

- Frontend: HTML, CSS y JavaScript sin frameworks
- Backend: Node.js con Express
- Base de datos: JSON local en `data/db.json`

## Estructura

```text
.
├── data/
│   └── db.json
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
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
└── server.js
```

## Ejecutar

```bash
npm install
npm start
```

Luego abrir:

```text
http://localhost:3000
```

Para desarrollo con recarga automática de Node:

```bash
npm run dev
```

## Publicar online

Esta app necesita un servidor Node.js porque usa Express y rutas API. Por eso no funciona completa en GitHub Pages.

Una opción simple es publicarla en Render como Web Service:

```text
Build command: npm install
Start command: npm start
```

El archivo `render.yaml` ya deja esa configuración preparada.

Importante: la base local real `data/db.json` no se sube al repositorio para proteger usuarios, fotos y datos privados. Al iniciar en el servidor, la app crea una base vacía automáticamente.

## API

- `POST /api/register`
- `POST /api/login`
- `GET /api/groups/:userId`
- `POST /api/groups`
- `DELETE /api/groups/:groupId`
- `POST /api/groups/:groupId/members`
- `DELETE /api/groups/:groupId/members/:memberId`
- `POST /api/groups/:groupId/tasks`
- `PUT /api/groups/:groupId/tasks/:taskId/complete`
- `GET /api/groups/:groupId/history`

## Lógica de equilibrio

- La dificultad de una tarea se calcula como promedio de votos.
- La sugerencia automática elige al integrante con menos puntos acumulados.
- El sorteo ponderado aumenta la probabilidad de quienes tienen menor carga.
- Al completar una tarea se suman puntos, se incrementan tareas completadas, se recalcula recompensa y se guarda historial.
- Estado del grupo:
  - Diferencia menor o igual a 5: `Equilibrado`
  - Diferencia menor o igual a 12: `En observación`
  - Diferencia mayor a 12: `Desbalanceado`

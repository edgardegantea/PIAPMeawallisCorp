# PIAP v2 — Plataforma Interna de Administración de Proyectos

Reconstrucción de PIAP con **CodeIgniter 4.7** (backend API REST) + **React 19** (frontend SPA).

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend API | CodeIgniter 4.7 · PHP 8.4 · Firebase JWT |
| Frontend     | React 19 · Vite · Tailwind CSS v4 · Zustand · Recharts |
| Base de Datos | MySQL / MariaDB |

## Estructura

```
gestionproyectosv2/
├── backend/          # CodeIgniter 4.7 API REST
│   ├── app/
│   │   ├── Controllers/Api/   # AuthController, ProjectsController, ...
│   │   ├── Models/            # UserModel, ProjectModel, ...
│   │   ├── Filters/           # AuthFilter (JWT)
│   │   ├── Libraries/         # JWTHandler
│   │   └── Database/
│   │       ├── Migrations/    # 12 migraciones
│   │       └── Seeds/         # InitialSeeder
│   └── .env
└── frontend/         # React SPA
    └── src/
        ├── pages/             # Login, Register, Dashboard, Profile, Projects
        ├── components/        # Layout, SprintList, KanbanBoard, BacklogList, ...
        ├── services/          # api.js, projectsAPI.js
        └── stores/            # authStore (Zustand)
```

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login → tokens JWT |
| POST | `/api/auth/token/refresh` | Renovar access token |
| GET  | `/api/auth/profile` | Perfil del usuario autenticado |
| GET  | `/api/projects` | Listar proyectos |
| POST | `/api/projects` | Crear proyecto |
| GET  | `/api/projects/statistics` | Estadísticas globales |
| GET/POST | `/api/sprints` | Sprints |
| GET/POST | `/api/backlog` | Historias de usuario |
| GET/POST | `/api/tasks` | Tareas (Kanban) |
| GET/POST | `/api/risks` | Riesgos |
| GET/POST | `/api/incidents` | Incidencias |
| GET/POST | `/api/members` | Miembros del equipo |
| GET/POST | `/api/documents` | Documentos |
| GET/POST | `/api/categories` | Categorías |
| GET/PATCH | `/api/company-settings` | Config. de empresa |

## Configuración inicial

### 1. Base de datos

```sql
CREATE DATABASE gestionproyectosv2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd backend
cp env .env          # ya configurado si clonaste el repo
# Edita .env: database.default.username, password, hostname
php spark migrate
php spark db:seed InitialSeeder
php spark serve      # corre en http://localhost:8080
```

Usuario admin por defecto: `admin` / `Admin1234!`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev          # corre en http://localhost:5173
```

## Credenciales por defecto

| Campo | Valor |
|-------|-------|
| Usuario | `admin` |
| Contraseña | `Admin1234!` |
| Email | `admin@maewallis.com` |

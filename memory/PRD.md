# nexTalent - PRD (Product Requirements Document)

## Problema Original
Desarrollar una app web (nexTalent) que permita a los distintos usuarios obtener datos sobre tendencias laborales. El backend ya existe con LangGraph (sistema multiagente). Solo se requiere el frontend con visualizaciones interactivas (Apache ECharts) y endpoints mock para simular la conexion.

## Arquitectura

### Stack
- **Frontend**: React 19 + Tailwind CSS + Apache ECharts (echarts-for-react) + React Router
- **Backend**: FastAPI + Motor (MongoDB async) + JWT Auth (bcrypt + PyJWT)
- **Base de datos**: MongoDB
- **Design System**: Inspirado en Claude/Anthropic (parchment palette, Playfair Display serif, DM Sans, terracotta accents)

### Estructura de Archivos
```
/app/
├── backend/
│   ├── server.py          # FastAPI con todos los endpoints mock + auth
│   ├── .env               # Variables de entorno (MONGO_URL, JWT_SECRET, etc.)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js         # Router principal
│   │   ├── App.css        # Estilos globales
│   │   ├── index.css      # Design system CSS variables + fonts
│   │   ├── lib/
│   │   │   └── api.js     # Cliente API (axios)
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── Navbar.jsx
│   │   │       └── Footer.jsx
│   │   └── pages/
│   │       ├── HomePage.jsx              # Landing page
│   │       ├── JobSearchPage.jsx         # Busqueda avanzada + comparacion
│   │       ├── SkillsDashboardPage.jsx   # Skills mas demandadas (ECharts)
│   │       ├── RoleTrendsPage.jsx        # Tendencias por rol (ECharts)
│   │       ├── CompanyComparisonPage.jsx # Comparacion empresas (ECharts)
│   │       ├── SkillsGapPage.jsx         # Brechas de competencias (ECharts)
│   │       ├── LoginPage.jsx             # Inicio de sesion
│   │       └── SignupPage.jsx            # Registro
│   └── .env
```

## Casos de Uso Implementados

### 1. Busqueda Avanzada de Empleo (/search)
- Dos modos: texto libre (prompt) o subida de CV (PDF via drag & drop)
- Resultados con match score, skills, salario, ubicacion
- Seleccion multiple de ofertas para comparacion

### 2. Comparacion Lado a Lado (/search -> seleccionar ofertas)
- Seleccionar 2+ ofertas y comparar en vista lado a lado
- Comparativa de salario, ubicacion, skills, beneficios, tipo de trabajo

### 3. Skills mas Demandadas (/skills)
- Grafico de barras ranking de skills
- Grafico scatter demanda vs crecimiento
- Grafico pie por categoria
- Tabla detallada con barras de progreso

### 4. Tendencias por Rol (/trends)
- Grafico de lineas evolucion demanda 12 meses (5 roles)
- Grafico de barras salario medio por rol
- Detalle por rol: salario, crecimiento, remoto %, top skills

### 5. Comparacion de Empresas (/companies)
- Grafico radar comparativa general
- Grafico de barras salario medio
- Filtro toggle de empresas
- Cards detalladas: empleados, vacantes, remoto, rating, skills, beneficios

### 6. Brechas de Competencias (/skills-gap)
- Selector de rol objetivo
- Input de skills con sugerencias rapidas
- Gauge de cobertura de competencias
- Radar perfil vs requerido
- Desglose skill por skill
- Recomendaciones priorizadas

## API Endpoints (MOCK)

### Auth
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login con JWT cookies
- `POST /api/auth/logout` - Cerrar sesion
- `GET /api/auth/me` - Usuario actual

### Datos (MOCK - para conectar con LangGraph)
- `POST /api/jobs/search` - Busqueda de empleo (form-data: prompt o cv_file)
- `POST /api/offers/compare` - Comparar ofertas por IDs
- `GET /api/skills/demand` - Skills mas demandadas
- `GET /api/trends/roles` - Tendencias por rol
- `GET /api/companies/compare` - Comparacion empresas
- `POST /api/skills/gap` - Analisis de brechas (body: user_skills, target_role)
- `GET /api/skills/gap/roles` - Roles disponibles

## Estado Actual
- **Frontend**: 100% implementado con todas las paginas y visualizaciones ECharts
- **Backend**: Mock completo con datos simulados + Auth funcional
- **Testing**: Backend 100%, Frontend 95%
- **Fecha**: 9 Enero 2026

## Backlog (P0/P1/P2)

### P0 - Critico
- Conectar endpoints mock con el backend real de LangGraph

### P1 - Importante  
- Proteger rutas con auth cuando el usuario lo configure
- Persistencia de busquedas y comparaciones del usuario
- Filtros avanzados en busqueda (ubicacion, salario, remoto)

### P2 - Mejora
- Dashboard personalizado por usuario
- Alertas de nuevas ofertas matching
- Exportar comparaciones a PDF
- Dark mode toggle
- Internacionalizacion (i18n)

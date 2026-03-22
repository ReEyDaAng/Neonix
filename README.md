# Neonix

## 1. Коротко про проект
Neonix — fullstack вебзастосунок для реального часу, натхненний Discord. Поточна архітектура включає:
- **Frontend**: Next.js + TypeScript
- **Backend**: NestJS + Prisma ORM
- **База даних**: PostgreSQL
- **Кеш / брокер допоміжних сервісів**: Redis
- **Realtime**: Socket.IO
- **Контейнеризація**: Docker, Docker Compose
- **Reverse proxy у production**: Nginx

---

                        🌐 Internet (Users)
                                │
                                ▼
                        ┌───────────────┐
                        │   Nginx /     │
                        │ Reverse Proxy │
                        └──────┬────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
        ┌───────────────┐            ┌───────────────┐
        │   Frontend    │            │    Backend    │
        │   Next.js     │◄──────────►│   NestJS API  │
        │ (React App)   │   REST     │ + WebSockets  │
        └───────────────┘            └──────┬────────┘
                                           │
                           ┌───────────────┼───────────────┐
                           │                               │
                           ▼                               ▼
                  ┌───────────────┐              ┌───────────────┐
                  │ PostgreSQL DB │              │     Redis     │
                  │   (Prisma)    │              │   (Cache /    │
                  │               │              │   Pub/Sub)    │
                  └───────────────┘              └───────────────┘

---

## 🚀 Features

- 🔐 User authentication (JWT)
- 💬 Real-time chat (WebSocket)
- 🧩 Rooms and channels system
- ⚡ Live typing indicators and message updates
- 🌐 REST API + WebSocket integration
- 🎨 Modern UI (Next.js frontend)

---

## 🧱 Tech Stack

### Frontend
- Next.js (React)
- TypeScript
- Fetch API
- Socket.io-client

### Backend
- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- Socket.io

### Infrastructure
- Docker & Docker Compose
- Nginx (reverse proxy)
- VPS deployment (production-ready setup)

---

## 2. Структура проекту
```text
Neonix/
├── backend/                 # NestJS API, Prisma, WebSocket gateway
├── frontend/                # Next.js клієнт
├── landing/                 # окремі матеріали/статичні напрацювання
├── docs/                    # документація для deployment / update / backup
├── scripts/                 # скрипти автоматизації
├── .github/workflows/       # CI/CD конфігурація
├── docker-compose.yml       # локальне dev-середовище
├── docker-compose.prod.yml  # production-середовище
└── README.md
```

## 3. Архітектура
```mermaid
flowchart LR
    U[Browser / User] --> FE[Next.js Frontend\nPort 3000]
    FE --> API[NestJS Backend\nREST + WebSocket\nPort 4000]
    API --> DB[(PostgreSQL)]
    API --> R[(Redis)]
    N[Nginx Reverse Proxy\nProduction] --> FE
    N --> API
```

## 4. Що входить до складу системи
- **Вебсервер**: Nginx у production
- **Application server**: NestJS backend
- **Frontend application**: Next.js
- **СУБД**: PostgreSQL 16
- **Файлове сховище**: окреме централізоване сховище у поточному репозиторії не реалізоване
- **Сервіси кешування**: Redis 7
- **Інші компоненти**:
  - Prisma ORM
  - Swagger (`/api/docs`)
  - Socket.IO для realtime чату

---

# Інструкція для розробника

## 5. Мінімальні вимоги до робочої станції
ОС:
- Windows 10/11, Ubuntu 22.04+, або macOS

ПЗ, яке потрібно встановити:
- **Git**
- **Node.js 20 LTS**
- **npm 10+**
- **Docker Desktop** (Windows/macOS) або Docker Engine + Docker Compose plugin (Linux)
- **VS Code** або інший IDE

Рекомендовано:
- PostgreSQL клієнт (наприклад, DBeaver)
- Redis Insight
- Postman / Bruno

## 6. Клонування репозиторію
```bash
git clone https://github.com/ReEyDaAng/Neonix.git
cd Neonix
```

## 7. Варіант 1: швидкий запуск через Docker Compose
Цей варіант найпростіший для нового розробника.

### Крок 1. Зібрати та запустити контейнери
```bash
docker compose up --build
```

### Крок 2. Перевірити доступність сервісів
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`
- Swagger: `http://localhost:4000/api/docs`

### Крок 3. Зупинка проекту
```bash
docker compose down
```

### Крок 4. Повне очищення разом з томами БД
```bash
docker compose down -v
```

## 8. Варіант 2: локальний запуск без Docker (для активної розробки)

### Крок 1. Підняти тільки інфраструктуру
```bash
docker compose up -d postgres redis
```

### Крок 2. Встановити залежності backend
```bash
cd backend
npm ci
```

### Крок 3. Створити `.env` для backend
Створити файл `backend/.env`:
```env
PORT=4000
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
JWT_SECRET=dev_secret_change_me
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/neonix?schema=public
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/neonix?schema=public
```

### Крок 4. Згенерувати Prisma client та виконати міграції
```bash
npx prisma generate
npx prisma migrate deploy
```

Для повністю локальної розробки з новими міграціями можна використовувати:
```bash
npx prisma migrate dev
```

### Крок 5. Запустити backend
```bash
npm run start:dev
```

### Крок 6. Встановити залежності frontend
В іншому терміналі:
```bash
cd frontend
npm ci
```

### Крок 7. Створити `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

### Крок 8. Запустити frontend
```bash
npm run dev
```

### Крок 9. Відкрити проект у браузері
- `http://localhost:3000`

## 9. Базові команди

### Root
```bash
docker compose up --build
docker compose down
docker compose down -v
```

### Backend
```bash
cd backend
npm ci
npm run build
npm run start:dev
npm run lint
npm run test
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
```

### Frontend
```bash
cd frontend
npm ci
npm run dev
npm run build
npm run start
npm run lint
```

## 10. Типовий порядок роботи розробника
1. Отримати останній код з `master`
2. Підняти PostgreSQL і Redis
3. Оновити `backend/.env` та `frontend/.env.local`
4. Запустити міграції Prisma
5. Запустити backend у `start:dev`
6. Запустити frontend у `dev`
7. Перевірити роботу UI, REST API та WebSocket

## 11. Швидка перевірка працездатності після локального запуску
- відкривається сторінка `http://localhost:3000`
- API відповідає на `http://localhost:4000`
- Swagger відкривається на `http://localhost:4000/api/docs`
- чатова сторінка завантажує кімнати/канали
- можна зареєструватися / увійти
- повідомлення надсилаються у реальному часі

## 🐳 Run with Docker

docker compose up --build

---

## 📝 Documentation

- Swagger API docs: `http://localhost:4000/api/docs`
- TypeDoc output:
  - Backend: `backend/docs/reference`
  - Frontend: `frontend/docs/reference`
- Documentation standards: use `@nestjs/swagger` decorators in controllers, `@ApiProperty()` in DTOs, and TSDoc comments for services/gateways.
- Additional docs: `docs/generate_docs.md`, `docs/architecture.md`, `docs/business_logic.md`, `docs/test_driven_documentation.md`, `docs/api/openapi.yaml`

## �🇦🇬🇧 Documentation Languages
Documentation is available in:
- 🇺🇦 Ukrainian: `/docs/ua`
- 🇬🇧 English: `/docs/en`

## 12. Додаткова документація
- [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md)
- [docs/UPDATE_RUNBOOK.md](docs/UPDATE_RUNBOOK.md)
- [docs/BACKUP_AND_RESTORE.md](docs/BACKUP_AND_RESTORE.md)

---

## 📄 License

MIT License

---

## �🎓 Author

Maksym Pylypushko  
Bachelor Thesis Project (SumDU)
# Neonix

Neonix is a fullstack web application for real-time communication, inspired by modern platforms like Discord.  
The project is developed as a bachelor thesis and demonstrates the design and implementation of a scalable chat system with real-time interaction.

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

## 🌍 Production

The project is deployed and available online:

https://neonix.app

---

## 📁 Project Structure

Neonix/
│
├── frontend/              # Next.js client application
├── backend/               # NestJS server application
├── docker-compose.prod.yml # production configuration
├── .env.backend.example    # backend env template
├── .env.frontend.example   # frontend env template
└── README.md

---

## ⚙️ Environment Variables

Create `.env` files based on examples.

---

## 🐳 Run with Docker

docker compose up --build

---

## 📄 License

MIT License

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

## �🎓 Author

Maksym Pylypushko  
Bachelor Thesis Project (SumDU)

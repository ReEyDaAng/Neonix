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

## 🎓 Author

Maksym Pylypushko  
Bachelor Thesis Project (SumDU)

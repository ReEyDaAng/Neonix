# Generate Documentation

## Backend
1. Install dependencies: `cd backend && npm install`
2. Run linter: `npm run docs:lint`
3. Generate TypeDoc: `npm run docs:generate`
4. View generated docs at `backend/docs/reference/index.html` (serve it with any static server)

## Frontend
1. Install dependencies: `cd frontend && npm install`
2. Run linter: `npm run docs:lint`
3. Generate TypeDoc: `npm run docs:generate`
4. View generated docs at `frontend/docs/reference/index.html`

## Swagger
1. Start backend: `cd backend && npm run start:dev`
2. Open browser: `http://localhost:4000/api/docs`

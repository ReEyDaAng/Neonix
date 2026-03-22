@echo off
echo [dev-up] starting postgres and redis...
docker compose up -d postgres redis
echo [dev-up] done.
echo Next steps:
echo   1) cd backend ^&^& npm ci ^&^& npm run start:dev
echo   2) cd frontend ^&^& npm ci ^&^& npm run dev

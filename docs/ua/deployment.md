# Neonix — Production Deployment Guide

## 1. Призначення
Ця інструкція призначена для release engineer / DevOps-фахівця, який виконує перше production-розгортання Neonix.

## 2. Архітектура production
```mermaid
flowchart TB
    Internet --> Nginx[Nginx reverse proxy\nSSL termination]
    Nginx --> Frontend[Frontend container\nNext.js :3000]
    Nginx --> Backend[Backend container\nNestJS :4000]
    Backend --> Postgres[(PostgreSQL 16)]
    Backend --> Redis[(Redis 7)]
    Admin[Release Engineer] --> Host[VPS / Linux Server]
    Host --> Docker[Docker Compose]
```

## 3. Вимоги до апаратного забезпечення
### Мінімум для демонстраційного / навчального production
- Архітектура: **x86_64 / amd64**
- CPU: **2 vCPU**
- RAM: **4 GB**
- Disk: **25 GB SSD**
- Network: статична IP або прив’язаний домен

### Рекомендовано
- CPU: **4 vCPU**
- RAM: **8 GB**
- Disk: **50+ GB SSD**
- окремий диск або volume для резервних копій

## 4. Необхідне програмне забезпечення
На сервері мають бути встановлені:
- Ubuntu 22.04 LTS або новіше
- Git
- Docker Engine
- Docker Compose plugin
- Nginx
- OpenSSL / certbot (або інший механізм SSL)
- curl
- ufw (рекомендовано)

## 5. Налаштування мережі
Відкрити порти:
- `22/tcp` — SSH
- `80/tcp` — HTTP
- `443/tcp` — HTTPS

Не відкривати назовні:
- `3000` — frontend container
- `4000` — backend container
- `5432` — PostgreSQL
- `6379` — Redis

У production `docker-compose.prod.yml` вже прив’язує frontend/backend до `127.0.0.1`, тобто вони доступні лише локально на сервері.

## 6. Рекомендована структура директорій на сервері
```text
/opt/neonix/
├── backend/
├── frontend/
├── docs/
├── scripts/
├── .env.backend
├── .env.frontend
├── docker-compose.prod.yml
└── backups/
```

## 7. Клонування коду
```bash
sudo mkdir -p /opt/neonix
sudo chown -R $USER:$USER /opt/neonix
cd /opt/neonix
git clone https://github.com/ReEyDaAng/Neonix.git .
```

## 8. Налаштування backend environment
Створити файл `.env.backend` у корені проекту:
```env
POSTGRES_DB=neonix
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
PORT=4000
CORS_ORIGIN=https://neonix.app,https://www.neonix.app
JWT_SECRET=CHANGE_ME_LONG_RANDOM_SECRET
DATABASE_URL=postgresql://postgres:CHANGE_ME_STRONG_PASSWORD@postgres:5432/neonix?schema=public
DIRECT_URL=postgresql://postgres:CHANGE_ME_STRONG_PASSWORD@postgres:5432/neonix?schema=public
```

## 9. Налаштування frontend environment
Створити файл `.env.frontend` у корені проекту:
```env
NEXT_PUBLIC_API_URL=https://api.neonix.app
NEXT_PUBLIC_WS_URL=https://api.neonix.app
```

> Якщо frontend і backend обслуговуються з одного домену через reverse proxy, значення можна адаптувати до фактичної схеми маршрутизації.

## 10. Розгортання контейнерів
```bash
cd /opt/neonix
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## 11. Ініціалізація БД і міграцій
У поточній конфігурації backend контейнер запускається з командою:
```bash
npx prisma migrate deploy && node dist/src/main.js
```
Тобто production-міграції застосовуються автоматично під час старту backend.

## 12. Конфігурація Nginx
Приклад reverse proxy:
```nginx
server {
    listen 80;
    server_name neonix.app www.neonix.app;
    return 301 https://$host$request_uri;
}

server {
    listen 80;
    server_name api.neonix.app;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name neonix.app www.neonix.app;

    ssl_certificate /etc/letsencrypt/live/neonix.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neonix.app/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.neonix.app;

    ssl_certificate /etc/letsencrypt/live/api.neonix.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.neonix.app/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 13. Перевірка працездатності
Після запуску потрібно перевірити:

### Контейнери
```bash
docker compose -f docker-compose.prod.yml ps
```
Усі сервіси мають бути в стані `Up`.

### Логи backend
```bash
docker compose -f docker-compose.prod.yml logs --tail=200 backend
```
Очікувано:
- відсутність помилок Prisma migration
- повідомлення про старт API

### HTTP перевірки
```bash
curl -I https://neonix.app
curl -I https://api.neonix.app/api/docs
```

### Функціональна перевірка
- відкривається landing / frontend
- відкривається сторінка чату
- реєстрація та логін працюють
- кімнати та канали завантажуються
- чат передає повідомлення у realtime

## 14. Конфігурація СУБД
- БД працює в окремому контейнері PostgreSQL 16
- дані БД зберігаються у docker volume `postgres-data`
- зовнішній доступ до БД не публікується
- пароль користувача postgres має бути змінений відносно dev-значення
- перед production рекомендується окремий користувач БД з мінімально необхідними правами

## 15. Базові команди для DevOps
```bash
# запуск
./scripts/prod-up.sh

# зупинка
./scripts/prod-down.sh

# перегляд стану
./scripts/prod-status.sh

# перегляд логів
./scripts/prod-logs.sh
```

## 16. Realtime media (LiveKit + coturn)

### 16.1 DNS і сертифікати
1. Створити A-записи:
   - `livekit.neonix.app` → IP VPS
   - `turn.neonix.app` → IP VPS
2. Випустити Let's Encrypt сертифікати:
   ```bash
   sudo certbot certonly --standalone -d livekit.neonix.app
   sudo certbot certonly --standalone -d turn.neonix.app
   ```
3. Зареєструвати deploy-hook для автоматичного оновлення coturn:
   ```bash
   sudo certbot renew --deploy-hook /home/neonix/apps/neonix/scripts/coturn-renew-hook.sh
   ```

### 16.2 Firewall (UFW)
```bash
sudo ufw allow 443/tcp                       # Nginx
sudo ufw allow 50000:50100/udp               # LiveKit RTC media
sudo ufw allow 50000:50100/tcp               # LiveKit TCP fallback
sudo ufw allow 3478                          # STUN/TURN
sudo ufw allow 5349/tcp                      # TURN over TLS
sudo ufw allow 49160:49200/udp               # coturn relay
```

### 16.3 Конфігурація
1. Згенерувати LiveKit API key + secret:
   ```bash
   ./scripts/gen-livekit-key.sh >> .env.backend
   ```
2. Заповнити у `.env.backend`:
   - `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
   - `LIVEKIT_URL=wss://livekit.neonix.app`
   - `TURN_HOST=turn.neonix.app`, `TURN_USERNAME`, `TURN_PASSWORD`
3. У `infra/coturn/turnserver.conf` замінити плейсхолдери (через `envsubst` під час старту контейнера це відбувається автоматично, але якщо запускати поза docker — підставити вручну):
   - `__TURN_EXTERNAL_IP__`, `__VPS_PUBLIC_IP__`, `__TURN_USERNAME__`, `__TURN_PASSWORD__`.
4. Покласти Nginx-конфіг у `/etc/nginx/sites-available/livekit.neonix.app`:
   ```bash
   sudo cp infra/nginx/livekit.neonix.app.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/livekit.neonix.app.conf \
              /etc/nginx/sites-enabled/livekit.neonix.app.conf
   sudo nginx -t && sudo nginx -s reload
   ```

### 16.4 Запуск нових сервісів
```bash
docker compose -f docker-compose.prod.yml up -d livekit coturn
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
docker compose -f docker-compose.prod.yml restart backend frontend
```

### 16.5 Перевірка
1. `curl https://livekit.neonix.app` — повинно повернути LiveKit OK.
2. `livekit-cli room list --url wss://livekit.neonix.app --api-key $LIVEKIT_API_KEY --api-secret $LIVEKIT_API_SECRET` — повертає порожній список.
3. `turnutils_uclient -t -T -u $TURN_USERNAME -w $TURN_PASSWORD turn.neonix.app` — успішне відведення relay-кандидата.
4. На двох пристроях у різних мережах (LAN + 4G):
   - Зайти у Neonix, відкрити VOICE або VIDEO канал.
   - Натиснути Join.
   - Через chrome://webrtc-internals переконатися, що при заблокованому UDP вибирається ICE-кандидат з типом `relay` (TURN).
   - Перевірити screen-share, малювання-анотації, raise-hand, передачу presenter-ролі.

### 16.6 Можливі ризики на VPS
- **Bandwidth**: 30 учасників × ~3 Mbps ≈ 90 Mbps egress peak. Перевірити план провайдера.
- **UDP блокується** деякими хостингами — попередньо перевірити `nc -u`.
- **`external-ip` у `livekit.yaml`/`turnserver.conf`** має точно збігатися з публічним IP VPS, інакше ICE падає на симетричному NAT.
- **Поновлення Let's Encrypt**: переконатися, що `coturn-renew-hook.sh` зареєстровано — без перезапуску coturn нові сертифікати не активуються.


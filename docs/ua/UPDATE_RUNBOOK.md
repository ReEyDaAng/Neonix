# Neonix — Runbook оновлення production

## 1. Мета
Цей документ описує безпечну процедуру оновлення Neonix у production середовищі.

## 2. Коли потрібен простій
Простій може знадобитися, якщо:
- змінюється Prisma schema
- виконуються незворотні міграції БД
- змінюються критичні environment variables
- змінюється конфігурація reverse proxy

Якщо змін немає у БД і конфігурації, простій може бути мінімальним.

## 3. Підготовка до оновлення
Перед оновленням обов’язково:
1. Узгодити вікно оновлення
2. Перевірити список змін у Git
3. Перевірити `docker-compose.prod.yml`
4. Перевірити `.env.backend` та `.env.frontend`
5. Переконатися, що резервна копія створена
6. Перевірити вільне місце на диску

Команди:
```bash
cd /opt/neonix
git fetch --all
git log --oneline --decorate --graph HEAD..origin/master
```

## 4. Резервне копіювання перед оновленням
### Резервна копія БД
```bash
./scripts/backup-db.sh
```

### Резервна копія конфігурацій
```bash
mkdir -p backups/configs/$(date +%F_%H-%M-%S)
cp .env.backend backups/configs/$(date +%F_%H-%M-%S)/.env.backend
cp .env.frontend backups/configs/$(date +%F_%H-%M-%S)/.env.frontend
cp docker-compose.prod.yml backups/configs/$(date +%F_%H-%M-%S)/docker-compose.prod.yml
```

## 5. Перевірка сумісності
Необхідно перевірити:
- сумісність нових змін з поточною Prisma schema
- чи не змінився формат змінних середовища
- чи не потрібні нові порти / DNS записи
- чи не потрібно міняти Nginx конфіг
- чи сумісний новий frontend із поточним backend API

## 6. Процес оновлення
### Крок 1. Перейти до каталогу проєкту
```bash
cd /opt/neonix
```

### Крок 2. Отримати останній код
```bash
git pull origin master
```

### Крок 3. За потреби оновити env-конфігурації
```bash
nano .env.backend
nano .env.frontend
```

### Крок 4. Перезібрати образи
```bash
docker compose -f docker-compose.prod.yml build --no-cache
```

### Крок 5. Зупинити сервіси, якщо потрібен контрольований простій
```bash
docker compose -f docker-compose.prod.yml down
```

### Крок 6. Запустити нову версію
```bash
docker compose -f docker-compose.prod.yml up -d
```

> У поточній реалізації міграції Prisma застосуються автоматично під час старту backend-контейнера.

## 7. Оновлення конфігурацій
Після оновлення потрібно перевірити:
- чи актуальні `.env.backend` і `.env.frontend`
- чи не з’явилися нові обов’язкові змінні
- чи не потрібно оновити Nginx virtual hosts
- чи не потрібно оновити SSL-сертифікати

## 8. Перевірка після оновлення
### Технічна перевірка
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 backend
docker compose -f docker-compose.prod.yml logs --tail=100 frontend
```

### Приклад smoke-check
```bash
curl -I https://neonix.app
curl -I https://api.neonix.app/api/docs
```

### Функціональна перевірка
- frontend завантажується
- API відповідає
- Swagger відкривається
- логін / реєстрація працюють
- чат завантажує кімнати та канали
- відправлення повідомлення працює
- WebSocket не падає після підключення

## 9. Rollback у разі невдалого оновлення
### Ознаки невдалого оновлення
- backend контейнер постійно перезапускається
- Prisma migration завершується з помилкою
- frontend повертає 502/504 через Nginx
- API не відповідає або повертає 500

### Процедура rollback
1. Визначити останній стабільний commit
```bash
git log --oneline -n 10
```
2. Повернути код до стабільної ревізії
```bash
git checkout <STABLE_COMMIT>
```
3. Перезібрати та перезапустити сервіси
```bash
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```
4. Якщо проблема в міграції БД — відновити резервну копію БД
```bash
./scripts/restore-db.sh /opt/neonix/backups/db/<dump-file>.sql.gz
```
5. Повернути попередні `.env` за потреби

## 10. Мінімальний чекліст оновлення
- [ ] є резервна копія БД
- [ ] збережені конфігурації
- [ ] перевірені зміни у Prisma schema
- [ ] підтверджений maintenance window
- [ ] успішно виконано `git pull`
- [ ] контейнер backend стартує без помилок
- [ ] контейнер frontend стартує без помилок
- [ ] smoke tests пройдені
- [ ] rollback plan підготовлений

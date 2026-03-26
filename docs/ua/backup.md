# Neonix — Backup and Restore Guide

## 1. Мета
Документ описує стратегію резервного копіювання, перевірку цілісності копій та процедуру повного або вибіркового відновлення.

## 2. Що треба резервувати
Обов’язково:
- база даних PostgreSQL
- `.env.backend`
- `.env.frontend`
- `docker-compose.prod.yml`
- Nginx конфігурація
- SSL-сертифікати або спосіб їх перевипуску
- журнали / логи за потреби аналізу інцидентів

Опційно:
- docker image tags
- Git commit hash поточної production-версії

## 3. Стратегія резервного копіювання
Рекомендована комбінація:
- **повна резервна копія БД** щодня
- **інкрементальні/архівні копії** логів — щодня або щотижня
- **резервні копії конфігурацій** перед кожним оновленням
- **позачергова повна копія** перед міграціями БД

## 4. Типи резервних копій
### Повні
Містять увесь дамп БД і повну копію конфігурацій.

### Інкрементальні
Застосовні до логів, артефактів або file-based storage. Для Neonix у поточному вигляді головним є повний дамп БД.

### Диференціальні
Можуть використовуватися для конфігурацій чи бекап-систем рівня файлової системи, але для цього проєкту достатньо повних копій БД + копій конфігів.

## 5. Частота створення копій
Мінімально:
- щодня о 03:00 — повний дамп PostgreSQL
- перед кожним релізом — позапланова копія
- щотижня — архівація логів
- щомісяця — тестове відновлення на окремому стенді

## 6. Зберігання та ротація
Рекомендація:
- локально на сервері — останні 7 денних копій
- окреме віддалене сховище — останні 4 тижневі копії
- окремий архів — 3 щомісячні копії

Приклад політики:
- daily: 7
- weekly: 4
- monthly: 3

## 7. Процедура резервного копіювання БД
### Ручний запуск
```bash
./scripts/backup-db.sh
```

### Що робить скрипт
- створює каталог `backups/db`
- виконує `pg_dump`
- стискає файл через `gzip`
- створює checksum `.sha256`
- видаляє старі копії згідно ротації

## 8. Резервне копіювання конфігурацій
```bash
STAMP=$(date +%F_%H-%M-%S)
mkdir -p backups/configs/$STAMP
cp .env.backend backups/configs/$STAMP/
cp .env.frontend backups/configs/$STAMP/
cp docker-compose.prod.yml backups/configs/$STAMP/
sudo cp /etc/nginx/sites-available/neonix.conf backups/configs/$STAMP/ 2>/dev/null || true
```

## 9. Резервне копіювання користувацьких даних
На поточному етапі користувацькі дані зберігаються в PostgreSQL. Окреме файлове сховище в архітектурі репозиторію не реалізоване, тому головний об’єкт резервування — база даних.

## 10. Резервне копіювання логів
Приклад:
```bash
mkdir -p backups/logs/$(date +%F)
docker compose -f docker-compose.prod.yml logs backend > backups/logs/$(date +%F)/backend.log
docker compose -f docker-compose.prod.yml logs frontend > backups/logs/$(date +%F)/frontend.log
```

## 11. Перевірка цілісності резервних копій
Після створення дампа перевірити checksum:
```bash
sha256sum -c backups/db/<file>.sha256
```

Додатково:
- перевірити, що дамп не порожній
- періодично виконувати тестове відновлення на staging

## 12. Автоматизація резервного копіювання
### Через cron
```cron
0 3 * * * /opt/neonix/scripts/backup-db.sh >> /var/log/neonix-backup.log 2>&1
```

## 13. Повне відновлення системи
### Крок 1. Зупинити сервіси
```bash
cd /opt/neonix
docker compose -f docker-compose.prod.yml down
```

### Крок 2. За потреби відновити конфігурації
```bash
cp backups/configs/<STAMP>/.env.backend .env.backend
cp backups/configs/<STAMP>/.env.frontend .env.frontend
cp backups/configs/<STAMP>/docker-compose.prod.yml docker-compose.prod.yml
```

### Крок 3. Запустити PostgreSQL
```bash
docker compose -f docker-compose.prod.yml up -d postgres
```

### Крок 4. Відновити БД
```bash
./scripts/restore-db.sh /opt/neonix/backups/db/<dump-file>.sql.gz
```

### Крок 5. Запустити всі сервіси
```bash
docker compose -f docker-compose.prod.yml up -d
```

## 14. Вибіркове відновлення даних
Для вибіркового відновлення:
1. Відновити дамп на окремий staging/PostgreSQL instance
2. Вивантажити лише потрібні таблиці/рядки
3. Імпортувати їх контрольовано в production

Пряме вибіркове відновлення у production без staging не рекомендується.

## 15. Тестування відновлення
Мінімум раз на місяць треба:
- підняти test/staging середовище
- відновити останній дамп БД
- перевірити цілісність таблиць `User`, `Room`, `Channel`, `Message`
- перевірити, що frontend та backend запускаються після restore

## 16. Чекліст резервування
- [ ] створено дамп БД
- [ ] створено checksum
- [ ] збережено env-файли
- [ ] збережено docker-compose.prod.yml
- [ ] збережено Nginx конфіг
- [ ] збережено логи релізу
- [ ] перевірено можливість test-restore

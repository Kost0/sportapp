# sport workspace

В этой папке два независимых репозитория:

- `frontend/` - Expo приложение
- `backend/` - Go сервисы + `docker-compose.yml`

Цель - удобный локальный запуск без объединения git-историй.

## Требования

- Docker + Docker Compose v2
- Node.js + npm

## Быстрый старт (локально)

0) Проверка окружения

```bash
make doctor
```

Если нужен `backend/.env` (JWT/ключи), можно сгенерировать его из примера:

```bash
make backend-env
```

1) Инфраструктура для backend (db/mongo/kafka)

```bash
make infra-up
```

2) Backend сервисы

```bash
make backend-up
```

3) Frontend (в отдельном терминале)

```bash
make frontend-install
make frontend-start
```

## Полезное

```bash
make logs
make backend-down
```

## Переменные окружения

- Скопируй `backend/env.example` в `backend/.env` и поменяй значения при необходимости.

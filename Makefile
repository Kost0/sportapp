
.PHONY: help infra-up infra-down backend-up backend-down logs frontend-install frontend-start dev doctor backend-env

# Prefer Docker Compose v2 (`docker compose`); fall back to v1 (`docker-compose`).
COMPOSE_CMD := docker compose
ifeq (, $(shell docker compose version >/dev/null 2>&1 && echo ok))
  COMPOSE_CMD := docker-compose
endif

COMPOSE := $(COMPOSE_CMD) --project-directory backend -f $(CURDIR)/docker-compose.yml

# Force classic builder to avoid requiring the buildx plugin.
COMPOSE_BUILD_ENV := DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0

help:
	@printf '%s\n' \
	  'Targets:' \
	  '  make doctor            Check local prerequisites' \
	  '  make backend-env        Create backend/.env from backend/env.example' \
	  '  make infra-up          Start db/mongo/kafka services' \
	  '  make backend-up         Build+start backend services' \
	  '  make logs               Tail backend compose logs' \
	  '  make backend-down       Stop backend compose stack' \
	  '  make frontend-install   Install frontend deps (npm)' \
	  '  make frontend-start     Start Expo dev server'

doctor:
	@command -v docker >/dev/null 2>&1 || { printf '%s\n' 'docker: not found (install Docker Desktop/Engine)'; exit 1; }
	@$(COMPOSE_CMD) version >/dev/null 2>&1 || { printf '%s\n' 'docker compose: not found (install Docker Compose v2 or docker-compose)'; exit 1; }
	@printf '%s\n' 'OK'

backend-env:
	@test -f backend/.env || { cp backend/env.example backend/.env && printf '%s\n' 'Created backend/.env from backend/env.example'; }

infra-up:
	$(COMPOSE) up -d \
		postgres-auth postgres-activities postgres-profiles mongodb zookeeper kafka kafka-init

infra-down:
	$(COMPOSE) stop postgres-auth postgres-activities postgres-profiles mongodb zookeeper kafka kafka-init

backend-up:
	$(COMPOSE_BUILD_ENV) $(COMPOSE) up -d --build \
		gateway auth activities views user-profiles news-feed activity-ops map-activities user-info news-collector

backend-down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f --tail=200

frontend-install:
	cd frontend && npm install

frontend-start:
	cd frontend && npx expo start

dev:
	$(MAKE) infra-up
	$(MAKE) backend-up
	@printf '%s\n' 'Frontend: run `make frontend-start` in another terminal'

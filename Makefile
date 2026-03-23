.PHONY: help infra-up infra-down backend-up backend-down logs frontend-install frontend-start dev

COMPOSE := docker compose --project-directory backend -f docker-compose.yml

help:
	@printf '%s\n' \
	  'Targets:' \
	  '  make infra-up          Start db/mongo/kafka services' \
	  '  make backend-up         Build+start backend services' \
	  '  make logs               Tail backend compose logs' \
	  '  make backend-down       Stop backend compose stack' \
	  '  make frontend-install   Install frontend deps (npm)' \
	  '  make frontend-start     Start Expo dev server'

infra-up:
	$(COMPOSE) up -d \
		postgres-auth postgres-activities postgres-profiles mongodb zookeeper kafka kafka-init

infra-down:
	$(COMPOSE) stop postgres-auth postgres-activities postgres-profiles mongodb zookeeper kafka kafka-init

backend-up:
	$(COMPOSE) up -d --build \
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

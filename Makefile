.PHONY: up down logs test lint clean migrate

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

test:
	cd backend  && npm test
	cd frontend && npm test
	cd ml       && pytest
	cd biomech  && pytest

lint:
	cd backend  && npm run lint
	cd frontend && npm run lint

migrate:
	cd backend && npx prisma migrate dev

clean:
	docker compose down -v
	rm -rf backend/node_modules frontend/node_modules
	find . -type d -name __pycache__ -prune -exec rm -rf {} +

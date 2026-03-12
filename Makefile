.PHONY: dev up down demo logs clean docs

dev:
	@echo "Starting backend and frontend in dev mode..."
	cd backend && npm run dev &
	cd frontend && npm run dev &
	@echo "Backend: http://localhost:3000  Frontend: http://localhost:5173"

up:
	docker-compose up --build -d
	@echo "Quorum running at http://localhost:8080"

down:
	docker-compose --profile demo down

demo:
	docker-compose --profile demo up --build -d
	@echo "Waiting for services..."
	@sleep 10
	@echo "Running demo scenario..."
	cd demo && node run-scenario.js scenarios/silent-failures.json
	@echo "Dashboard: http://localhost:8080"

logs:
	docker-compose logs -f

clean:
	docker-compose --profile demo down -v
	@echo "Volumes removed"

docs:
	cd mintlify && mint dev

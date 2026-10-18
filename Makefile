.PHONY: up down restart logs ps healthcheck clean

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

ps:
	docker compose ps

healthcheck:
	@powershell -ExecutionPolicy Bypass -File ./scripts/healthcheck.ps1 || bash ./scripts/healthcheck.sh

clean:
	docker compose down -v

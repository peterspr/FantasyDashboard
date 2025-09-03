.PHONY: init up down logs api web dbt-debug dbt-seed dbt-build dbt-docs dbt-freshness test fmt lint typecheck flow projections api-test web-build

init:
	@echo "Installing local development tools..."
	@command -v pnpm >/dev/null 2>&1 || npm install -g pnpm
	@cd app-api && python -m venv .venv && .venv/bin/pip install -r requirements.txt
	@pre-commit install

up:
	docker compose up -d

down:
	docker compose down -v

logs:
	docker compose logs -f

api:
	docker compose exec app-api uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

web:
	docker compose exec app-web pnpm dev

dbt-debug:
	docker compose run --rm -e POSTGRES_HOST=postgres -e POSTGRES_PORT=5432 -e POSTGRES_DB=fantasy -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres dwh dbt debug

dbt-seed:
	docker compose run --rm -e POSTGRES_HOST=postgres -e POSTGRES_PORT=5432 -e POSTGRES_DB=fantasy -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres dwh dbt seed

dbt-build:
	docker compose run --rm -e POSTGRES_HOST=postgres -e POSTGRES_PORT=5432 -e POSTGRES_DB=fantasy -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres dwh dbt deps
	docker compose run --rm -e POSTGRES_HOST=postgres -e POSTGRES_PORT=5432 -e POSTGRES_DB=fantasy -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres dwh dbt build

dbt-docs:
	docker compose run --rm -e POSTGRES_HOST=postgres -e POSTGRES_PORT=5432 -e POSTGRES_DB=fantasy -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres dwh dbt docs generate

dbt-freshness:
	docker compose run --rm -e POSTGRES_HOST=postgres -e POSTGRES_PORT=5432 -e POSTGRES_DB=fantasy -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres dwh dbt source freshness

projections:
	docker compose run --rm -e POSTGRES_HOST=postgres -e POSTGRES_PORT=5432 -e POSTGRES_DB=fantasy -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres dwh dbt seed
	docker compose run --rm -e POSTGRES_HOST=postgres -e POSTGRES_PORT=5432 -e POSTGRES_DB=fantasy -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres dwh dbt build --select +f_weekly_projection +f_ros_projection

test:
	docker compose exec app-api python -m pytest

api-test:
	docker compose exec app-api python -m pytest tests/ -v

web-build:
	docker compose exec app-web pnpm build

fmt:
	docker compose exec app-api ruff format .
	docker compose exec app-web pnpm format

lint:
	docker compose exec app-api ruff check .
	docker compose exec app-web pnpm lint

typecheck:
	docker compose exec app-api mypy .
	docker compose exec app-web pnpm type-check

flow:
	docker compose run --rm flows python flows/daily_refresh.py

ingest:
	docker compose run --rm \
		-e DATABASE_URL=postgresql+psycopg://postgres:postgres@postgres:5432/fantasy \
		-e MINIO_ENDPOINT=minio:9000 \
		-e MINIO_ACCESS_KEY=minioadmin \
		-e MINIO_SECRET_KEY=minioadmin \
		-e MINIO_BUCKET=bronze \
		flows python flows/daily_refresh.py $(if $(SEASON),--season=$(SEASON)) $(if $(WEEK),--week=$(WEEK))

backfill:
	docker compose run --rm \
		-e DATABASE_URL=postgresql+psycopg://postgres:postgres@postgres:5432/fantasy \
		-e MINIO_ENDPOINT=minio:9000 \
		-e MINIO_ACCESS_KEY=minioadmin \
		-e MINIO_SECRET_KEY=minioadmin \
		-e MINIO_BUCKET=bronze \
		flows python flows/backfill.py $(if $(SEASONS),$(SEASONS),2023,2024)

status:
	docker compose run --rm \
		-e DATABASE_URL=postgresql+psycopg://postgres:postgres@postgres:5432/fantasy \
		-e MINIO_ENDPOINT=minio:9000 \
		-e MINIO_ACCESS_KEY=minioadmin \
		-e MINIO_SECRET_KEY=minioadmin \
		-e MINIO_BUCKET=bronze \
		flows python flows/list_status.py
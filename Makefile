.PHONY: help install env up dev build start test test-watch coverage lint analyze docker-up docker-down

help:
	@echo "Common development commands:"
	@echo "  make install      Install dependencies using pnpm"
	@echo "  make env          Create or update your .env.local file"
	@echo "  make up           Start required backend services"
	@echo "  make dev          Start Next.js in development (ensure services are running)"
	@echo "  make build        Build production assets"
	@echo "  make start        Run production server (ensure services are running)"
	@echo "  make test         Run all tests"
	@echo "  make test-watch   Run tests in watch mode"
	@echo "  make coverage     Run tests with coverage"
	@echo "  make lint         Check lint, Prettier, and type errors"
	@echo "  make analyze      Run bundle analyzer"
	@echo "  make docker-up    Start all containers (using Docker Compose)"
	@echo "  make docker-down  Stop all containers (using Docker Compose)"

install:
	pnpm install

env:
	@if [ ! -f .env.local ]; then \
		echo "Creating .env.local template..."; \
		touch .env.local; \
		echo "# See docs/setup/getting-started.md for environment variable configuration" > .env.local; \
	fi

up:
	./scripts/start-services.sh

dev: up
	pnpm dev

build:
	pnpm build

start: up
	pnpm start

test:
	pnpm test

test-watch:
	pnpm test:watch

coverage:
	pnpm test:coverage

lint:
	pnpm check:all

analyze:
	pnpm analyze

docker-up:
	docker compose -f docker/docker-compose.yml up -d

docker-down:
	docker compose -f docker/docker-compose.yml down

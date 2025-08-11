# Makefile for MySetlist pnpm monorepo
.PHONY: help lint format test build dev clean

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

lint: ## Run linting (optionally for specific file with FILE=path/to/file)
	@if [ -n "$(FILE)" ]; then \
		package=$$(echo $(FILE) | sed 's|/.*||'); \
		if [ -d "$$package" ]; then \
			echo "Linting package: $$package"; \
			pnpm --filter "./$$package" lint; \
		else \
			echo "Linting all packages"; \
			pnpm lint; \
		fi; \
	else \
		pnpm lint; \
	fi

format: ## Format code (optionally for specific file with FILE=path/to/file)
	@if [ -n "$(FILE)" ]; then \
		package=$$(echo $(FILE) | sed 's|/.*||'); \
		if [ -d "$$package" ]; then \
			echo "Formatting package: $$package"; \
			pnpm --filter "./$$package" format; \
		else \
			echo "Formatting all packages"; \
			pnpm format; \
		fi; \
	else \
		pnpm format; \
	fi

test: ## Run tests (optionally for specific file with FILE=path/to/file)
	@if [ -n "$(FILE)" ]; then \
		package=$$(echo $(FILE) | sed 's|/.*||'); \
		if [ -d "$$package" ]; then \
			echo "Testing package: $$package"; \
			pnpm --filter "./$$package" test; \
		else \
			echo "Running all tests"; \
			pnpm test; \
		fi; \
	else \
		pnpm test; \
	fi

build: ## Build all packages
	pnpm build

dev: ## Start development server
	pnpm dev

clean: ## Clean build artifacts
	rm -rf apps/*/dist apps/*/.next packages/*/dist
	pnpm clean

check: lint test ## Run lint and test

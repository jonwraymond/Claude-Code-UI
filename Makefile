# Makefile for Claude Code UI

.PHONY: help install test test-python test-vscode test-integration lint format clean coverage server

help:
	@echo "Available commands:"
	@echo "  make install         - Install all dependencies"
	@echo "  make test           - Run all tests"
	@echo "  make test-python    - Run Python tests only"
	@echo "  make test-vscode    - Run VS Code extension tests only"
	@echo "  make test-integration - Run integration tests"
	@echo "  make lint           - Run linters"
	@echo "  make format         - Format code"
	@echo "  make coverage       - Generate coverage report"
	@echo "  make server         - Start the Claude Code server"
	@echo "  make clean          - Clean up generated files"

install:
	pip install -r requirements.txt
	pip install -r requirements-test.txt
	cd vscode-extension && npm install

test: test-python test-vscode test-integration

test-python:
	pytest tests/unit -v
	@echo "Python unit tests completed"

test-vscode:
	cd vscode-extension && npm test
	@echo "VS Code extension tests completed"

test-integration:
	@echo "Starting server for integration tests..."
	python src/claude_code_server.py &
	@sleep 3
	pytest tests/integration -v
	python test_quick.py
	python test_mcp.py
	@pkill -f claude_code_server.py || true
	@echo "Integration tests completed"

lint:
	flake8 src tests --max-line-length=100 --extend-ignore=E203
	black --check src tests
	isort --check-only src tests
	mypy src --ignore-missing-imports
	cd vscode-extension && npm run lint

format:
	black src tests
	isort src tests

coverage:
	pytest --cov=src --cov-report=html --cov-report=term-missing
	@echo "Coverage report generated in htmlcov/"

server:
	python src/claude_code_server.py

clean:
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage
	rm -rf .mypy_cache
	rm -rf **/__pycache__
	rm -rf vscode-extension/out
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
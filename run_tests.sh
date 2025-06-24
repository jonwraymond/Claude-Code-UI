#!/bin/bash
# Comprehensive test runner for Claude Code UI

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Claude Code UI Test Runner${NC}"
echo "============================"

# Check if running in CI or local
if [ "$CI" = "true" ]; then
    echo "Running in CI environment"
else
    echo "Running locally"
fi

# Function to run tests with nice output
run_test_suite() {
    local suite_name=$1
    local command=$2
    
    echo -e "\n${YELLOW}Running $suite_name...${NC}"
    if eval "$command"; then
        echo -e "${GREEN}✓ $suite_name passed${NC}"
        return 0
    else
        echo -e "${RED}✗ $suite_name failed${NC}"
        return 1
    fi
}

# Track failures
FAILED=0

# Python linting
run_test_suite "Python Linting" "flake8 src tests --max-line-length=100 --extend-ignore=E203 --count --statistics" || ((FAILED++))

# Python formatting check
run_test_suite "Python Formatting" "black --check src tests" || ((FAILED++))

# Python import sorting
run_test_suite "Python Import Sorting" "isort --check-only src tests" || ((FAILED++))

# Python type checking
run_test_suite "Python Type Checking" "mypy src --ignore-missing-imports" || ((FAILED++))

# Python unit tests
run_test_suite "Python Unit Tests" "pytest tests/unit -v" || ((FAILED++))

# VS Code extension linting
run_test_suite "VS Code Extension Linting" "cd vscode-extension && npm run lint" || ((FAILED++))

# VS Code extension compilation
run_test_suite "VS Code Extension Compilation" "cd vscode-extension && npm run compile" || ((FAILED++))

# Start server for integration tests
echo -e "\n${YELLOW}Starting server for integration tests...${NC}"
python src/claude_code_server.py &
SERVER_PID=$!
sleep 3

# Integration tests
run_test_suite "Python Integration Tests" "pytest tests/integration -v" || ((FAILED++))
run_test_suite "Quick Test" "python test_quick.py" || ((FAILED++))
run_test_suite "MCP Test" "python test_mcp.py" || ((FAILED++))

# Stop server
echo -e "\n${YELLOW}Stopping server...${NC}"
kill $SERVER_PID 2>/dev/null || true

# Summary
echo -e "\n${YELLOW}Test Summary${NC}"
echo "============"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    
    # Generate coverage report if all tests pass
    echo -e "\n${YELLOW}Generating coverage report...${NC}"
    pytest --cov=src --cov-report=html --cov-report=term-missing --quiet
    echo -e "${GREEN}Coverage report available in htmlcov/${NC}"
    
    exit 0
else
    echo -e "${RED}$FAILED test suite(s) failed 😞${NC}"
    exit 1
fi
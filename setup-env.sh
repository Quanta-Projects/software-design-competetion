#!/bin/bash

# Transformer Management System - Environment Setup Script
# This script helps manage different environment configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required files exist
check_files() {
    local env_type=$1
    local env_file=""
    
    case $env_type in
        "dev")
            env_file="./Back-end/software-design-project-final/.env"
            ;;
        "docker")
            env_file="./.env"
            ;;
        "prod")
            env_file="./Back-end/software-design-project-final/.env.production"
            ;;
    esac
    
    if [[ ! -f "$env_file" ]]; then
        print_error "Environment file $env_file not found!"
        exit 1
    fi
    
    if [[ ! -f "docker-compose.yml" ]]; then
        print_error "docker-compose.yml not found!"
        exit 1
    fi
}

# Function to setup development environment
setup_dev() {
    print_status "Setting up Development Environment..."
    check_files "dev"
    
    # Copy development .env to backend directory if not exists
    if [[ ! -f "./Back-end/software-design-project-final/.env" ]]; then
        print_warning "Development .env file not found. Please create it manually."
        exit 1
    fi
    
    print_success "Development environment is ready!"
    print_status "To run development environment:"
    echo "  cd Back-end/software-design-project-final"
    echo "  ./mvnw spring-boot:run"
}

# Function to setup Docker environment
setup_docker() {
    print_status "Setting up Docker Environment..."
    check_files "docker"
    
    # Ensure Docker .env exists in root
    if [[ ! -f "./.env" ]]; then
        print_error "Docker .env file not found in root directory!"
        exit 1
    fi
    
    # Build and start containers
    print_status "Building and starting Docker containers..."
    docker-compose up --build -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check if services are healthy
    print_status "Checking service health..."
    docker-compose ps
    
    print_success "Docker environment is ready!"
    print_status "Services are available at:"
    echo "  Backend API: http://localhost:8080"
    echo "  Health Check: http://localhost:8080/actuator/health"
    echo "  API Documentation: http://localhost:8080/swagger-ui.html"
}

# Function to setup Production environment
setup_prod() {
    print_status "Setting up Production Environment..."
    check_files "prod"
    
    # Check if production .env file has been customized
    if grep -q "CHANGE_ME" "./Back-end/software-design-project-final/.env.production"; then
        print_error "Production .env file contains default passwords!"
        print_error "Please update all 'CHANGE_ME' values in .env.production before deploying to production."
        exit 1
    fi
    
    # Use production docker-compose
    if [[ ! -f "docker-compose.prod.yml" ]]; then
        print_error "docker-compose.prod.yml not found!"
        exit 1
    fi
    
    # Copy production env to root for docker-compose
    cp "./Back-end/software-design-project-final/.env.production" "./.env"
    
    print_status "Building and starting Production containers..."
    docker-compose -f docker-compose.prod.yml up --build -d
    
    print_success "Production environment is ready!"
    print_status "Production services are available at:"
    echo "  Backend API: http://localhost:8080"
    echo "  Health Check: http://localhost:8080/actuator/health"
}

# Function to stop all environments
stop_all() {
    print_status "Stopping all Docker containers..."
    
    if [[ -f "docker-compose.yml" ]]; then
        docker-compose down
    fi
    
    if [[ -f "docker-compose.prod.yml" ]]; then
        docker-compose -f docker-compose.prod.yml down
    fi
    
    print_success "All containers stopped!"
}

# Function to show status
show_status() {
    print_status "Current Docker containers status:"
    docker-compose ps 2>/dev/null || echo "No development containers running"
    
    print_status "Current Production containers status:"
    docker-compose -f docker-compose.prod.yml ps 2>/dev/null || echo "No production containers running"
}

# Function to show logs
show_logs() {
    local service=$1
    if [[ -z "$service" ]]; then
        print_status "Showing all container logs..."
        docker-compose logs --tail=50 -f
    else
        print_status "Showing logs for service: $service"
        docker-compose logs --tail=50 -f "$service"
    fi
}

# Main script logic
case "${1:-}" in
    "dev"|"development")
        setup_dev
        ;;
    "docker"|"local")
        setup_docker
        ;;
    "prod"|"production")
        setup_prod
        ;;
    "stop")
        stop_all
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "${2:-}"
        ;;
    *)
        echo "Transformer Management System - Environment Setup"
        echo ""
        echo "Usage: $0 {dev|docker|prod|stop|status|logs}"
        echo ""
        echo "Commands:"
        echo "  dev        - Setup development environment (local Spring Boot)"
        echo "  docker     - Setup Docker environment (containers)"
        echo "  prod       - Setup production environment (production containers)"
        echo "  stop       - Stop all Docker containers"
        echo "  status     - Show status of all environments"
        echo "  logs       - Show logs (optionally specify service name)"
        echo ""
        echo "Examples:"
        echo "  $0 docker          # Start Docker development environment"
        echo "  $0 prod           # Start production environment"
        echo "  $0 logs backend   # Show backend service logs"
        echo "  $0 stop           # Stop all containers"
        exit 1
        ;;
esac

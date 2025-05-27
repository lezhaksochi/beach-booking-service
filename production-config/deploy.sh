#!/bin/bash

echo "🏖️ Beach Booking Service - Production Deployment Script"
echo "======================================================="

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

print_status "Starting deployment process..."

# Step 1: Update system packages
print_status "Updating system packages..."
if command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get upgrade -y
elif command -v yum &> /dev/null; then
    sudo yum update -y
fi

# Step 2: Install Node.js if not present
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    print_success "Node.js is already installed: $(node --version)"
fi

# Step 3: Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
else
    print_success "PM2 is already installed: $(pm2 --version)"
fi

# Step 4: Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    print_status "Installing PostgreSQL..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y postgresql postgresql-contrib
    elif command -v yum &> /dev/null; then
        sudo yum install -y postgresql-server postgresql-contrib
        sudo postgresql-setup initdb
    fi
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
else
    print_success "PostgreSQL is already installed"
fi

# Step 5: Install dependencies
print_status "Installing project dependencies..."
cd backend && npm install --production
cd ../frontend && npm install --production
cd ..

# Step 6: Build frontend
print_status "Building frontend for production..."
cd frontend && npm run build
cd ..

# Step 7: Setup environment files
print_status "Setting up environment files..."
if [ ! -f "backend/.env" ]; then
    cp production-config/backend/.env.production backend/.env
    print_warning "Please edit backend/.env with your production values"
fi

if [ ! -f "frontend/.env.local" ]; then
    cp production-config/frontend/.env.production frontend/.env.local
    print_warning "Please edit frontend/.env.local with your production values"
fi

# Step 8: Create logs directory
print_status "Creating logs directory..."
mkdir -p logs

# Step 9: Setup database (if needed)
print_status "Setting up database..."
print_warning "Please run the following commands manually to setup the database:"
echo "sudo -u postgres createuser beach_booking_user"
echo "sudo -u postgres createdb beach_booking"
echo "sudo -u postgres psql -c \"ALTER USER beach_booking_user PASSWORD 'your_password';\""
echo "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE beach_booking TO beach_booking_user;\""
echo "npm run db:migrate"

# Step 10: Start services with PM2
print_status "Starting services with PM2..."
cp production-config/ecosystem.config.js .
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_success "Deployment completed!"
print_status "Next steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Install SSL certificate (Let's Encrypt recommended)"
echo "3. Configure Nginx with the provided config file"
echo "4. Update environment files with your domain and database credentials"
echo "5. Run database migrations"
echo "6. Create admin user: cd backend && node src/scripts/createAdmin.js"

echo ""
print_success "Your Beach Booking Service should now be running!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:3001"
echo "Check PM2 status: pm2 status"
echo "View logs: pm2 logs"
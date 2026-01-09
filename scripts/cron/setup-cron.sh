#!/bin/bash
# Setup script for Raff trending calculation cron job
# Run this script to automatically configure trending score calculation

set -e

echo "🚀 Raff Trending Score Cron Setup"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

echo "📁 Project root: $PROJECT_ROOT"
echo ""

# Check if we're on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${YELLOW}⚠️  This script is designed for Linux systems${NC}"
    echo "For macOS, use crontab manually (see instructions below)"
    echo "For Windows, use Task Scheduler or deploy to a Linux server"
    exit 1
fi

# Check if systemd is available
if ! command -v systemctl &> /dev/null; then
    echo -e "${RED}❌ systemd not found${NC}"
    echo "Falling back to crontab setup..."
    echo ""

    # Crontab setup
    echo "Setting up crontab..."
    CRON_LINE="0 */3 * * * cd $PROJECT_ROOT && npm run calculate:trending >> /var/log/raff-trending.log 2>&1"

    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "calculate:trending"; then
        echo -e "${YELLOW}⚠️  Cron job already exists${NC}"
        echo "Current crontab:"
        crontab -l | grep "calculate:trending"
    else
        # Add to crontab
        (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
        echo -e "${GREEN}✅ Cron job added successfully${NC}"
        echo "Schedule: Every 3 hours"
        echo "Command: $CRON_LINE"
    fi

    echo ""
    echo "To view your crontab: crontab -l"
    echo "To edit your crontab: crontab -e"
    echo "To remove the job: crontab -e (then delete the line)"

    exit 0
fi

# Systemd setup
echo "Setting up systemd timer..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
    echo "Example: sudo bash scripts/cron/setup-cron.sh"
    exit 1
fi

# Get the user who should run the service
if [ -n "$SUDO_USER" ]; then
    SERVICE_USER="$SUDO_USER"
else
    read -p "Enter the username to run the service as: " SERVICE_USER
fi

# Get project path
read -p "Enter full path to Raff project [$PROJECT_ROOT]: " CUSTOM_PATH
PROJECT_PATH="${CUSTOM_PATH:-$PROJECT_ROOT}"

# Get database URL
read -p "Enter DATABASE_URL (press Enter to use .env file): " DB_URL

echo ""
echo "Configuration:"
echo "  User: $SERVICE_USER"
echo "  Project Path: $PROJECT_PATH"
echo "  Database URL: ${DB_URL:-"from .env file"}"
echo ""
read -p "Is this correct? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled"
    exit 1
fi

# Create log directory
mkdir -p /var/log/raff
chown $SERVICE_USER:$SERVICE_USER /var/log/raff

# Update service file with actual paths
sed "s|User=raff|User=$SERVICE_USER|g" "$SCRIPT_DIR/raff-trending.service" | \
sed "s|Group=raff|Group=$SERVICE_USER|g" | \
sed "s|WorkingDirectory=/path/to/raff|WorkingDirectory=$PROJECT_PATH|g" | \
sed "s|ReadWritePaths=/path/to/raff|ReadWritePaths=$PROJECT_PATH|g" > /tmp/raff-trending.service

# Add DATABASE_URL if provided
if [ -n "$DB_URL" ]; then
    sed -i "s|Environment=\"DATABASE_URL=.*\"|Environment=\"DATABASE_URL=$DB_URL\"|g" /tmp/raff-trending.service
else
    # Remove DATABASE_URL line to use .env
    sed -i '/Environment="DATABASE_URL=/d' /tmp/raff-trending.service
fi

# Install service files
cp /tmp/raff-trending.service /etc/systemd/system/
cp "$SCRIPT_DIR/raff-trending.timer" /etc/systemd/system/
rm /tmp/raff-trending.service

# Reload systemd
systemctl daemon-reload

# Enable and start timer
systemctl enable raff-trending.timer
systemctl start raff-trending.timer

echo ""
echo -e "${GREEN}✅ Systemd timer installed and started successfully${NC}"
echo ""
echo "Schedule: Every 3 hours (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00)"
echo ""
echo "Useful commands:"
echo "  Check status:        sudo systemctl status raff-trending.timer"
echo "  View next runs:      sudo systemctl list-timers raff-trending.timer"
echo "  View logs:           sudo journalctl -u raff-trending.service -f"
echo "  Manual run:          sudo systemctl start raff-trending.service"
echo "  Stop timer:          sudo systemctl stop raff-trending.timer"
echo "  Disable timer:       sudo systemctl disable raff-trending.timer"
echo ""
echo "Log files:"
echo "  Output:  /var/log/raff/trending.log"
echo "  Errors:  /var/log/raff/trending-error.log"
echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo "The trending calculation will run automatically every 3 hours."

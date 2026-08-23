#!/bin/bash
# SSL Certificate Setup with Let's Encrypt for DuckDNS
# Run on VPS after Docker containers are running

set -e

echo "🔐 Setting up SSL certificates with Let's Encrypt..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment
if [ ! -f .env.prod ]; then
    echo -e "${RED}❌ .env.prod not found!${NC}"
    exit 1
fi

export $(cat .env.prod | grep -v '^#' | xargs)

DOMAIN="${WEB_AUTHN_RP_ID:-sasyashri.duckdns.org}"
EMAIL="${SSL_EMAIL:-admin@${DOMAIN}}"

echo -e "${BLUE}Domain: ${DOMAIN}${NC}"
echo -e "${BLUE}Email: ${EMAIL}${NC}"

# Create SSL directory structure
mkdir -p infra/nginx/ssl/live/${DOMAIN}
mkdir -p /var/www/certbot

# Stop nginx if running
docker compose -f infra/docker/docker-compose.prod.yml stop nginx 2>/dev/null || true

# Create temporary nginx config for ACME challenge only
cat > /tmp/nginx-acme.conf <<EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        listen [::]:80;
        server_name ${DOMAIN};

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
            allow all;
        }

        location / {
            return 301 https://\$host\$request_uri;
        }
    }
}
EOF

# Start temporary nginx for ACME challenge
docker run -d --name nginx-acme \
    -p 80:80 \
    -v /tmp/nginx-acme.conf:/etc/nginx/nginx.conf:ro \
    -v /var/www/certbot:/var/www/certbot:ro \
    nginx:alpine

# Wait for nginx to start
sleep 3

# Request certificate
echo -e "\n${BLUE}Requesting Let's Encrypt certificate...${NC}"
docker run --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/www/certbot:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d ${DOMAIN}

# Stop temporary nginx
docker stop nginx-acme
docker rm nginx-acme

# Copy certificates to nginx ssl directory
echo -e "\n${BLUE}Copying certificates...${NC}"
cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem infra/nginx/ssl/live/${DOMAIN}/
cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem infra/nginx/ssl/live/${DOMAIN}/
cp /etc/letsencrypt/live/${DOMAIN}/chain.pem infra/nginx/ssl/live/${DOMAIN}/

# Set permissions
chmod 644 infra/nginx/ssl/live/${DOMAIN}/fullchain.pem
chmod 644 infra/nginx/ssl/live/${DOMAIN}/chain.pem
chmod 600 infra/nginx/ssl/live/${DOMAIN}/privkey.pem

# Create auto-renewal cron job
cat > /etc/cron.d/certbot-renew <<EOF
# Renew Let's Encrypt certificates twice daily
0 */12 * * * root docker run --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/www/certbot:/var/www/certbot \
    certbot/certbot renew --quiet \
    --deploy-hook "cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem /opt/sasyashri/infra/nginx/ssl/live/${DOMAIN}/ && cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem /opt/sasyashri/infra/nginx/ssl/live/${DOMAIN}/ && cp /etc/letsencrypt/live/${DOMAIN}/chain.pem /opt/sasyashri/infra/nginx/ssl/live/${DOMAIN}/ && docker compose -f /opt/sasyashri/infra/docker/docker-compose.prod.yml exec nginx nginx -s reload"
EOF

# Restart nginx with production config
echo -e "\n${BLUE}Starting production nginx...${NC}"
docker compose -f infra/docker/docker-compose.prod.yml up -d nginx

# Test SSL
echo -e "\n${BLUE}Testing SSL...${NC}"
sleep 5
if curl -sf "https://${DOMAIN}/health" > /dev/null; then
    echo -e "${GREEN}✅ SSL certificate installed and working!${NC}"
else
    echo -e "${YELLOW}⚠️  SSL test failed. Check nginx logs.${NC}"
fi

# Show certificate info
echo -e "\n${BLUE}Certificate info:${NC}"
openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/fullchain.pem -text -noout | grep -E "Subject:|Issuer:|Not Before:|Not After :"

echo -e "\n${GREEN}✅ SSL setup complete!${NC}"
echo -e "Certificate expires: $(openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/fullchain.pem -noout -enddate | cut -d= -f2)"
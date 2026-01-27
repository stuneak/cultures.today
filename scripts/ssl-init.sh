#!/bin/sh
set -e

# UPDATE THESE VALUES FOR YOUR DOMAIN
DOMAIN="cultures.today"
EMAIL="stuneak@gmail.com"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

# Check if certificates already exist and are valid
if [ -d "$CERT_PATH" ] && [ -f "$CERT_PATH/fullchain.pem" ] && [ -f "$CERT_PATH/privkey.pem" ]; then
    echo "SSL certificates already exist for $DOMAIN"
    echo "Checking certificate validity..."

    # Check if cert is valid and not expiring within 30 days
    if openssl x509 -checkend 2592000 -noout -in "$CERT_PATH/fullchain.pem" 2>/dev/null; then
        echo "Certificate is valid and not expiring within 30 days"
        exit 0
    else
        echo "Certificate is expiring soon or invalid, will attempt renewal"
    fi
fi

echo "Obtaining SSL certificate for $DOMAIN..."

# Create webroot directory
mkdir -p /var/www/certbot

# Use standalone mode for initial certificate acquisition
certbot certonly \
    --standalone \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --domains "$DOMAIN" \
    --domains "www.$DOMAIN" \
    --preferred-challenges http

# Configure renewal to use webroot mode
RENEWAL_CONF="/etc/letsencrypt/renewal/$DOMAIN.conf"
if [ -f "$RENEWAL_CONF" ]; then
    sed -i 's/authenticator = standalone/authenticator = webroot/' "$RENEWAL_CONF"
    if ! grep -q "webroot_path" "$RENEWAL_CONF"; then
        echo "webroot_path = /var/www/certbot," >> "$RENEWAL_CONF"
    fi
    if ! grep -q "renew_before_expiry" "$RENEWAL_CONF"; then
        echo "renew_before_expiry = 60 days" >> "$RENEWAL_CONF"
    fi
fi

echo "SSL certificate obtained successfully!"
echo "Certificate path: $CERT_PATH"
echo "Renewal configured for 60 days before expiry"

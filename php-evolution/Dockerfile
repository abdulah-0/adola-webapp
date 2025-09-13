# Simple PHP 8.2 + Apache image for Render
FROM php:8.2-apache

# No extra extensions required for openssl (included by default)
# Enable Apache mods if needed
RUN a2enmod rewrite

# Copy app
COPY . /var/www/html/

# Permissions (Render runs as root by default in Docker services)
EXPOSE 80

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost/ || exit 1


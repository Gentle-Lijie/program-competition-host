FROM php:8.1-fpm-alpine

# Install dependencies
RUN apk add --no-cache nginx supervisor bash shadow tzdata libzip-dev oniguruma-dev autoconf gcc musl-dev make g++
RUN docker-php-ext-install pdo_mysql mbstring

WORKDIR /var/www/html

COPY . /var/www/html

RUN chown -R www-data:www-data /var/www/html || true

EXPOSE 9000

CMD ["php-fpm"]

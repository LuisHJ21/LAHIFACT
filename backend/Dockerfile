FROM php:8.5-cli-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends git unzip libpq-dev libzip-dev libxml2-dev libicu-dev libsqlite3-dev \
    && docker-php-ext-install pdo_pgsql pdo_sqlite bcmath soap zip intl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
WORKDIR /app
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000", "--no-reload"]

FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install dbt
RUN pip install --no-cache-dir \
    "dbt-core>=1.8.0,<2.0.0" \
    "dbt-postgres>=1.8.0,<2.0.0"

# Copy dbt project
COPY . .

# Create non-root user
RUN useradd -m -u 1000 dbtuser && chown -R dbtuser:dbtuser /app
USER dbtuser

# Set DBT profiles directory
ENV DBT_PROFILES_DIR=/app

# Default command
CMD ["dbt", "debug"]
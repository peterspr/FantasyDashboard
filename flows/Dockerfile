FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 flowuser && chown -R flowuser:flowuser /app
USER flowuser

# Default command
CMD ["python", "flows/daily_refresh.py"]
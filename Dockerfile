FROM node:20-bookworm-slim

# Install Python, pip, venv, and essential compilation tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create Python virtual environment and install dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY python/predict_service/requirements.txt ./python/predict_service/requirements.txt
RUN pip install --no-cache-dir -r python/predict_service/requirements.txt

# Install pnpm globally and install Node.js dependencies
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Build the Next.js application
RUN pnpm build

# Ensure start script is executable
RUN chmod +x start.sh

# Expose Next.js port and Python prediction service port
EXPOSE 4000
EXPOSE 4001

# Run the startup script
CMD ["./start.sh"]

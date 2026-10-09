FROM python:3.12-slim

WORKDIR /app
COPY api_bundle.b64 /tmp/api_bundle.b64

RUN python - <<'PY'
import base64
from pathlib import Path
Path('/tmp/api.tar.gz').write_bytes(base64.b64decode(Path('/tmp/api_bundle.b64').read_text().strip()))
PY
RUN tar -xzf /tmp/api.tar.gz -C /app \
    && pip install --no-cache-dir -r /app/requirements.txt \
    && rm -f /tmp/api.tar.gz /tmp/api_bundle.b64

EXPOSE 8000
CMD ["sh","-lc","uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

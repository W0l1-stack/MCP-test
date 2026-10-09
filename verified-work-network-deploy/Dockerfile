FROM python:3.12-slim

WORKDIR /app
COPY parts-v2 /tmp/parts

RUN cat /tmp/parts/part-*.txt > /tmp/api_bundle.b64 \
    && python - <<'PY'
import base64
from pathlib import Path
src = Path('/tmp/api_bundle.b64').read_text().strip()
Path('/tmp/api.tar.gz').write_bytes(base64.b64decode(src, validate=True))
PY
RUN tar -xzf /tmp/api.tar.gz -C /app \
    && pip install --no-cache-dir -r /app/requirements.txt \
    && rm -rf /tmp/api.tar.gz /tmp/api_bundle.b64 /tmp/parts

EXPOSE 8000
CMD ["sh","-lc","uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

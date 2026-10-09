FROM python:3.12-slim
WORKDIR /app
COPY parts /tmp/parts
RUN cat /tmp/parts/part-* > /tmp/bundle.b64 \
 && python - <<'PY'
import base64
from pathlib import Path
src = Path('/tmp/bundle.b64').read_text().strip()
Path('/tmp/bundle.tar.gz').write_bytes(base64.b64decode(src, validate=True))
PY
RUN tar -xzf /tmp/bundle.tar.gz -C /app \
 && pip install --no-cache-dir -r /app/requirements.txt pytest \
 && pytest -q /app/tests \
 && rm -rf /tmp/bundle.b64 /tmp/bundle.tar.gz /tmp/parts /app/.pytest_cache
EXPOSE 8000
CMD ["sh","-lc","uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

# syntax=docker/dockerfile:1
FROM python:3.12-slim
WORKDIR /app/apps/api
COPY apps/api/requirements.txt ./requirements.txt
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -f /run/secrets/proxy_ca ]; then export PIP_CERT=/run/secrets/proxy_ca; fi; \
    python -m pip install --no-cache-dir -r requirements.txt
COPY apps/api/app ./app
COPY services/worker /app/services/worker
COPY tools/migrate.py /app/tools/migrate.py
COPY database/migrations /app/database/migrations
COPY contracts/runtime-openapi.yaml /app/contracts/runtime-openapi.yaml
EXPOSE 5000
CMD ["gunicorn","-b","0.0.0.0:5000","app:create_app()","--workers","2","--timeout","60","--access-logfile","-"]

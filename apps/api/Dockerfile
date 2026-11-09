FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
# Use shell form so $PORT env can be interpolated in some PaaS
CMD ["gunicorn","-b","0.0.0.0:5000","app:create_app()","--workers","2","--timeout","60","--access-logfile","-"]

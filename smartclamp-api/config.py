import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
    AFRICASTALKING_API_KEY = os.getenv("AFRICASTALKING_API_KEY", "")
    DEVICE_HMAC_ENCRYPTION_KEY = os.getenv("DEVICE_HMAC_ENCRYPTION_KEY", "")

    SECRET_KEY = os.getenv("SECRET_KEY", "smartclamp-backend-secret-key")

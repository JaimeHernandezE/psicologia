"""
Configuración para entorno de desarrollo.
"""
from .base import *

DEBUG = True

# CORS: aceptar localhost:3000 en desarrollo
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

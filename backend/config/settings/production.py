"""
Configuración para entorno de producción.
Variables sensibles y ALLOWED_HOSTS deben venir de .env
"""
from .base import *

DEBUG = False

# CORS en producción: definir CORS_ALLOWED_ORIGINS en .env

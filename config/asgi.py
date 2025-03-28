"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import django

# Set Django settings module before any other Django imports
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()  # This ensures settings are fully loaded

# Now import Django-related modules after settings are configured
from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter

# Import routing patterns only after Django is fully configured
from rooms.routing import websocket_urlpatterns

# Create the ASGI application
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns  # Include WebSocket routes
        )
    ),
})

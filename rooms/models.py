from django.db import models
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string


class Room(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    creator = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='created_rooms')
    created_at = models.DateTimeField(auto_now_add=True)
    is_private = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        # Generate a slug if one isn't provided
        if not self.slug:
            self.slug = get_random_string(8).lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    def is_creator(self, user):
        return self.creator == user

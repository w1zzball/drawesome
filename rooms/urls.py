from django.urls import path
from . import views

app_name = 'rooms'

urlpatterns = [
    path('', views.room_list, name='room_list'),
    path('create/', views.create_room, name='create_room'),
    path('<str:room_slug>/', views.game, name='room'),
    path('delete/<slug:room_slug>/', views.delete_room, name='delete_room'),
]

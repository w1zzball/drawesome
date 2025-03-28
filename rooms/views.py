from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Room
from .forms import RoomForm


def game(request, room_slug=None):
    """
    Main game view - handles both default room and custom rooms
    """
    if room_slug:
        room = get_object_or_404(Room, slug=room_slug)
        context = {
            'room': room,
            'room_name': room.slug,
        }
    else:
        # Use default room
        context = {
            'room_name': 'lobby',
        }

    return render(request, 'game/game.html', context)


@login_required
def create_room(request):
    """
    View for creating a new room
    """
    if request.method == 'POST':
        form = RoomForm(request.POST)
        if form.is_valid():
            room = form.save(commit=False)
            room.creator = request.user
            room.save()
            messages.success(
                request, f'Room "{room.name}" created successfully!')
            return redirect('rooms:room', room_slug=room.slug)
    else:
        form = RoomForm()

    return render(request, 'rooms/create_room.html', {'form': form})


def room_list(request):
    """
    View for displaying all public rooms
    """
    rooms = Room.objects.filter(is_private=False).order_by('-created_at')
    return render(request, 'rooms/room_list.html', {'rooms': rooms})

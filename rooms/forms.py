from django import forms
from .models import Room


class RoomForm(forms.ModelForm):
    class Meta:
        model = Room
        fields = ['name', 'is_private']
        widgets = {
            'name': forms.TextInput(attrs={'placeholder': 'Room Name', 'class': 'form-control'}),
        }

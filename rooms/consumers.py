import json
import base64
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'room_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        print(f"WebSocket connected to room: {self.room_name}")

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f"WebSocket disconnected from room: {self.room_name}")

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'room_message',
                'data': data
            }
        )

    # Receive message from room group
    async def room_message(self, event):
        data = event['data']

        # Send message to WebSocket
        await self.send(text_data=json.dumps(data))


class DrawingConsumer(AsyncWebsocketConsumer):
    # Class variable to store canvas states for all rooms
    canvas_states = {}

    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'drawing_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Debug message
        print(
            f"WebSocket connected: {self.channel_name} joined {self.room_group_name}")

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(
            f"WebSocket disconnected: {self.channel_name} left {self.room_group_name}")

    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            data_type = data.get('type', '')
            room_code = data.get('roomCode', '')

            # Handle canvas state saving
            if data_type == 'canvas_save' and 'image_data' in data:
                # print(
                #     f"Saving canvas state for room: {room_code} (data length: {len(data['image_data'])}, type: {type(data['image_data'])})")
                # Store the canvas state
                DrawingConsumer.canvas_states[room_code] = data['image_data']
                # print(
                #     f"Canvas state saved. Current states: {list(DrawingConsumer.canvas_states.keys())}")

            # Handle canvas state requests
            elif data_type == 'request_canvas_state':
                # print(f"Canvas state requested for room: {room_code}")
                # If we have a state for this room, send it directly to the requester
                if room_code in DrawingConsumer.canvas_states:
                    # print(
                    #     f"Sending stored canvas state for room: {room_code} (data length: {len(DrawingConsumer.canvas_states[room_code])})")
                    await self.send(text_data=json.dumps({
                        'type': 'canvas_state',
                        'image_data': DrawingConsumer.canvas_states[room_code]
                    }))
                else:
                    print(
                        f"No canvas state found for room: {room_code}. Available rooms: {list(DrawingConsumer.canvas_states.keys())}")

            # For other messages, broadcast to the room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'drawing_message',
                    'data': data
                }
            )

        except json.JSONDecodeError as e:
            print(f"Invalid JSON: {str(e)}")
        except Exception as e:
            print(f"Error in receive: {str(e)}")

    # Receive message from room group
    async def drawing_message(self, event):
        data = event['data']

        # Send message to WebSocket
        await self.send(text_data=json.dumps(data))

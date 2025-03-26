from channels.generic.websocket import AsyncWebsocketConsumer
import json


class DrawingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'drawing_{self.room_name}'

        # Join the room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave the room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            # Receive drawing data from WebSocket
            text_data_json = json.loads(text_data)
            x = text_data_json.get('x')
            y = text_data_json.get('y')
            action = text_data_json.get('action')

            # Validate the data
            if x is None or y is None or action is None:
                await self.send(text_data=json.dumps({
                    'error': 'Invalid data received'
                }))
                return

            # Send the drawing data to the room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'draw_data',
                    'x': x,
                    'y': y,
                    'action': action
                }
            )
        except json.JSONDecodeError:
            # Handle invalid JSON
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON format'
            }))

    async def draw_data(self, event):
        x = event['x']
        y = event['y']
        action = event['action']

        # Send drawing data to WebSocket
        await self.send(text_data=json.dumps({
            'x': x,
            'y': y,
            'action': action
        }))

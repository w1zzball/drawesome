import json
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync


class ChatConsumer(WebsocketConsumer):
    def connect(self):
        # This is the name of the group that the user will join
        self.room_group_name = 'test'
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name,
            self.channel_name
        )
        self.accept()

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name,
            self.channel_name
        )

    def receive(self, text_data):
        text_data_json = json.loads(text_data)

        # Identify the message type
        message_type = text_data_json.get('type', 'chat_message')
        client_id = text_data_json.get('clientId', 'anonymous')

        if message_type == 'chat_message':
            message = text_data_json['message']
            color = text_data_json.get('color', '#000000')
            async_to_sync(self.channel_layer.group_send)(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'clientId': client_id,
                    'color': color
                }
            )
        elif message_type == 'draw_line':
            async_to_sync(self.channel_layer.group_send)(
                self.room_group_name,
                {
                    'type': 'draw_line',
                    'clientId': client_id,
                    'from': text_data_json['from'],
                    'to': text_data_json['to'],
                    'color': text_data_json['color'],
                    'lineWidth': text_data_json['lineWidth']
                }
            )
        elif message_type == 'clear_canvas':
            async_to_sync(self.channel_layer.group_send)(
                self.room_group_name,
                {
                    'type': 'clear_canvas',
                    'clientId': client_id
                }
            )

    def chat_message(self, event):
        message = event['message']
        client_id = event.get('clientId', 'anonymous')
        color = event.get('color', '#000000')
        self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message,
            'clientId': client_id,
            'color': color
        }))

    def draw_line(self, event):
        self.send(text_data=json.dumps({
            'type': 'draw_line',
            'clientId': event['clientId'],
            'from': event['from'],
            'to': event['to'],
            'color': event['color'],
            'lineWidth': event['lineWidth']
        }))

    def clear_canvas(self, event):
        self.send(text_data=json.dumps({
            'type': 'clear_canvas',
            'clientId': event['clientId']
        }))

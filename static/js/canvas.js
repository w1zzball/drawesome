const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const socket = new WebSocket('ws://' + window.location.host + '/ws/drawing/room_name/');

canvas.addEventListener('mousedown', (e) => {
    socket.send(JSON.stringify({
        'x': e.clientX,
        'y': e.clientY,
        'action': 'draw'
    }));
});

socket.onmessage = function (e) {
    const data = JSON.parse(e.data);
    if (data.action === 'draw') {
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
    }
};
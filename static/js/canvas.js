const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const socket = new WebSocket('ws://' + window.location.host + '/ws/drawing/room_name/');

let isDrawing = false;

// Start drawing when the mouse is pressed
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);

    // Send the starting point to the server
    socket.send(JSON.stringify({
        'x': x,
        'y': y,
        'action': 'start'
    }));
});

// Draw as the mouse moves
canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();

    // Send the drawing coordinates to the server
    socket.send(JSON.stringify({
        'x': x,
        'y': y,
        'action': 'draw'
    }));
});

// Stop drawing when the mouse is released
canvas.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        ctx.closePath();

        // Notify the server that drawing has stopped
        socket.send(JSON.stringify({
            'action': 'end'
        }));
    }
});

// Stop drawing if the mouse leaves the canvas
canvas.addEventListener('mouseleave', () => {
    if (isDrawing) {
        isDrawing = false;
        ctx.closePath();

        // Notify the server that drawing has stopped
        socket.send(JSON.stringify({
            'action': 'end'
        }));
    }
});

// Handle incoming messages from the WebSocket
socket.onmessage = function (e) {
    const data = JSON.parse(e.data);
    const action = data.action;

    if (action === 'start') {
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
    } else if (action === 'draw') {
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
    } else if (action === 'end') {
        ctx.closePath();
    }
};
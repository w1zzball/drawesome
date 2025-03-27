const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

// Replace 'room_name' with the actual room name dynamically
const roomName = document.getElementById('room-name').value;
const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
const socket = new WebSocket(protocol + window.location.host + '/ws/game/' + roomName + '/');

let isDrawing = false;

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("drawingCanvas");
    const gameArea = document.getElementById("game-area");
  
    function resizeCanvas() {
        // Save the current canvas content
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
        // Get the new dimensions of the game area
        const gameAreaStyles = window.getComputedStyle(gameArea);
        const width = parseInt(gameAreaStyles.width, 10);
        const height = parseInt(gameAreaStyles.height, 10);
    
        // Resize the canvas
        canvas.width = width;
        canvas.height = height;
    
        // Restore the saved canvas content
        ctx.putImageData(imageData, 0, 0);
    }
  
    // Resize canvas on load
    resizeCanvas();
  
    // Resize canvas on window resize
    window.addEventListener("resize", resizeCanvas);
});

// Get properly scaled coordinates
function getScaledCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    // Calculate the scaling ratio
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Calculate scaled coordinates
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
}

// Start drawing when the mouse is pressed
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const { x, y } = getScaledCoordinates(e);

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

    const { x, y } = getScaledCoordinates(e);

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

// Add touch event listeners for drawing on touch devices
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling or other default touch actions
    isDrawing = true;

    const touch = e.touches[0];
    const { x, y } = getScaledCoordinates(touch);

    ctx.beginPath();
    ctx.moveTo(x, y);

    // Send the starting point to the server
    socket.send(JSON.stringify({
        'x': x,
        'y': y,
        'action': 'start'
    }));
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent scrolling or other default touch actions
    if (!isDrawing) return;

    const touch = e.touches[0];
    const { x, y } = getScaledCoordinates(touch);

    ctx.lineTo(x, y);
    ctx.stroke();

    // Send the drawing coordinates to the server
    socket.send(JSON.stringify({
        'x': x,
        'y': y,
        'action': 'draw'
    }));
});

canvas.addEventListener('touchend', () => {
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

// Handle WebSocket connection errors
socket.onerror = function (error) {
    console.error('WebSocket error:', error);
};

// Log WebSocket connection status
socket.onopen = function () {
    console.log('WebSocket connection established.');
};

socket.onclose = function () {
    console.log('WebSocket connection closed.');
};

// Handle canvas resizing
window.addEventListener('resize', () => {
    const newWidth = canvas.clientWidth;
    const newHeight = canvas.clientHeight;

    // Scale the canvas content
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx.putImageData(imageData, 0, 0);
});
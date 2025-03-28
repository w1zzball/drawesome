// Wait for DOM to fully load
document.addEventListener('DOMContentLoaded', () => {
    // Generate a unique client ID
    const clientId = 'user_' + Math.random().toString(36).substr(2, 9);
    const clientIdElement = document.getElementById('client-id');
    if (clientIdElement) {
        clientIdElement.textContent = `(ID: ${clientId})`;
    }

    // Get room code from hidden input
    const roomCodeElement = document.getElementById('room-name');
    const roomCode = roomCodeElement && roomCodeElement.value.trim() ? roomCodeElement.value.trim() : 'lobby'; // Default to 'lobby' if roomCode is missing or empty

    // WebSocket connection setup
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    // Change this to match your routing.py pattern - notice "drawing" not "room"
    const url = `${protocol}${window.location.host}/ws/drawing/${roomCode}/`;
    console.log('Connecting to WebSocket:', url);
    const socket = new WebSocket(url);

    // Canvas setup
    const canvas = document.getElementById('drawing-board');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    const ctx = canvas.getContext('2d');
    const clearButton = document.getElementById('clear-button');
    const colorPicker = document.getElementById('color-picker');
    const lineWidthInput = document.getElementById('line-width');
    const lineWidthValue = document.getElementById('line-width-value');
    const userColorIndicator = document.getElementById('user-color-indicator');

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // Assign a random color to new users
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Set a random initial color
    const initialColor = getRandomColor();
    if (colorPicker) colorPicker.value = initialColor;
    if (userColorIndicator) userColorIndicator.style.backgroundColor = initialColor;

    // Initialize canvas
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = initialColor;

    // Set canvas background to white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Client-side drawing settings store
    const clientSettings = new Map();

    // Update line width display
    if (lineWidthInput && lineWidthValue) {
        lineWidthInput.addEventListener('input', function () {
            const width = this.value;
            lineWidthValue.textContent = `${width}px`;
            ctx.lineWidth = width;
        });
    }

    // Update stroke color
    if (colorPicker && userColorIndicator) {
        colorPicker.addEventListener('input', function () {
            const newColor = this.value;
            ctx.strokeStyle = newColor;
            userColorIndicator.style.backgroundColor = newColor;
        });
    }

    // Clear canvas
    if (clearButton) {
        clearButton.addEventListener('click', function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            socket.send(
                JSON.stringify({
                    type: 'clear_canvas',
                    clientId: clientId,
                    roomCode: roomCode
                })
            );

            // Save the cleared canvas state
            saveCanvasState();
        });
    }

    /**
     * Fix for coordinate scaling problem:
     * - Canvas has a logical size (width/height attributes)
     * - Canvas has a display size (CSS dimensions)
     */
    function getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY
        };
    }

    // Drawing event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch support for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', stopDrawing);

    function handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }

    function handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }

    function startDrawing(e) {
        isDrawing = true;
        const pos = getMousePos(canvas, e);
        lastX = pos.x;
        lastY = pos.y;
    }

    function draw(e) {
        if (!isDrawing) return;

        const pos = getMousePos(canvas, e);
        const x = pos.x;
        const y = pos.y;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Send drawing data to other users
        socket.send(
            JSON.stringify({
                type: 'draw_line',
                clientId: clientId,
                roomCode: roomCode,
                from: { x: lastX, y: lastY },
                to: { x: x, y: y },
                color: ctx.strokeStyle,
                lineWidth: ctx.lineWidth
            })
        );

        lastX = x;
        lastY = y;
    }

    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            saveCanvasState(); // Save canvas state when drawing stops
        }
    }

    // Draw received line from other clients
    function drawReceivedLine(from, to, color, lineWidth) {
        // Save current context settings
        const currentColor = ctx.strokeStyle;
        const currentLineWidth = ctx.lineWidth;

        // Apply received settings
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        // Restore local user's settings
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentLineWidth;
    }

    // Update client settings when encountered
    function updateClientSettings(clientData) {
        if (!clientSettings.has(clientData.clientId)) {
            clientSettings.set(clientData.clientId, {
                lastSeen: Date.now(),
                color: clientData.color,
                lineWidth: clientData.lineWidth
            });
        } else {
            // Update existing client settings
            const settings = clientSettings.get(clientData.clientId);
            settings.lastSeen = Date.now();
            settings.color = clientData.color;
            settings.lineWidth = clientData.lineWidth;
        }
    }

    //helper function for escaping HTML
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Save canvas state after significant changes
    function saveCanvasState() {
        try {
            // Compress the image more by reducing quality
            const imageData = canvas.toDataURL('image/jpeg', 0.5);

            if (socket && socket.readyState === WebSocket.OPEN) {
                console.log(`Saving canvas state for room: ${roomCode}`);
                socket.send(
                    JSON.stringify({
                        type: 'canvas_save',
                        clientId: clientId,
                        roomCode: roomCode,
                        image_data: imageData
                    })
                );
            } else {
                console.warn('Cannot save canvas state: WebSocket not connected');
            }
        } catch (e) {
            console.error('Error saving canvas state:', e);
        }
    }

    // Set up periodic canvas state saving (every 2 seconds)
    const SAVE_INTERVAL = 2000; // 2 seconds
    setInterval(saveCanvasState, SAVE_INTERVAL);

    // WebSocket event handlers
    socket.onopen = () => {
        console.log('WebSocket connection established');

        // Request the current canvas state
        socket.send(
            JSON.stringify({
                type: 'request_canvas_state',
                clientId: clientId,
                roomCode: roomCode
            })
        );

        // Then send a join message
        socket.send(
            JSON.stringify({
                type: 'chat_message',
                clientId: clientId,
                roomCode: roomCode,
                message: 'joined the drawing room',
                color: initialColor
            })
        );
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
    };

    socket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            console.log('Message received of type:', data.type); // More specific logging

            if (data.type === 'canvas_state') {
                console.log('Canvas state received, loading image...');
                // Load the existing canvas state
                if (data.image_data && (data.image_data.startsWith('data:image/jpeg') ||
                    data.image_data.startsWith('data:image/png'))) {
                    const img = new Image();
                    img.onload = function () {
                        console.log('Image loaded successfully, dimensions:', img.width, 'x', img.height);
                        // Clear the canvas first
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        // Draw the saved canvas state
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    };
                    img.onerror = function (error) {
                        console.error('Error loading canvas image:', error);
                    };
                    img.src = data.image_data;
                } else {
                    console.warn('Invalid or missing image data received:',
                        data.image_data ? data.image_data.substring(0, 30) + '...' : 'undefined');
                }
            } else if (data.type === 'request_canvas_state' && data.clientId !== clientId) {
                // If someone else is requesting the canvas state and we have it, send it
                // This helps when the server doesn't have the latest state
                saveCanvasState();
            } else if (data.type === 'chat_message') {
                let messages = document.getElementById('chat-messages');
                if (messages) {
                    const sender = data.clientId ? `User ${data.clientId.substring(0, 6)}` : 'Anonymous';
                    // Sanitize the message content to prevent HTML injection
                    const sanitizedMessage = escapeHTML(data.message);
                    messages.insertAdjacentHTML('beforeend', `<p><strong>${sender}:</strong> ${sanitizedMessage}</p>`);
                    messages.scrollTop = messages.scrollHeight;
                }
            } else if (data.type === 'draw_line') {
                // Update client settings store
                updateClientSettings(data);

                // Draw received line using the helper function
                drawReceivedLine(data.from, data.to, data.color, data.lineWidth);
            } else if (data.type === 'clear_canvas') {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // You could add a message showing who cleared the canvas
                let messages = document.getElementById('chat-messages');
                if (messages) {
                    const sender = data.clientId ? `User ${data.clientId.substring(0, 6)}` : 'Anonymous';
                    messages.insertAdjacentHTML('beforeend', `<p><em>Canvas cleared by user ${sender}</em></p>`);
                }

                // After clearing, save the new state
                if (data.clientId !== clientId) {
                    saveCanvasState();
                }
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    };

    // Chat form handling
    let form = document.getElementById('chat-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let messageInputDom = document.getElementById('chat-message');
            if (messageInputDom) {
                let message = messageInputDom.value;
                socket.send(
                    JSON.stringify({
                        type: 'chat_message',
                        clientId: clientId,
                        roomCode: roomCode,
                        message: message,
                        color: colorPicker ? colorPicker.value : initialColor
                    })
                );
                messageInputDom.value = '';
                form.reset();
            }
        });
    }
});
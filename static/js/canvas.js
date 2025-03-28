// Generate a unique client ID
const clientId = 'user_' + Math.random().toString(36).substr(2, 9)
document.getElementById('client-id').textContent = `(ID: ${clientId})`

// WebSocket connection setup - FIXED to support HTTPS/WSS
const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
let url = `${protocol}${window.location.host}/ws/socket-server/`
const socket = new WebSocket(url)

// Canvas setup
const canvas = document.getElementById('drawing-board')
const ctx = canvas.getContext('2d')
const clearButton = document.getElementById('clear-button')
const colorPicker = document.getElementById('color-picker')
const lineWidthInput = document.getElementById('line-width')
const lineWidthValue = document.getElementById('line-width-value')
const userColorIndicator = document.getElementById('user-color-indicator')

let isDrawing = false
let lastX = 0
let lastY = 0

// Assign a random color to new users
function getRandomColor() {
    const letters = '0123456789ABCDEF'
    let color = '#'
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)]
    }
    return color
}

// Set a random initial color
const initialColor = getRandomColor()
colorPicker.value = initialColor
userColorIndicator.style.backgroundColor = initialColor

// Initialize canvas
ctx.lineJoin = 'round'
ctx.lineCap = 'round'
ctx.lineWidth = 5
ctx.strokeStyle = initialColor

// Set canvas background to white
ctx.fillStyle = '#FFFFFF'
ctx.fillRect(0, 0, canvas.width, canvas.height)

/**
 * Fix for coordinate scaling problem:
 * - Canvas has a logical size (width/height attributes)
 * - Canvas has a display size (CSS dimensions)
 *
 * We need to properly scale between these two coordinate systems
 */
function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect()
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    const displayWidth = rect.width
    const displayHeight = rect.height

    // Calculate the scaling factors
    const scaleX = canvasWidth / displayWidth
    const scaleY = canvasHeight / displayHeight

    // Convert mouse coordinates to canvas coordinates
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    }
}

// Client-side drawing settings store
const clientSettings = new Map()

// Update line width display
lineWidthInput.addEventListener('input', function () {
    const width = this.value
    lineWidthValue.textContent = `${width}px`
    ctx.lineWidth = width
})

// Update stroke color
colorPicker.addEventListener('input', function () {
    const newColor = this.value
    ctx.strokeStyle = newColor
    userColorIndicator.style.backgroundColor = newColor
})

// Clear canvas
clearButton.addEventListener('click', function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    socket.send(
        JSON.stringify({
            type: 'clear_canvas',
            clientId: clientId
        })
    )
})

// Drawing event listeners
canvas.addEventListener('mousedown', startDrawing)
canvas.addEventListener('mousemove', draw)
canvas.addEventListener('mouseup', stopDrawing)
canvas.addEventListener('mouseout', stopDrawing)

// Touch support for mobile
canvas.addEventListener('touchstart', handleTouch)
canvas.addEventListener('touchmove', handleTouchMove)
canvas.addEventListener('touchend', stopDrawing)

function handleTouch(e) {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    })
    canvas.dispatchEvent(mouseEvent)
}

function handleTouchMove(e) {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    })
    canvas.dispatchEvent(mouseEvent)
}

function startDrawing(e) {
    isDrawing = true
    const pos = getMousePos(canvas, e)
    lastX = pos.x
    lastY = pos.y
}

function draw(e) {
    if (!isDrawing) return

    const pos = getMousePos(canvas, e)
    const x = pos.x
    const y = pos.y

    // Draw line
    ctx.beginPath()
    ctx.moveTo(lastX, lastY)
    ctx.lineTo(x, y)
    ctx.stroke()

    // Send drawing data to other users with client ID and settings
    socket.send(
        JSON.stringify({
            type: 'draw_line',
            clientId: clientId,
            from: { x: lastX, y: lastY },
            to: { x: x, y: y },
            color: ctx.strokeStyle,
            lineWidth: ctx.lineWidth
        })
    )

    lastX = x
    lastY = y
}

function stopDrawing() {
    isDrawing = false
}

// Ensure the canvas always has the correct coordinate transformations
// by updating calculations on window resize
window.addEventListener('resize', function () {
    // Recalculate will happen in getMousePos on next interactions
    console.log('Window resized, coordinate scaling will adjust')
})

// When receiving drawing data from other clients, we need to use the correct coordinates
function drawReceivedLine(from, to, color, lineWidth) {
    // Save current context settings
    const currentColor = ctx.strokeStyle
    const currentLineWidth = ctx.lineWidth

    // Apply received settings
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()

    // Restore local user's settings
    ctx.strokeStyle = currentColor
    ctx.lineWidth = currentLineWidth
}

// Store client settings when first encountered
function updateClientSettings(clientData) {
    if (!clientSettings.has(clientData.clientId)) {
        clientSettings.set(clientData.clientId, {
            lastSeen: Date.now(),
            color: clientData.color,
            lineWidth: clientData.lineWidth
        })
    } else {
        // Update existing client settings
        const settings = clientSettings.get(clientData.clientId)
        settings.lastSeen = Date.now()
        settings.color = clientData.color
        settings.lineWidth = clientData.lineWidth
    }
}

// WebSocket message handling
socket.onmessage = (e) => {
    const data = JSON.parse(e.data)
    console.log(data)

    // Skip processing our own messages
    // if (data.clientId === clientId) {
    //     return
    // }

    if (data.type === 'chat_message') {
        let messages = document.getElementById('chat-messages')
        const sender = data.clientId ? `User ${data.clientId.substring(0, 6)}` : 'Anonymous'
        messages.insertAdjacentHTML('beforeend', `<p><strong>${sender}:</strong> ${data.message}</p>`)
        messages.scrollTop = messages.scrollHeight
    } else if (data.type === 'draw_line') {
        // Update client settings store
        updateClientSettings(data)

        // Draw received line using the helper function
        drawReceivedLine(data.from, data.to, data.color, data.lineWidth)
    } else if (data.type === 'clear_canvas') {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // You could add a message showing who cleared the canvas
        let messages = document.getElementById('chat-messages')
        messages.insertAdjacentHTML('beforeend', `<p><em>Canvas cleared by user ${data.clientId.substring(0, 6)}</em></p>`)
    }
}

// Send initial join message to notify others
socket.onopen = () => {
    socket.send(
        JSON.stringify({
            type: 'chat_message',
            clientId: clientId,
            message: 'joined the drawing room',
            color: colorPicker.value
        })
    )
}

// Chat form handling
let form = document.getElementById('chat-form')
form.addEventListener('submit', (e) => {
    e.preventDefault()
    let messageInputDom = document.getElementById('chat-message')
    let message = messageInputDom.value
    socket.send(
        JSON.stringify({
            type: 'chat_message',
            clientId: clientId,
            message: message,
            color: colorPicker.value
        })
    )
    messageInputDom.value = ''
    form.reset()
})
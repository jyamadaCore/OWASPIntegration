import axios from 'axios';
import WebSocket from 'ws';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Fetch environment variables
const baseUrl: string = process.env.BASE_URL || '';
const bearerToken: string = process.env.BEARER_TOKEN || '';
const instanceId: string = process.env.INSTANCE_ID || '';

// Validate required environment variables
if (!baseUrl || !bearerToken || !instanceId) {
    console.error("Missing required environment variables: BASE_URL, BEARER_TOKEN, or INSTANCE_ID");
    process.exit(1);
}

// Construct the API endpoint URL
const apiUrl: string = `${baseUrl}/api/v1/instances/${instanceId}/console?type=frida`;

// Function to get the WebSocket URL from the API
async function getWebSocketUrl(): Promise<string | undefined> {
    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
            },
        });

        // Assuming the URL is returned in a field named 'url' in the response JSON
        const url: string = response.data.url;
        console.log("Retrieved WebSocket URL:", url);
        return url;

    } catch (error) {
        console.error("Error fetching WebSocket URL:", error);
        return undefined;
    }
}

// Function to establish and manage WebSocket connection
async function initializeWebSocket() {
    const url = await getWebSocketUrl();
    if (!url) {
        console.error("Failed to retrieve WebSocket URL.");
        return;
    }

    const socket = new WebSocket(url);

    socket.on('open', () => {
        console.log("WebSocket connection established");
        socket.send("Hello WebSocket!");
    });

    socket.on('message', (message: WebSocket.MessageEvent) => {
        console.log("Received message:", message.toString());
    });

    socket.on('error', (error: WebSocket.ErrorEvent) => {
        console.error("WebSocket error:", error.message);
    });

    socket.on('close', () => {
        console.log("WebSocket connection closed");
    });
}

// Run the WebSocket initialization
initializeWebSocket();

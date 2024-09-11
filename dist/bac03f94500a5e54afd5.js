/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

var __importDefault = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const ws_1 = __importDefault(require("ws")); // Import the WebSocket class directly
// Fetch environment variables from GitHub Actions environment
const baseUrl = process.env.BASE_URL || '';
const bearerToken = process.env.BEARER_TOKEN || '';
const instanceId = process.env.INSTANCE_ID || ''; // Fetching instanceId from environment variables
// Validate required environment variables
if (!baseUrl || !bearerToken || !instanceId) {
    console.error("Missing required environment variables: BASE_URL, BEARER_TOKEN, or INSTANCE_ID");
    process.exit(1);
}
// Construct the API endpoint URL
const apiUrl = `${baseUrl}/v1/instances/${instanceId}/console?type=frida`;
// Function to get the WebSocket URL from the API
async function getWebSocketUrl() {
    try {
        const response = await axios_1.default.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
            },
        });
        // Assuming the URL is returned in a field named 'url' in the response JSON
        const url = response.data.url;
        console.log("Retrieved WebSocket URL:", url);
        return url;
    }
    catch (error) {
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
    const socket = new ws_1.default(url); // Correctly construct WebSocket instance
    socket.on('open', () => {
        console.log("WebSocket connection established");
        socket.send("Hello WebSocket!"); // Send a message after connection opens
    });
    socket.on('message', (message) => {
        console.log("Received message:", message.toString()); // Log incoming messages
    });
    socket.on('error', (error) => {
        console.error("WebSocket error:", error.message); // Log errors
    });
    socket.on('close', () => {
        console.log("WebSocket connection closed"); // Log when connection closes
    });
}
// Run the WebSocket initialization
initializeWebSocket();


/******/ var __webpack_modules__ = ({

/***/ 930:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports = __nccwpck_require__.p + "bac03f94500a5e54afd5.js";

/***/ })

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __nccwpck_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	var threw = true;
/******/ 	try {
/******/ 		__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 		threw = false;
/******/ 	} finally {
/******/ 		if(threw) delete __webpack_module_cache__[moduleId];
/******/ 	}
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/******/ // expose the modules object (__webpack_modules__)
/******/ __nccwpck_require__.m = __webpack_modules__;
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/publicPath */
/******/ (() => {
/******/ 	var scriptUrl;
/******/ 	if (typeof import.meta.url === "string") scriptUrl = import.meta.url
/******/ 	// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 	// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 	if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 	scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 	__nccwpck_require__.p = scriptUrl;
/******/ })();
/******/ 
/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/******/ /* webpack/runtime/import chunk loading */
/******/ (() => {
/******/ 	__nccwpck_require__.b = new URL("./", import.meta.url);
/******/ 	
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		179: 0
/******/ 	};
/******/ 	
/******/ 	// no install chunk
/******/ 	
/******/ 	// no chunk on demand loading
/******/ 	
/******/ 	// no external install chunk
/******/ 	
/******/ 	// no on chunks loaded
/******/ })();
/******/ 
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require2_ !== 'undefined') __nccwpck_require2_.ab = new URL(/* asset import */ __nccwpck_require__(930), __nccwpck_require__.b).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

var __importDefault = ( false) || function (mod) {
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


})();


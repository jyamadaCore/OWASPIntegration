// index.js

const core = require("@actions/core");
const { run } = require("./integratedScript"); // Adjust the path if necessary

async function main() {
    try {
        // Run the main function from integratedScript.js
        await run();
    } catch (error) {
        core.setFailed(error.message);
    }
}

// Execute main function
main();

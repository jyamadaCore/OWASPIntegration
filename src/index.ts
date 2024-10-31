import * as core from "@actions/core";
import { run } from "../src/main"; // Adjust path if necessary

async function main() {
    try {
        await run();
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Error: ${error.message}`);
        } else {
            core.setFailed("An unknown error occurred.");
        }
    }
}

main();

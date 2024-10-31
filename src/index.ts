import * as core from "@actions/core";
import { run } from "../src/main"; // Adjust path if necessary

async function main() {
    try {
        await run();
    } catch (error: any) {
        core.setFailed(error.message);
    }
}

main();

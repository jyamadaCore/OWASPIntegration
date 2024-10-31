"use strict";
// main.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
exports.setupAgentConsole = setupAgentConsole;
exports.handleNetdump = handleNetdump;
exports.executeFrida = executeFrida;
exports.takeScreenshot = takeScreenshot;
// Required imports
const corellium_api_1 = require("@corellium/corellium-api");
const event_stream_1 = __importDefault(require("event-stream"));
const strip_ansi_1 = __importDefault(require("strip-ansi"));
const yargs_1 = __importDefault(require("yargs/yargs"));
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Command-line argument parsing
const argv = (0, yargs_1.default)(process.argv.slice(2)).argv;
// GitHub Action Inputs
const deviceId = core.getInput("deviceId") || process.env.CORELLIUM_INSTANCE_ID || "";
const reportFormat = core.getInput("reportFormat") || "html";
const projectName = core.getInput("projectName") || process.env.CORELLIUM_PROJECT || "";
const cmd = core.getInput("command") || "download";
const fridaScriptPath = core.getInput("fridaScriptPath") || "/data/corellium/frida/scripts/script.js";
const endpoint = core.getInput("endpoint") || "https://marketing.enterprise.corellium.com";
const user = core.getInput("user") || process.env.CORELLIUM_USER || "";
const pw = core.getInput("password") || process.env.CORELLIUM_PASSWORD || "";
/**
 * Usage helper to display command format
 */
function usage() {
    console.log("Usage: script.js [--endpoint <endpoint>] --user <user> --password <pw> --project <project> --instance <instance> [create | inplace | stream | download | frida | screenshot]");
    process.exit(-1);
}
// Verify required inputs
if (!user || !pw || !projectName) {
    console.log("username, password, and project must be specified");
    usage();
}
/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Main entry point for the action.
 */
async function run() {
    try {
        // Corellium Client Configuration
        const corellium = new corellium_api_1.Corellium({
            endpoint: endpoint,
            username: user,
            password: pw,
        });
        console.log("Logging in...");
        await corellium.login();
        console.log("Getting projects list...");
        const projects = await corellium.projects();
        const project = projects.find((proj) => proj.name === projectName);
        if (!project)
            throw new Error(`Project ${projectName} not found`);
        let instance;
        if (cmd === "inplace" || cmd === "create") {
            console.log("Instance command: " + cmd);
            if (cmd === "inplace") {
                // Retrieve existing instance by UUID
                const instances = await project.instances();
                instance = instances.find((inst) => inst.id === deviceId);
                if (!instance)
                    throw new Error(`Instance ${deviceId} not found`);
            }
            else {
                // Create a new instance
                console.log("Creating instance...");
                instance = await project.createInstance({
                    flavor: "ranchu",
                    os: "14.0.0",
                    name: "OWASP-Test",
                    osbuild: "r2 userdebug",
                    patches: "rooted",
                });
                console.log("Instance created, waiting to turn on...");
                await instance.finishRestore();
                await instance.waitForState("on");
            }
        }
        else if (cmd === "stream" || cmd === "download") {
            // Stream or Download netdump
            await handleNetdump(project, cmd, deviceId);
        }
        else if (cmd === "frida") {
            // Execute Frida Script
            await executeFrida(instance, fridaScriptPath);
        }
        else if (cmd === "screenshot") {
            // Take a screenshot
            await takeScreenshot(instance);
        }
        if (cmd === "create" || cmd === "inplace") {
            await setupAgentConsole(instance, argv._.slice(3).join(" "));
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
/**
 * Setup agent and console for an instance
 */
async function setupAgentConsole(instance, consoleCmd) {
    if (!instance)
        throw new Error("Instance is undefined.");
    console.log("Waiting for agent...");
    await instance.waitForAgentReady();
    const agent = await instance.agent();
    const consoleStream = await instance.console();
    await agent.ready();
    // Parse console output
    const streamHandler = event_stream_1.default.split();
    consoleStream.pipe(streamHandler).pipe(event_stream_1.default.mapSync((line) => {
        line = (0, strip_ansi_1.default)(line).replace(/[\n\r]+/g, "");
        console.log(line);
    }).on("error", (err) => console.log("Error while reading file.", err)));
    console.log(`Executing command: ${consoleCmd}`);
    await consoleStream.write(consoleCmd + "\r\n");
    // Wait for command to complete
    await sleep(5000);
    await consoleStream.write("Done.");
    await agent.disconnect();
}
/**
 * Handle Netdump download or streaming
 */
async function handleNetdump(project, action, instanceId) {
    const instances = await project.instances();
    const instance = instances.find((inst) => inst.id === instanceId);
    if (!instance)
        throw new Error(`Instance ${instanceId} not found`);
    await instance.waitForAgentReady();
    const agent = await instance.agent();
    await agent.ready();
    if (action === "stream") {
        console.log("Starting netdump stream...");
        const netdump = await instance.newNetdump();
        netdump.handleMessage((message) => {
            console.log(Buffer.isBuffer(message) ? message.toString() : message);
        });
        await netdump.start();
        await sleep(5000);
        await netdump.disconnect();
    }
    else if (action === "download") {
        console.log("Downloading pcap file...");
        const pcap = await instance.downloadPcap();
        fs.writeFileSync(path.join(process.env.GITHUB_WORKSPACE || ".", "netdump.pcap"), pcap);
    }
}
/**
 * Execute Frida Script
 */
async function executeFrida(instance, scriptPath) {
    if (!instance)
        throw new Error("Instance is undefined.");
    console.log(`Executing Frida script at ${scriptPath}...`);
    await instance.waitForAgentReady();
    const agent = await instance.agent();
    await agent.ready();
    await instance.executeFridaScript(scriptPath);
    console.log("Frida script executed successfully.");
}
/**
 * Take a Screenshot
 */
async function takeScreenshot(instance) {
    if (!instance)
        throw new Error("Instance is undefined.");
    console.log("Taking screenshot...");
    await instance.waitForAgentReady();
    const screenshot = await instance.takeScreenshot();
    fs.writeFileSync("screenshot.png", screenshot);
    console.log("Screenshot saved as screenshot.png");
}
// Run the main function
run();

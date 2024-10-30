// main.js

// Required imports
const { Corellium } = require("@corellium/corellium-api");
const es = require("event-stream");
const stripAnsi = require("strip-ansi");
const yargs = require("yargs/yargs");
const core = require("@actions/core");
const { exec } = require("@actions/exec");
const fs = require("fs");
const path = require("path");

// Command-line argument parsing
const argv = yargs(process.argv).argv;

// GitHub Action Inputs
const deviceId = core.getInput("deviceId") || process.env.CORELLIUM_INSTANCE_ID;
const reportFormat = core.getInput("reportFormat") || "html";
const projectName = core.getInput("projectName") || process.env.CORELLIUM_PROJECT;
const cmd = core.getInput("command") || "download";
const fridaScriptPath = core.getInput("fridaScriptPath") || "/data/corellium/frida/scripts/script.js";
const endpoint = core.getInput("endpoint") || "https://marketing.enterprise.corellium.com";
const user = core.getInput("user") || process.env.CORELLIUM_USER;
const pw = core.getInput("password") || process.env.CORELLIUM_PASSWORD;


function usage() {
    console.log(
        "Usage: script.js [--endpoint <endpoint>] --user <user> --password <pw> --project <project> --instance <instance> [create | inplace | stream | download | frida | screenshot]"
    );
    process.exit(-1);
}

// Verify required inputs
if (!user || !pw || !projectName) {
    console.log("username, password, and project must be specified");
    usage();
}

// Sleep helper
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    try {
        // Corellium Client Configuration
        let corellium = new Corellium({
            endpoint: endpoint,
            username: user,
            password: pw,
        });

        console.log("Logging in...");
        await corellium.login();

        console.log("Getting projects list...");
        let projects = await corellium.projects();
        let project = projects.find((proj) => proj.name === projectName);
        if (!project) throw new Error(`Project ${projectName} not found`);

        let instance;
        if (cmd === "inplace" || cmd === "create") {
            console.log("Instance command: " + cmd);
            if (cmd === "inplace") {
                // Retrieve existing instance by UUID
                const instances = await project.instances();
                instance = instances.find((inst) => inst.id === deviceId);
                if (!instance) throw new Error(`Instance ${deviceId} not found`);
            } else {
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
        } else if (cmd === "stream" || cmd === "download") {
            // Stream or Download netdump
            await handleNetdump(project, cmd, deviceId);
        } else if (cmd === "frida") {
            // Execute Frida Script
            await executeFrida(instance, fridaScriptPath);
        } else if (cmd === "screenshot") {
            // Take a screenshot
            await takeScreenshot(instance);
        }

        if (cmd === "create" || cmd === "inplace") {
            await setupAgentConsole(instance, argv._.slice(3).join(" "));
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

/**
 * Setup agent and console for an instance
 */
async function setupAgentConsole(instance, consoleCmd) {
    console.log("Waiting for agent...");
    await instance.waitForAgentReady();
    let agent = await instance.agent();
    let consoleStream = await instance.console();
    await agent.ready();

    // Parse console output
    let streamHandler = es.split();
    consoleStream.pipe(streamHandler).pipe(
        es.mapSync((line) => {
            line = stripAnsi(line).replace(/[\n\r]+/g, "");
            console.log(line);
        }).on("error", (err) => console.log("Error while reading file.", err))
    );

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
    let instance = instances.find((inst) => inst.id === instanceId);
    if (!instance) throw new Error(`Instance ${instanceId} not found`);

    await instance.waitForAgentReady();
    let agent = await instance.agent();
    await agent.ready();

    if (action === "stream") {
        console.log("Starting netdump stream...");
        let netdump = await instance.newNetdump();
        netdump.handleMessage((message) => {
            console.log(Buffer.isBuffer(message) ? message.toString() : message);
        });
        await netdump.start();
        await sleep(5000);
        await netdump.disconnect();
    } else if (action === "download") {
        console.log("Downloading pcap file...");
        let pcap = await instance.downloadPcap();
        fs.writeFileSync(path.join(process.env.GITHUB_WORKSPACE, "netdump.pcap"), pcap);
    }
}

/**
 * Execute Frida Script
 */
async function executeFrida(instance, scriptPath) {
    console.log(`Executing Frida script at ${scriptPath}...`);
    await instance.waitForAgentReady();
    let agent = await instance.agent();
    await agent.ready();
    await instance.executeFridaScript(scriptPath);
    console.log("Frida script executed successfully.");
}

/**
 * Take a Screenshot
 */
async function takeScreenshot(instance) {
    console.log("Taking screenshot...");
    await instance.waitForAgentReady();
    const screenshot = await instance.takeScreenshot();
    fs.writeFileSync("screenshot.png", screenshot);
    console.log("Screenshot saved as screenshot.png");
}

main();

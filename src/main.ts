// main.ts

// Required imports
import { Corellium, Project, Instance } from "@corellium/corellium-api";
import es from "event-stream";
import stripAnsi from "strip-ansi";
import yargs from "yargs/yargs";
import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as fs from "fs";
import * as path from "path";
import { Arguments } from "yargs";

// Command-line argument parsing
const argv = yargs(process.argv.slice(2)).argv as Arguments<any>;

// GitHub Action Inputs
const deviceId: string = core.getInput("deviceId") || process.env.CORELLIUM_INSTANCE_ID || "";
const reportFormat: string = core.getInput("reportFormat") || "html";
const projectName: string = core.getInput("projectName") || process.env.CORELLIUM_PROJECT || "";
const cmd: string = core.getInput("command") || "download";
const fridaScriptPath: string = core.getInput("fridaScriptPath") || "/data/corellium/frida/scripts/script.js";
const endpoint: string = core.getInput("endpoint") || "https://marketing.enterprise.corellium.com";
const user: string = core.getInput("user") || process.env.CORELLIUM_USER || "";
const pw: string = core.getInput("password") || process.env.CORELLIUM_PASSWORD || "";

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
function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function run() {
    try {
        // Corellium Client Configuration
        const corellium = new Corellium({
            endpoint: endpoint,
            username: user,
            password: pw,
        });

        console.log("Logging in...");
        await corellium.login();

        console.log("Getting projects list...");
        const projects = await corellium.projects();
        const project: Project | undefined = projects.find((proj: Project) => proj.name === projectName);
        if (!project) throw new Error(`Project ${projectName} not found`);

        let instance: Instance | undefined;
        if (cmd === "inplace" || cmd === "create") {
            console.log("Instance command: " + cmd);
            if (cmd === "inplace") {
                // Retrieve existing instance by UUID
                const instances = await project.instances();
                instance = instances.find((inst: Instance) => inst.id === deviceId);
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
    } catch (error: any) {
        core.setFailed(error.message);
    }
}

/**
 * Setup agent and console for an instance
 */
export async function setupAgentConsole(instance: Instance | undefined, consoleCmd: string) {
    if (!instance) throw new Error("Instance is undefined.");

    console.log("Waiting for agent...");
    await instance.waitForAgentReady();
    const agent = await instance.agent();
    const consoleStream = await instance.console();
    await agent.ready();

    // Parse console output
    const streamHandler = es.split();
    consoleStream.pipe(streamHandler).pipe(
        es.mapSync((line: string) => {
            line = stripAnsi(line).replace(/[\n\r]+/g, "");
            console.log(line);
        }).on("error", (err: any) => console.log("Error while reading file.", err))
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
export async function handleNetdump(project: Project, action: string, instanceId: string) {
    const instances = await project.instances();
    const instance = instances.find((inst: Instance) => inst.id === instanceId);
    if (!instance) throw new Error(`Instance ${instanceId} not found`);

    await instance.waitForAgentReady();
    const agent = await instance.agent();
    await agent.ready();

    if (action === "stream") {
        console.log("Starting netdump stream...");
        const netdump = await instance.newNetdump();
        netdump.handleMessage((message: any) => {
            console.log(Buffer.isBuffer(message) ? message.toString() : message);
        });
        await netdump.start();
        await sleep(5000);
        await netdump.disconnect();
    } else if (action === "download") {
        console.log("Downloading pcap file...");
        const pcap = await instance.downloadPcap();
        fs.writeFileSync(path.join(process.env.GITHUB_WORKSPACE || ".", "netdump.pcap"), pcap);
    }
}

/**
 * Execute Frida Script
 */
export async function executeFrida(instance: Instance | undefined, scriptPath: string) {
    if (!instance) throw new Error("Instance is undefined.");

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
export async function takeScreenshot(instance: Instance | undefined) {
    if (!instance) throw new Error("Instance is undefined.");

    console.log("Taking screenshot...");
    await instance.waitForAgentReady();
    const screenshot = await instance.takeScreenshot();
    fs.writeFileSync("screenshot.png", screenshot);
    console.log("Screenshot saved as screenshot.png");
}

run();

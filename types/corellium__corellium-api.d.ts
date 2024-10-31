declare module "@corellium/corellium-api" {
    export class Corellium {
        constructor(config: { endpoint: string; username: string; password: string });
        login(): Promise<void>;
        projects(): Promise<Project[]>;
    }

    export interface Project {
        name: string;
        instances(): Promise<Instance[]>;
        createInstance(config: InstanceConfig): Promise<Instance>;
    }

    export interface Instance {
        id: string;
        name: string;
        finishRestore(): Promise<void>;
        waitForState(state: string): Promise<void>;
        waitForAgentReady(): Promise<void>;
        agent(): Promise<any>;
        console(): Promise<any>;
        newNetdump(): Promise<any>;
        downloadPcap(): Promise<Buffer>;
        executeFridaScript(path: string): Promise<void>;
        takeScreenshot(): Promise<Buffer>;
    }

    export interface InstanceConfig {
        flavor: string;
        os: string;
        name: string;
        osbuild: string;
        patches?: string;
    }
}

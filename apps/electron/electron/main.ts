import { app, BrowserWindow, shell } from "electron";
import { startSvelteKitServer } from "../runtime/server.js";
import type { StartedSvelteKitServer } from "../runtime/server.js";

let server: StartedSvelteKitServer | undefined;
const cli = parseCli(process.argv);

async function createWindow(): Promise<void> {
    server = await startSvelteKitServer({
        host: "127.0.0.1",
        port: Number(process.env.PORT ?? 0),
    });

    const window = new BrowserWindow({
        width: 1100,
        height: 760,
        title: "SvelteKit Remote Functions in Electron",
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    window.webContents.setWindowOpenHandler(({ url }) => {
        void shell.openExternal(url);
        return { action: "deny" };
    });

    await window.loadURL(server.url);
}

async function serve(): Promise<void> {
    server = await startSvelteKitServer({ host: cli.host, port: cli.port });
    console.log(`SvelteKit server listening at ${server.url}`);

    for (const signal of ["SIGINT", "SIGTERM"]) {
        process.on(signal, async () => {
            await server?.close();
            app.exit(0);
        });
    }
}

app.whenReady()
    .then(cli.command === "serve" ? serve : createWindow)
    .catch((error) => {
        console.error(error);
        app.quit();
    });

app.on("activate", () => {
    if (cli.command === "serve") return;
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
    void server?.close();
});

type Cli = {
    command: "serve" | "desktop";
    host: string;
    port: number;
};

function parseCli(argv: string[]): Cli {
    const args = argv
        .slice(1)
        .filter(
            (arg) => !arg.endsWith("/electron/main.js") && !arg.endsWith("\\electron\\main.js"),
        );
    const command = args[0] === "serve" ? "serve" : "desktop";

    return {
        command,
        host: readFlag(args, "--host") ?? process.env.HOST ?? "127.0.0.1",
        port: Number(
            readFlag(args, "--port") ?? process.env.PORT ?? (command === "serve" ? 3000 : 0),
        ),
    };
}

function readFlag(args: string[], name: string): string | undefined {
    const index = args.indexOf(name);
    if (index === -1) return undefined;
    return args[index + 1];
}

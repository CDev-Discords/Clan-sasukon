const stringlength = 69;

module.exports = (client) => {
    client.tsumi
        .on("nodeConnect", (node) => {
            console.log("\n");
            console.log(`     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`.bold.brightGreen);
            console.log(`     ┃ `.bold.brightGreen + " ".repeat(-1 + stringlength - ` ┃ `.length) + "┃".bold.brightGreen);
            console.log(`     ┃ `.bold.brightGreen + `Node connected: `.bold.brightGreen + " ".repeat(-1 + stringlength - ` ┃ `.length - `Node connected: `.length) + "┃".bold.brightGreen);
            console.log(`     ┃ `.bold.brightGreen + ` { ${node.id} } `.bold.brightGreen + " ".repeat(-1 + stringlength - ` ┃ `.length - ` { ${node.id} } `.length) + "┃".bold.brightGreen);
            console.log(`     ┃ `.bold.brightGreen + " ".repeat(-1 + stringlength - ` ┃ `.length) + "┃".bold.brightGreen);
            console.log(`     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`.bold.brightGreen);
        })
        .on("nodeReconnect", (node) => {
            console.log("\n");
            console.log(`     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`.bold.brightYellow);
            console.log(`     ┃ `.bold.brightYellow + " ".repeat(-1 + stringlength - ` ┃ `.length) + "┃".bold.brightYellow);
            console.log(`     ┃ `.bold.brightYellow + `Node reconnecting: `.bold.brightYellow + " ".repeat(-1 + stringlength - ` ┃ `.length - `Node reconnected: `.length) + "┃".bold.brightYellow);
            console.log(`     ┃ `.bold.brightYellow + ` { ${node.id} } `.bold.brightYellow + " ".repeat(-1 + stringlength - ` ┃ `.length - ` { ${node.id} } `.length) + "┃".bold.brightYellow);
            console.log(`     ┃ `.bold.brightYellow + " ".repeat(-1 + stringlength - ` ┃ `.length) + "┃".bold.brightYellow);
            console.log(`     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`.bold.brightYellow);
        })
        .on("nodeDisconnect", (node, reason) => {
            console.log("\n");
            console.log(`     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`.bold.brightMagenta);
            console.log(`     ┃ `.bold.brightMagenta + " ".repeat(-1 + stringlength - ` ┃ `.length) + "┃".bold.brightMagenta);
            console.log(`     ┃ `.bold.brightMagenta + `Node disconnected: `.bold.brightMagenta + " ".repeat(-1 + stringlength - ` ┃ `.length - `Node reconnected: `.length) + "┃".bold.brightMagenta);
            console.log(`     ┃ `.bold.brightMagenta + ` { ${node.id} } `.bold.brightMagenta + " ".repeat(-1 + stringlength - ` ┃ `.length - ` { ${node.id} } `.length) + "┃".bold.brightMagenta);
            console.log(`     ┃ `.bold.brightMagenta + " ".repeat(-1 + stringlength - ` ┃ `.length) + "┃".bold.brightMagenta);
            console.log(`     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`.bold.brightMagenta);
            // Opcional: Mostrar razón de desconexión
            if (reason) {
                console.log(`     Reason: ${reason.code} ${reason.reason}`);
            }
        })
        .on("nodeError", (node, error) => {
            console.log("\n");
            console.log(`     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`.bold.brightRed);
            console.log(`     ┃ `.bold.brightRed + " ".repeat(-1 + stringlength - ` ┃ `.length) + "┃".bold.brightRed);
            console.log(`     ┃ `.bold.brightRed + `Node errored: `.bold.brightRed + " ".repeat(-1 + stringlength - ` ┃ `.length - `Node reconnected: `.length) + "┃".bold.brightRed);
            console.log(`     ┃ `.bold.brightRed + ` { ${node.id} } `.bold.brightRed + " ".repeat(-1 + stringlength - ` ┃ `.length - ` { ${node.id} } `.length) + "┃".bold.brightRed);
            console.log(`     ┃ `.bold.brightRed + " ".repeat(-1 + stringlength - ` ┃ `.length) + "┃".bold.brightRed);
            console.log(`     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`.bold.brightRed);

            if (error && error.toString().includes("ECONNREFUSED")) {
                console.error(`No Permissions to Connect to the Lavalink: ${node.host}\nPort: ${node.port}\nPassword: ${node.password}\n :: Maybe wrong password / Lavalink offline?`);
            } else if (error) {
                console.error(error);
            }
        });
};
/**
 * @INFO
 * Bot Coded by Tomato#6966 | https://github?.com/Tomato6966/discord-js-lavalink-Music-Bot-erela-js
 * @INFO
 * Work for Milrato Development | https://milrato.eu
 * @INFO
 * Please mention Him / Milrato Development, when using this Code!
 * @INFO
 */
const { TsumiInstance } = require("tsumi");
const config = require(`${process.cwd()}/botconfig/config.json`);
const clientID = process.env.clientID || config.spotify.clientID;
const clientSecret = process.env.clientSecret || config.spotify.clientSecret;

module.exports = (client) => {
    client.on("ready", async () => {
        console.log(`[MUSIC] Inicializando TsumiLink para ${client.user.tag}`);

        // ✅ Validar client.user
        if (!client.user || !client.user.id) {
            console.error("[MUSIC] ❌ client.user no está disponible.");
            return;
        }

        const hasSpotifyAuth = clientID && clientSecret && clientID.length >= 5 && clientSecret.length >= 5;

        try {
            const nodes = collect(config.clientsettings.nodes);
            if (!nodes || nodes.length === 0) {
                console.error("[MUSIC] ❌ No se encontraron nodos Lavalink en la configuración.");
                return;
            }

            // ✅ Definir sendPayload
            const sendPayload = (payload) => {
                if (!payload || !payload.guildId) return;
                const guild = client.guilds.cache.get(payload.guildId);
                if (guild && guild.shard) {
                    guild.shard.send(payload).catch(console.warn);
                }
            };

            // ✅ Crear instancia
            client.tsumi = new TsumiInstance({
                botId: "1231738780936044575",
                nodes: nodes,
                autoPlay: true,
                sendPayload: sendPayload,
                options: {
                    region: "us",
                    retryDelay: 5000,
                    reconnectTimeout: 30000,
                },
                spotify: hasSpotifyAuth
                    ? {
                          clientId: clientID,
                          clientSecret: clientSecret,
                          useSpotifyMeta: true,
                      }
                    : null,
            });
            // Nodo Lavalink

            client.tsumi.addNode({
	            serverName: 'CDev',
	            secure: false,
	            host: 'localhost',
	            pass: 'cdev',
	            port: 8080,
              userAgent: 'Tsumi/0.0.2',
              botId: "1231738780936044575"
            });
            
            // ✅ Escuchar eventos
            client.tsumi
                .on("nodeConnect", (node) => {
                    console.log(`[MUSIC] ✅ Nodo conectado: ${node.id}`);
                })
                .on("nodeReconnect", (node) => {
                    console.log(`[MUSIC] 🔁 Reconectando nodo: ${node.id}`);
                })
                .on("nodeDisconnect", (node, reason) => {
                    console.warn(`[MUSIC] ❌ Nodo desconectado: ${node.id}`, reason);
                })
                .on("nodeError", (node, error) => {
                    console.error(`[MUSIC] 🛑 Error en nodo ${node.id}:`, error);
                });

            // ✅ Cargar eventos
            require("./node_events")(client);
            require("./client_events")(client);
            require("./events")(client);
            require("./musicsystem")(client);

            console.log("[MUSIC] ✅ TsumiLink inicializado correctamente.");
        } catch (error) {
            console.error("[MUSIC] ❌ Error al inicializar TsumiLink:", error.message || error);
        }
    });
};

function collect(node) {
    return node.map((x) => {
        if (!x.host) throw new RangeError('"host" must be provided');
        if (!x.password) throw new RangeError('"password" must be provided');
        if (typeof x.port !== "number") throw new RangeError('"port" must be a number');
        if (x.retryDelay && typeof x.retryDelay !== "number")
            throw new RangeError("Retry delay must be a number");
        if (x.secure && typeof x.secure !== "boolean") throw new RangeError("Secure must be a boolean");

        return {
            id: x.identifier || x.host,
            host: x.host,
            port: x.port && !isNaN(x.port) ? Number(x.port) : 2333,
            password: x.password ? x.password : "youshallnotpass",
            retryDelay: x.retryDelay ? Number(x.retryDelay) : 5000,
            secure: x.secure ? x.secure : false,
            version: x.version ? x.version : "v4",
        };
    });
}


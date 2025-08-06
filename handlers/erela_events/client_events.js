const {
    MessageEmbed,
    MessageButton,
    MessageActionRow
} = require("discord.js");
const ms = require("ms");
const config = require(`${process.cwd()}/botconfig/config.json`);
const emoji = require("../../botconfig/emojis.json");
const ee = require(`${process.cwd()}/botconfig/embed.json`);
const { databasing } = require(`../functions`);

module.exports = (client) => {
    // Evento ready: inicialización del bot
    client.once("ready", () => {
        // TsumiLink se inicializa en creation.js, no necesita .init()
        console.log(`[MUSIC] TsumiLink está listo y el bot está en línea.`);
    });

    // El evento "raw" NO es necesario con TsumiLink si usas sharding correctamente
    // TsumiLink maneja los estados de voz internamente a través del método `send` definido en creation.js
    // client.on("raw", (d) => client.manager.updateVoiceState(d)); → Eliminado

    // Si se elimina un canal de voz donde el bot está conectado, destruir el reproductor
    client.on("channelDelete", async (channel) => {
        try {
            if (channel.type === "GUILD_VOICE") {
                if (channel.members.has(client.user.id)) {
                    const player = client.tsumi.players.get(channel.guild.id);
                    if (!player) return;
                    if (channel.id === player.voiceChannelId) {
                        await player.destroy();
                    }
                }
            }
        } catch (e) {
            // Silenciar errores
        }
    });

    // Si el bot es expulsado del servidor, destruir el reproductor
    client.on("guildRemove", async (guild) => {
        try {
            const player = client.tsumi.players.get(guild.id);
            if (!player) return;
            if (guild.id === player.guildId) {
                await player.destroy();
            }
        } catch (e) {
            // Silenciar errores
        }
    });

    // Manejo de Stage Channels: quitar suppress si el bot es speaker
    client.on("voiceStateUpdate", async (oldState, newState) => {
        if (newState.channelId && newState.channel?.type === "GUILD_STAGE_VOICE" && newState.guild.me.voice.suppress) {
            try {
                await newState.guild.me.voice.setSuppressed(false);
            } catch (e) {
                console.error("[VOICE] No se pudo quitar suppress en Stage Channel:", e);
            }
        }
    });

    // Manejo de desconexión automática cuando todos los usuarios (no bots) salen del canal
    client.on("voiceStateUpdate", async (oldState, newState) => {
        // Si hubo un cambio de canal
        if (oldState.channelId && (!newState.channelId || newState.channelId)) {
            const player = client.tsumi.players.get(oldState.guild.id);
            if (!player || oldState.channelId !== player.voiceChannelId) return;

            // Verificar si el bot sigue en un canal de voz
            const voiceChannel = oldState.guild.me.voice.channel;
            if (!voiceChannel) {
                try {
                    await player.destroy();
                } catch (e) {
                    console.error("[PLAYER_DESTROY] Error al destruir el reproductor tras salir del canal:", e);
                }
                return;
            }

            // Contar miembros que no sean bots
            const nonBotMembers = voiceChannel.members.filter(member => !member.user.bot).size;
            if (nonBotMembers < 1) {
                try {
                    await player.destroy();
                } catch (e) {
                    console.error("[PLAYER_DESTROY] Error al destruir el reproductor por canal vacío:", e);
                }
            }
        }
    });
};

/**
 * @INFO
 * Bot Coded by Tomato#6966 | https://github.com/Tomato6966/discord-js-lavalink-Music-Bot-erela-js
 * @INFO
 * Work for Milrato Development | https://milrato.eu
 * @INFO
 * Please mention Him / Milrato Development, when using this Code!
 * @INFO
 */
  
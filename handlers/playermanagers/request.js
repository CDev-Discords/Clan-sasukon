const { MessageEmbed } = require("discord.js");
const ee = require(`${process.cwd()}/botconfig/embed.json`);
const config = require(`${process.cwd()}/botconfig/config.json`);
const { format, delay, arrayMove } = require("../functions");

// Función para reproducir una canción o lista
async function request(client, message, args, type, slashCommand = false) {
    let ls = await client.settings.get(message.guild.id + ".language");
    const search = args.join(" ");
    let player = client.tsumi.players.get(message.guild.id);

    // Si no hay reproductor, créalo
    if (!player) {
        const vc = message.member.voice.channel;
        const tc = message.channel;

        // Verificar permisos del bot
        if (!vc.permissionsFor(message.guild.me).has(["CONNECT", "SPEAK"])) {
            const missing = [];
            if (!vc.permissionsFor(message.guild.me).has("CONNECT")) missing.push("Connect");
            if (!vc.permissionsFor(message.guild.me).has("SPEAK")) missing.push("Speak");
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle("❌ Missing Permissions")
                .setDescription(`I need the following permissions in your voice channel: \`${missing.join(", ")}\``);
            if (slashCommand) {
                return slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null);
            } else {
                return message.reply({ embeds: [embed] }).catch(() => null);
            }
        }

        player = client.tsumi.createPlayer({
            guildId: message.guild.id,
            voiceChannelId: vc.id,
            textChannelId: tc.id,
            deafen: true,
        });

        await player.connect();
        await player.stop(); // Asegurarse de que no esté reproduciendo

        // Establecer metadatos
        player.set("message", message);
        player.set("playerauthor", message.author.id);
    }

    // Resolver la búsqueda
    let res;
    try {
        res = await client.tsumi.resolve({ query: search, requester: message.author });
    } catch (error) {
        console.error("Error resolving track:", error);
        const embed = new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle("❌ Error resolving track")
            .setDescription("An error occurred while searching for the track.");
        if (slashCommand) {
            return slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null);
        } else {
            return message.reply({ embeds: [embed] }).catch(() => null);
        }
    }

    // Manejar errores de carga
    if (res.loadType === "LOAD_FAILED") {
        console.error("Load failed:", res.exception);
        const embed = new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle("❌ Failed to load track")
            .setDescription(res.exception.message || "Unknown error");
        if (slashCommand) {
            return slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null);
        } else {
            return message.reply({ embeds: [embed] }).catch(() => null);
        }
    }

    // Procesar según el tipo de carga
    if (res.loadType === "PLAYLIST_LOADED") {
        await playlist_();
    } else {
        await song_();
    }

    // Función para manejar una sola canción
    async function song_() {
        const track = res.tracks[0] || res.tracks;
        if (!track) {
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle(`❌ Error | Found nothing for: **\`${search.substring(0, 253)}...\`**`)
                .setDescription(eval(client.la[ls]["handlers"]["playermanagers"]["request"]["variable1"]));
            if (slashCommand) {
                return slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null);
            } else {
                return message.reply({ embeds: [embed] }).catch(() => null).then(msg => {
                    setTimeout(() => msg.delete().catch(() => null), 3000);
                });
            }
        }

        // Añadir a la cola
        if (!player.current) {
            player.queue.add(track);
            await player.play();
            if (player.paused) await player.pause(false);
        } else {
            player.queue.add(track);
        }

        // Actualizar el mensaje del sistema de música
        const musicsettings = await client.musicsettings.get(player.guildId);
        if (musicsettings.channel && musicsettings.channel.length > 5) {
            const guild = client.guilds.cache.get(player.guildId);
            if (guild) {
                const channel = guild.channels.cache.get(musicsettings.channel) ||
                    await client.channels.fetch(musicsettings.channel).catch(() => null);
                if (channel) {
                    const message = await channel.messages.fetch(musicsettings.message).catch(() => null);
                    if (message) {
                        const data = await require("../erela_events/musicsystem").generateQueueEmbed(client, player.guildId);
                        await message.edit(data).catch(console.error);
                    }
                }
            }
        }
    }

    // Función para manejar listas de reproducción
    async function playlist_() {
        if (!res.tracks || res.tracks.length === 0) {
            const embed = new MessageEmbed()
              .setColor(ee.wrongcolor)
              .setTitle(`❌ Error | Found nothing for: **\`${search.substring(0, 253)}...\`**`)
              .setDescription(eval(client.la[ls]["handlers"]["playermanagers"]["request"]["variable1"]));
            if (slashCommand) {
                return slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null);
            } else {
                return message.reply({ embeds: [embed] }).catch(() => null).then(msg => {
                    setTimeout(() => msg.delete().catch(() => null), 3000);
                });
            }
        }

        // Añadir todas las pistas
        if (!player.current) {
            player.queue.add(res.tracks);
            await player.play();
            if (player.paused) await player.pause(false);
        } else {
            player.queue.add(res.tracks);
        }

        // Actualizar el mensaje del sistema de música
        const musicsettings = await client.musicsettings.get(player.guildId);
        if (musicsettings.channel && musicsettings.channel.length > 5) {
            const guild = client.guilds.cache.get(player.guildId);
            if (guild) {
                const channel = guild.channels.cache.get(musicsettings.channel) ||
                    await client.channels.fetch(musicsettings.channel).catch(() => null);
                if (channel) {
                    const message = await channel.messages.fetch(musicsettings.message).catch(() => null);
                    if (message) {
                        const data = await require("../erela_events/musicsystem").generateQueueEmbed(client, player.guildId);
                        await message.edit(data).catch(console.error);
                    }
                }
            }
        }
    }
}

module.exports = request;

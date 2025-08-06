const { EmbedBuilder } = require("discord.js");
const ee = require(`${process.cwd()}/botconfig/embed.json`);
const config = require(`${process.cwd()}/botconfig/config.json`);
const { format } = require("../functions");

// Función para reproducir canciones similares
async function similar(client, message, args, type, slashCommand = false) {
    try {
        const ls = await client.settings.get(`${message.guild.id}.language`);

        // Obtener la URL del mix
        const mixURL = args.join(" ");
        if (!mixURL) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(ee.wrongcolor)
                    .setTitle("❌ Please provide a valid URL or query.")
                ]
            }).then(msg => setTimeout(() => msg.delete().catch(() => null), 3000));
        }

        // Obtener el reproductor
        const player = client.tsumi.players.get(message.guild.id);
        if (!player) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(ee.wrongcolor)
                    .setTitle("❌ No hay reproductor activo.")
                ]
            }).then(msg => setTimeout(() => msg.delete().catch(() => null), 3000));
        }

        // Verificar que el bot tenga permisos
        const vc = message.member?.voice?.channel;
        if (!vc || !vc.permissionsFor(message.guild.members.me).has(["Connect", "Speak"])) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(ee.wrongcolor)
                    .setTitle("❌ No puedo conectarme al canal de voz o no tengo permisos.")
                ]
            }).then(msg => setTimeout(() => msg.delete().catch(() => null), 3000));
        }

        // Resolver la búsqueda
        let res;
        try {
            res = await client.tsumi.resolve({ query: mixURL, requester: message.author });
        } catch (error) {
            console.error("Error en resolve():", error);
            return client.channels.cache.get(player.textChannelId)?.send({
                embeds: [new EmbedBuilder()
                    .setColor(ee.wrongcolor)
                    .setTitle(client.la[ls]?.handlers?.playermanagers?.similar?.variable1 || "❌ Error al resolver la búsqueda.")
                ]
            });
        }

        // Validar que sea una lista de reproducción
        if (!res || res.loadType === "LOAD_FAILED" || res.loadType !== "PLAYLIST_LOADED") {
            return client.channels.cache.get(player.textChannelId)?.send({
                embeds: [new EmbedBuilder()
                    .setColor(ee.wrongcolor)
                    .setTitle(client.la[ls]?.handlers?.playermanagers?.similar?.variable1 || "❌ No se encontró una lista de reproducción válida.")
                ]
            });
        }

        // Si el tipo es "add": añadir la primera pista similar (diferente a la actual)
        if (type.split(":")[1] === "add") {
            const currentTrackId = player.current?.identifier;
            const filteredTracks = res.tracks.filter(t => t.identifier !== currentTrackId);

            if (filteredTracks.length === 0) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(ee.wrongcolor)
                        .setTitle("❌ No se encontraron pistas similares.")
                    ]
                });
            }

            const trackToAdd = filteredTracks[0];
            player.queue.add(trackToAdd);

            const embed = new EmbedBuilder()
                .setDescription(client.la[ls]?.handlers?.playermanagers?.similar?.variable2 || `Added **${trackToAdd.title}** to the queue.`)
                .setColor(ee.color)
                .setThumbnail(`https://img.youtube.com/vi/${trackToAdd.identifier}/mqdefault.jpg`)
                .addFields(
                    { name: "⌛ Duration", value: `\`${trackToAdd.isStream ? "LIVE STREAM" : format(trackToAdd.duration)}\``, inline: true },
                    { name: "💯 Song By", value: `\`${trackToAdd.author}\``, inline: true },
                    { name: "🔂 Queue length", value: `\`${player.queue.size} Songs\``, inline: true },
                    {
                        name: ":notes: Music Dashboard :new:",
                        value: `[**Check out the :new: Music Dashboard!**](https://milrato.com/dashboard/queue/${player.guildId})\n> Live Music View, Live Music Requests, Live Music Control and more!`
                    }
                );

            await message.reply({ embeds: [embed] });

            // Actualizar el sistema de música
            await updateMusicSystem(client, player);

            return;
        }

        // Si el tipo es "search": mostrar lista y permitir elegir
        if (type.split(":")[1] === "search") {
            const max = Math.min(15, res.tracks.length);
            const filter = m => m.author.id === message.author.id && /^(\d+|end)$/i.test(m.content);
            const results = res.tracks.slice(0, max).map((track, i) => {
                const num = i + 1;
                const title = String(track.title).substring(0, 60).replace(/\[/g, "{").replace(/\]/g, "}");
                return `**${num})** [\`${title}\`](${track.uri}) - \`${format(track.duration).split(" | ")[0]}\``;
            }).join("\n");

            const currentTitle = player.current?.title || "Unknown Track";
            const searchEmbed = new EmbedBuilder()
                .setTitle(`Search result for: 🔎 **\`${currentTitle.substring(0, 253)}...\`**`)
                .setColor(ee.color)
                .setDescription(results || "No results found.")
                .setFooter({ text: `Search-Request by: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

            await message.reply({ embeds: [searchEmbed] });
            await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(ee.color)
                    .setTitle(client.la[ls]?.handlers?.playermanagers?.similar?.variable3 || "Please select a track number or type 'end' to cancel.")
                ]
            });

            let collected;
            try {
                collected = await message.channel.awaitMessages({
                    filter,
                    max: 1,
                    time: 30000,
                    errors: ["time"]
                });
            } catch {
                if (!player.current) await player.destroy();
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(ee.wrongcolor)
                        .setTitle(client.la[ls]?.handlers?.playermanagers?.similar?.variable4 || "❌ Time out! No response received.")
                    ]
                });
            }

            const content = collected.first().content;
            if (content.toLowerCase() === "end") {
                if (!player.current) await player.destroy();
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(ee.wrongcolor)
                        .setTitle(client.la[ls]?.handlers?.playermanagers?.similar?.variable5 || "❌ Search cancelled.")
                    ]
                });
            }

            const index = Number(content) - 1;
            if (isNaN(index) || index < 0 || index >= max) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(ee.wrongcolor)
                        .setTitle(client.la[ls]?.handlers?.playermanagers?.similar?.variable6 || "❌ Invalid selection.")
                    ]
                });
            }

            const selectedTrack = res.tracks[index];
            if (!selectedTrack) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(ee.wrongcolor)
                        .setTitle(`❌ Error | Found nothing for: **\`${currentTitle.substring(0, 253)}...\`**`)
                        .setDescription(client.la[ls]?.handlers?.playermanagers?.similar?.variable7 || "No track found for the selected index.")
                    ]
                }).then(msg => setTimeout(() => msg.delete().catch(() => null), 3000));
            }

            // Añadir la pista
            if (!player.connected) {
                player.set("message", message);
                player.set("playerauthor", message.author.id);
                await player.connect();
                if (!slashCommand) await message.react("863876115584385074").catch(() => null);
                player.queue.add(selectedTrack);
                await player.play();
                if (player.paused) await player.pause(false);
            } else {
                player.queue.add(selectedTrack);
                const embed = new EmbedBuilder()
                    .setDescription(client.la[ls]?.handlers?.playermanagers?.similar?.variable8 || `Added **${selectedTrack.title}** to the queue.`)
                    .setColor(ee.color)
                    .setThumbnail(`https://img.youtube.com/vi/${selectedTrack.identifier}/mqdefault.jpg`)
                    .addFields(
                        { name: "⌛ Duration", value: `\`${selectedTrack.isStream ? "LIVE STREAM" : format(selectedTrack.duration)}\``, inline: true },
                        { name: "💯 Song By", value: `\`${selectedTrack.author}\``, inline: true },
                        { name: "🔂 Queue length", value: `\`${player.queue.size} Songs\``, inline: true },
                        {
                            name: ":notes: Music Dashboard :new:",
                            value: `[**Check out the :new: Music Dashboard!**](https://milrato.com/dashboard/queue/${player.guildId})\n> Live Music View, Live Music Requests, Live Music Control and more!`
                        }
                    );
                await message.reply({ embeds: [embed] });
            }

            // Actualizar el sistema de música
            await updateMusicSystem(client, player);
        }
    } catch (e) {
        console.error("Error in similar function:", e);
        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(ee.wrongcolor)
                .setTitle(`❌ Error | Something went wrong: **\`${player?.current?.title?.substring(0, 253) || "Unknown"}...\`**`)
            ]
        }).then(msg => setTimeout(() => msg.delete().catch(() => null), 3000));
    }
}

// Función auxiliar para actualizar el sistema de música
async function updateMusicSystem(client, player) {
    const musicsettings = await client.musicsettings.get(player.guildId);
    if (musicsettings?.channel?.length > 5) {
        const guild = client.guilds.cache.get(player.guildId);
        if (guild) {
            const channel = guild.channels.cache.get(musicsettings.channel) ||
                await client.channels.fetch(musicsettings.channel).catch(() => null);
            if (channel) {
                const msg = await channel.messages.fetch(musicsettings.message).catch(() => null);
                if (msg) {
                    const data = await require("../erela_events/musicsystem").generateQueueEmbed(client, player.guildId);
                    await msg.edit(data).catch(() => null);
                }
            }
        }
    }
}

module.exports = similar;

/**
 * @INFO
 * Bot Coded by Tomato#6966 | https://github.com/Tomato6966/discord-js-lavalink-Music-Bot-erela-js
 * @INFO
 * Work for Milrato Development | https://milrato.eu
 * @INFO
 * Please mention Him / Milrato Development, when using this Code!
 * @INFO
 */

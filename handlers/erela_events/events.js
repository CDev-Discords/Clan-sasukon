const {
    MessageEmbed,
    MessageButton,
    MessageActionRow,
    Permissions
} = require("discord.js");
const ms = require("ms");
const config = require(`${process.cwd()}/botconfig/config.json`);
const emoji = require("../../botconfig/emojis.json");
const ee = require(`${process.cwd()}/botconfig/embed.json`);
const {
    createBar,
    format,
    check_if_dj,
    databasing,
    autoplay
} = require(`../functions`);
const playermanager = require("../../handlers/playermanager");

// Mapa para manejar jugadores creados
const playercreated = new Map();
// Coleccionador actual de componentes
let collector = false;

module.exports = (client) => {
    // Escuchar eventos de TsumiLink
    client.tsumi
        .on("playerCreate", async (player) => {
            playercreated.set(player.guildId, true);
        })
        .on("playerMove", async (player, oldChannelId, newChannelId) => {
            if (!newChannelId) {
                await player.destroy();
            } else {
                player.voiceChannelId = newChannelId;
                if (player.paused) return;
                // Pequeña pausa para estabilizar la conexión
                setTimeout(() => {
                    player.pause(true);
                    setTimeout(() => player.pause(false), client.ws.ping * 2);
                }, client.ws.ping * 2);
            }
        })
        .on("playerDestroy", async (player) => {
            if (player.textChannelId && player.guildId) {
                const guild = client.guilds.cache.get(player.guildId);
                if (!guild) return;

                const textChannel = guild.channels.cache.get(player.textChannelId) ||
                    await client.channels.fetch(player.textChannelId).catch(() => null);

                if (textChannel && textChannel.permissionsFor(guild.me).has(Permissions.FLAGS.SEND_MESSAGES)) {
                    const messageId = player.get("currentmsg");
                    if (messageId) {
                        const currentSongPlayMsg = await textChannel.messages.fetch(messageId).catch(() => null);
                        if (currentSongPlayMsg && currentSongPlayMsg.embeds[0]) {
                            const embed = currentSongPlayMsg.embeds[0];
                            embed.author.iconURL = "https://cdn.discordapp.com/attachments/883978730261860383/883978741892649000/847032838998196234.png";
                            embed.footer.text += "\n⛔️ SONG & QUEUE ENDED! | Player got DESTROYED (stopped)";
                            await currentSongPlayMsg.edit({ embeds: [embed], components: [] }).catch(() => null);
                        }
                    }
                }

                // Actualizar el mensaje del sistema de música
                const musicsettings = await client.musicsettings.get(player.guildId);
                if (musicsettings.channel && musicsettings.channel.length > 5) {
                    const channel = guild.channels.cache.get(musicsettings.channel) ||
                        await client.channels.fetch(musicsettings.channel).catch(() => null);
                    if (channel) {
                        const message = await channel.messages.fetch(musicsettings.message).catch(() => null);
                        if (message) {
                            const data = await require("./musicsystem").generateQueueEmbed(client, player.guildId, true);
                            await message.edit(data).catch(() => null);
                        }
                    } else {
                        client.musicsettings.set(`${player.guildId}.message`, false);
                        client.musicsettings.set(`${player.guildId}.channel`, false);
                    }
                }
            }
        })
        .on("trackStart", async (player, track) => {
            try {
                let edited = false;
                const settings = await client.settings.get(player.guildId);
                const es = settings.embed || ee;
                const ls = settings.language || "en";

                // Configuración inicial del reproductor
                if (playercreated.has(player.guildId)) {
                    player.set("eq", "💣 None");
                    player.set("filter", "🧨 None");
                    await player.setVolume(settings.defaultvolume || 30);
                    await player.set("autoplay", settings.defaultap || false);
                    await player.set("afk", false);

                    if (settings.defaulteq) {
                        // Asumimos que tienes una configuración de EQs
                        await player.setEQ?.(client.eqs?.music);
                    }

                    databasing(client, player.guildId, player.get("playerauthor"));
                    playercreated.delete(player.guildId);
                }

                // Actualizar mensaje del sistema de música
                const musicsettings = await client.musicsettings.get(player.guildId);
                if (musicsettings.channel && musicsettings.channel.length > 5) {
                    const guild = client.guilds.cache.get(player.guildId);
                    if (!guild) return;

                    const channel = guild.channels.cache.get(musicsettings.channel) ||
                        await client.channels.fetch(musicsettings.channel).catch(() => null);
                    if (channel) {
                        const message = await channel.messages.fetch(musicsettings.message).catch(() => null);
                        if (message) {
                            const data = await require("./musicsystem").generateQueueEmbed(client, player.guildId);
                            await message.edit(data).catch(() => null);
                            if (musicsettings.channel === player.textChannelId) return;
                        }
                    } else {
                        client.musicsettings.set(`${player.guildId}.message`, false);
                        client.musicsettings.set(`${player.guildId}.channel`, false);
                    }
                }

                // Limpiar colector anterior si existe
                if (player.get("collector") && !collector?.ended) {
                    try {
                        collector?.stop();
                    } catch (e) {}
                }

                // Mensaje anterior
                if (player.textChannelId && player.get("previoustrack")) {
                    const prevTrack = player.get("previoustrack");
                    const textChannel = client.guilds.cache.get(player.guildId)?.channels.cache.get(player.textChannelId) ||
                        await client.channels.fetch(player.textChannelId).catch(() => null);

                    if (textChannel && textChannel.permissionsFor(textChannel.guild.me).has(Permissions.FLAGS.SEND_MESSAGES)) {
                        const prevMsgId = player.get("currentmsg");
                        const prevMsg = await textChannel.messages.fetch(prevMsgId).catch(() => null);
                        if (prevMsg && prevMsg.embeds[0]) {
                            const embed = prevMsg.embeds[0];
                            embed.author.iconURL = "https://cdn.discordapp.com/attachments/883978730261860383/883978741892649000/847032838998196234.png";
                            embed.footer.text += "\n⛔️ SONG ENDED!";
                            await prevMsg.edit({ embeds: [embed], components: [] }).catch(() => null);
                        }
                    }
                }

                // Reiniciar votos de skip
                player.set("votes", "0");
                const guild = client.guilds.cache.get(player.guildId);
                if (guild) {
                    guild.members.cache.forEach(member => {
                        player.set(`vote-${member.user.id}`, false);
                    });
                }

                // Guardar pista anterior para autoplay
                player.set("previoustrack", track);

                // Si desactivado, no enviar mensaje
                if (settings.playmsg === false) return;

                // Generar embed de reproducción
                const playData = generateQueueEmbed(client, player, track);
                const textChannel = client.guilds.cache.get(player.guildId)?.channels.cache.get(player.textChannelId) ||
                    await client.channels.fetch(player.textChannelId).catch(() => null);

                if (textChannel && textChannel.permissionsFor(textChannel.guild.me).has(Permissions.FLAGS.SEND_MESSAGES)) {
                    const sentMsg = await textChannel.send(playData);
                    player.set("currentmsg", sentMsg.id);

                    // Crear colector de componentes
                    collector = sentMsg.createMessageComponentCollector({
                        filter: i => i.isButton() && i.user && i.message.author.id === client.user.id,
                        time: track.isStream ? 600_000 : track.duration // 10 min para streams
                    });

                    collector.on('collect', async i => {
                        const { member } = i;
                        const vc = member.voice.channel;
                        const p = client.tsumi.players.get(i.guildId);

                        if (!p) return i.reply({ content: "<:no:833101993668771842> Nothing Playing yet", ephemeral: true });
                        if (!vc) return i.reply({ content: "<:no:833101993668771842> Please join a Voice Channel first!", ephemeral: true });
                        if (vc.id !== p.voiceChannelId) return i.reply({
                            content: `<:no:833101993668771842> Please join __my__ Voice Channel first! <#${p.voiceChannelId}>`,
                            ephemeral: true
                        });

                        const dj = await check_if_dj(client, member, p.current);
                        if (i.customId !== "10" && dj) {
                            return i.reply({
                                embeds: [new MessageEmbed()
                                    .setColor(es.wrongcolor)
                                    .setFooter(client.getFooter(es))
                                    .setTitle("<:no:833101993668771842> You are not a DJ and not the Song Requester!")
                                    .setDescription(`**DJ-ROLES:**\n${dj}`)
                                ],
                                ephemeral: true
                            });
                        }

                        switch (i.customId) {
                            case "1": // Skip
                                if (p.queue.size === 0) {
                                    if (p.get("autoplay")) return autoplay(client, p, "skip");
                                    i.reply({
                                        embeds: [new MessageEmbed()
                                            .setColor(es.color)
                                            .setTimestamp()
                                            .setTitle("⏹ Stopped playing and left the Channel")
                                            .setFooter(client.getFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true })))
                                        ]
                                    });
                                    edited = true;
                                    await p.destroy();
                                    return;
                                }
                                await p.skip();
                                i.reply({
                                    embeds: [new MessageEmbed()
                                        .setColor(es.color)
                                        .setTimestamp()
                                        .setTitle("⏭ Skipped to the next Song!")
                                        .setFooter(client.getFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true })))
                                    ]
                                });
                                break;

                            case "2": // Stop
                                i.reply({
                                    embeds: [new MessageEmbed()
                                        .setColor(es.color)
                                        .setTimestamp()
                                        .setTitle("⏹ Stopped playing and left the Channel")
                                        .setFooter(client.getFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true })))
                                    ]
                                });
                                edited = true;
                                await p.destroy();
                                break;

                            case "3": // Pause/Resume
                                const resume = !p.paused;
                                await p.pause(resume);
                                i.reply({
                                    embeds: [new MessageEmbed()
                                        .setColor(es.color)
                                        .setTimestamp()
                                        .setTitle(resume ? "▶️ Resumed!" : "⏸ Paused!")
                                        .setFooter(client.getFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true })))
                                    ]
                                });
                                const data = generateQueueEmbed(client, p, p.current);
                                sentMsg.edit(data).catch(() => null);
                                break;

                            case "4": // Autoplay
                                const newAutoplay = !p.autoplay;
                                p.autoplay = newAutoplay;
                                const data4 = generateQueueEmbed(client, p, p.current);
                                sentMsg.edit(data4).catch(() => null);
                                i.reply({
                                    embeds: [new MessageEmbed()
                                        .setColor(es.color)
                                        .setTimestamp()
                                        .setTitle(`${newAutoplay ? "<a:yes:833101995723194437> Enabled Autoplay" : "<:no:833101993668771842> Disabled Autoplay"}`)
                                        .setFooter(client.getFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true })))
                                    ]
                                });
                                break;

                            case "5": // Shuffle
                                player.set("beforeshuffle", [...p.queue.all()]);
                                p.queue.shuffle();
                                i.reply({
                                    embeds: [new MessageEmbed()
                                        .setColor(es.color)
                                        .setTimestamp()
                                        .setTitle(`🔀 Shuffled ${p.queue.size} Songs!`)
                                        .setFooter(client.getFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true })))
                                    ]
                                });
                                break;

                            case "6": // Song Loop
                                const repeatMode = p.get("repeatMode") || "none";
                                p.set("repeatMode", repeatMode === "track" ? "none" : "track");
                                const data6 = generateQueueEmbed(client, p, p.current);
                                sentMsg.edit(data6).catch(() => null);
                                i.reply({
                                    embeds: [new MessageEmbed()
                                        .setColor(es.color)
                                        .setTimestamp()
                                        .setTitle(`${p.get("repeatMode") === "track" ? "<a:yes:833101995723194437> Enabled Song Loop" : "<:no:833101993668771842> Disabled Song Loop"}`)
                                        .setFooter(client.getFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true })))
                                    ]
                                });
                                break;

                            case "7": // Queue Loop
                                const qRepeatMode = p.get("repeatMode") || "none";
                                p.set("repeatMode", qRepeatMode === "queue" ? "none" : "queue");
                                const data7 = generateQueueEmbed(client, p, p.current);
                                sentMsg.edit(data7).catch(() => null);
                                i.reply({
                                    embeds: [new MessageEmbed()
                                        .setColor(es.color)
                                        .setTimestamp()
                                        .setTitle(`${p.get("repeatMode") === "queue" ? "<a:yes:833101995723194437> Enabled Queue Loop" : "<:no:833101993668771842> Disabled Queue Loop"}`)
                                        .setFooter(client.getFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true })))
                                    ]
                                });
                                break;

                            case "8": // Forward
                                let seektime = p.position + 10_000;
                                if (seektime >= p.current.duration) seektime = p.current.duration - 1000;
                                await p.seekTo(seektime);
                                collector.resetTimer({ time: p.current.duration - p.position });
                                i.reply({
                                    embeds: [new MessageEmbed()
                                        .setColor(es.color)
                                        .setTimestamp()
                                        .setTitle("⏩ Forwarded the song for `10 Seconds`!")
                                        .setFooter(client.getFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true })))
                                    ]
                                });
                                break;

                            case "9": // Rewind
                                let rSeektime = p.position - 10_000;
                                if (rSeektime < 0) rSeektime = 0;
                                await p.seekTo(rSeektime);
                                collector.resetTimer({ time: p.current.duration - p.position });
                                i.reply({
                                    embeds: [new MessageEmbed()
                                        .setColor(es.color)
                                        .setTimestamp()
                                        .setTitle("⏪ Rewinded the song for `10 Seconds`!")
                                        .setFooter(client.getFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true })))
                                    ]
                                });
                                break;
                        }
                    });

                    collector.on("end", () => {
                        if (sentMsg && !edited) {
                            sentMsg.edit({ components: [] }).catch(() => null);
                        }
                    });

                    player.set("collector", collector);
                }
            } catch (e) {
                console.error("Error en trackStart:", e);
            }
        })
        .on("trackStuck", async (player, track, payload) => {
            await player.stop();
            handleTrackIssue(client, player, "⚠️⚠️⚠️ SONG STUCKED ⚠️⚠️!");
        })
        .on("trackError", async (player, track, payload) => {
            await player.stop();
            handleTrackIssue(client, player, "⚠️⚠️⚠️ SONG CRASHED ⚠️⚠️!");
        })
        .on("queueEnd", async (player) => {
            databasing(client, player.guildId, player.get("playerauthor"));

            if (player.autoplay) {
                return autoplay(client, player);
            }

            try {
                const p = client.tsumi.players.get(player.guildId);
                if (!p || !p.current) {
                    const musicsettings = await client.musicsettings.get(player.guildId);
                    if (musicsettings.channel && musicsettings.channel.length > 5) {
                        const guild = client.guilds.cache.get(player.guildId);
                        if (guild) {
                            const channel = guild.channels.cache.get(musicsettings.channel) ||
                                await client.channels.fetch(musicsettings.channel).catch(() => null);
                            if (channel) {
                                const message = await channel.messages.fetch(musicsettings.message).catch(() => null);
                                if (message) {
                                    const data = await require("./musicsystem").generateQueueEmbed(client, player.guildId);
                                    await message.edit(data).catch(() => null);
                                }
                            } else {
                                client.musicsettings.set(`${player.guildId}.message`, false);
                                client.musicsettings.set(`${player.guildId}.channel`, false);
                            }
                        }
                    }

                    // Si no está en modo AFK, destruir
                    if (!player.get("afk")) {
                        await player.destroy();
                    }
                }
            } catch (e) {
                console.error(e);
            }
        });
};

// Función auxiliar para manejar errores de pista
async function handleTrackIssue(client, player, message) {
    if (player.textChannelId) {
        const guild = client.guilds.cache.get(player.guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(player.textChannelId) ||
            await client.channels.fetch(player.textChannelId).catch(() => null);

        if (channel && channel.permissionsFor(guild.me).has(Permissions.FLAGS.SEND_MESSAGES)) {
            const msgId = player.get("currentmsg");
            const msg = await channel.messages.fetch(msgId).catch(() => null);
            if (msg && msg.embeds[0]) {
                const embed = msg.embeds[0];
                embed.author.iconURL = "https://cdn.discordapp.com/attachments/883978730261860383/883978741892649000/847032838998196234.png";
                embed.footer.text += `\n${message}`;
                await msg.edit({ embeds: [embed], components: [] }).catch(() => null);
            }
        }

        const musicsettings = await client.musicsettings.get(player.guildId);
        if (musicsettings.channel && musicsettings.channel.length > 5) {
            const channel = guild.channels.cache.get(musicsettings.channel) ||
                await client.channels.fetch(musicsettings.channel).catch(() => null);
            if (channel) {
                const message = await channel.messages.fetch(musicsettings.message).catch(() => null);
                if (message) {
                    const data = await require("./musicsystem").generateQueueEmbed(client, player.guildId);
                    await message.edit(data).catch(() => null);
                }
            } else {
                client.musicsettings.set(`${player.guildId}.message`, false);
                client.musicsettings.set(`${player.guildId}.channel`, false);
            }
        }
    }
}

// Función para generar el embed de reproducción actual
function generateQueueEmbed(client, player, track) {
    const embed = new MessageEmbed()
        .setColor(ee.color)
        .setAuthor(`${track.title}`, "https://images-ext-1.discordapp.net/external/DkPCBVBHBDJC8xHHCF2G7-rJXnTwj_qs78udThL8Cy0/%3Fv%3D1/https/cdn.discordapp.com/emojis/859459305152708630.gif", track.uri)
        .setThumbnail(`https://img.youtube.com/vi/${track.identifier}/mqdefault.jpg`)
        .setFooter(`Requested by: ${track.requester.tag}`, track.requester.displayAvatarURL({ dynamic: true }));

    const skip = new MessageButton().setStyle('PRIMARY').setCustomId('1').setEmoji('⏭').setLabel('Skip');
    const stop = new MessageButton().setStyle('DANGER').setCustomId('2').setEmoji('🏠').setLabel('Stop');
    const pause = new MessageButton().setStyle('SECONDARY').setCustomId('3').setEmoji('⏸').setLabel('Pause');
    const autoplay = new MessageButton().setStyle('SUCCESS').setCustomId('4').setEmoji('🔁').setLabel('Autoplay');
    const shuffle = new MessageButton().setStyle('PRIMARY').setCustomId('5').setEmoji('🔀').setLabel('Shuffle');

    if (!player.paused) {
        pause.setStyle('SUCCESS').setEmoji('▶️').setLabel('Resume');
    }
    if (player.autoplay) {
        autoplay.setStyle('SECONDARY');
    }

    const songloop = new MessageButton().setStyle('SUCCESS').setCustomId('6').setEmoji('🔁').setLabel('Song');
    const queueloop = new MessageButton().setStyle('SUCCESS').setCustomId('7').setEmoji('🔂').setLabel('Queue');
    const forward = new MessageButton().setStyle('PRIMARY').setCustomId('8').setEmoji('⏩').setLabel('+10 Sec');
    const rewind = new MessageButton().setStyle('PRIMARY').setCustomId('9').setEmoji('⏪').setLabel('-10 Sec');
    const lyrics = new MessageButton().setStyle('PRIMARY').setCustomId('10').setEmoji('📝').setLabel('Lyrics').setDisabled();

    const repeatMode = player.get("repeatMode") || "none";
    if (repeatMode === "track") {
        songloop.setStyle('SECONDARY');
    } else if (repeatMode === "queue") {
        queueloop.setStyle('SECONDARY');
    }

    const row = new MessageActionRow().addComponents([skip, stop, pause, autoplay, shuffle]);
    const row2 = new MessageActionRow().addComponents([songloop, queueloop, forward, rewind, lyrics]);

    return { embeds: [embed], components: [row, row2] };
}
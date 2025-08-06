const { MessageEmbed, MessageButton, MessageActionRow, Permissions } = require("discord.js");
const { check_if_dj, autoplay, escapeRegex, format, duration, createBar } = require("../functions");
const config = require(`${process.cwd()}/botconfig/config.json`);
const ee = require(`${process.cwd()}/botconfig/embed.json`);
const emoji = require(`${process.cwd()}/botconfig/emojis.json`);
const playermanager = require(`../playermanager`);

module.exports = async (client) => {
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isButton()) return;

        const { guild, message, channel, member, user } = interaction;
        if (!guild) return;

        try {
            // Fetch music settings
            const data = await client.musicsettings.get(guild.id);
            if (!data || !data.channel || !data.message) {
                return interaction.reply({
                    content: "Music settings not configured properly.",
                    ephemeral: true
                });
            }

            const { channel: musicChannelId, message: musicChannelMessage } = data;
            if (musicChannelId !== channel.id || musicChannelMessage !== message.id) {
                return;
            }

            if (!member?.voice?.channel) {
                return interaction.reply({
                    content: ":x: **Please connect to a voice channel first!**",
                    ephemeral: true
                });
            }

            const player = client.tsumi.players.get(guild.id);
            if (interaction.customId !== "Join" && interaction.customId !== "Leave" && (!player || !player.current)) {
                return interaction.reply({
                    content: "<:no:833101993668771842> Nothing playing yet",
                    ephemeral: true
                });
            }

            if (player && member.voice.channel.id !== player.voiceChannelId) {
                return interaction.reply({
                    content: `<:no:833101993668771842> **Please join my voice channel first! <#${player.voiceChannelId}>**`,
                    ephemeral: true
                });
            }

            const dj = await check_if_dj(client, member, player?.current);
            if (player && !["Join", "Lyrics"].includes(interaction.customId) && dj) {
                return interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setColor(ee.wrongcolor)
                            .setFooter(ee.footertext, ee.footericon)
                            .setTitle(`<:no:833101993668771842> **You are not a DJ or the song requester!**`)
                            .setDescription(`**DJ Roles:**\n${dj}`)
                    ],
                    ephemeral: true
                });
            }

            const settings = await client.settings.get(guild.id);
            const es = settings.embed;
            const ls = settings.language;

            switch (interaction.customId) {
                case "Join": {
                    const vc = member.voice.channel;
                    if (!vc.permissionsFor(guild.me).has(Permissions.FLAGS.CONNECT)) {
                        return interaction.reply({
                            content: "<:no:833101993668771842> **I lack permission to connect to your voice channel!**",
                            ephemeral: true
                        });
                    }
                    if (!vc.permissionsFor(guild.me).has(Permissions.FLAGS.SPEAK)) {
                        return interaction.reply({
                            content: "<:no:833101993668771842> **I lack permission to speak in your voice channel!**",
                            ephemeral: true
                        });
                    }

                    const player = client.tsumi.createPlayer({
                        guildId: guild.id,
                        voiceChannelId: vc.id,
                        textChannelId: channel.id,
                        deafen: config.settings.selfDeaf
                    });

                    await player.connect();
                    await player.stop();

                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(es.color)
                                .setTitle(client.la[ls].cmds.music.join.title)
                                .setDescription(`Channel: <#${vc.id}>`)
                        ]
                    });

                    const data = await generateQueueEmbed(client, guild.id);
                    await message.edit(data).catch(console.error);
                    break;
                }

                case "Leave": {
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.color)
                                .setTimestamp()
                                .setTitle(`:wave: **Left the channel**`)
                                .setFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true }))
                        ]
                    });

                    if (player) {
                        await player.destroy();
                    }

                    const data = await generateQueueEmbed(client, guild.id, true);
                    await message.edit(data).catch(console.error);
                    break;
                }

                case "Skip": {
                    if (!player.queue || player.queue.size === 0) {
                        if (player.autoplay) {
                            return autoplay(client, player, "skip");
                        }

                        await interaction.reply({
                            embeds: [
                                new MessageEmbed()
                                    .setColor(ee.color)
                                    .setTimestamp()
                                    .setTitle(`⏹ **Stopped playing and left the channel**`)
                                    .setFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true }))
                            ]
                        });

                        await player.destroy();
                        const data = await generateQueueEmbed(client, guild.id, true);
                        await message.edit(data).catch(console.error);
                        return;
                    }

                    await player.skip();
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.color)
                                .setTimestamp()
                                .setTitle(`⏭ **Skipped to the next song!**`)
                                .setFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true }))
                        ]
                    });

                    const data = await generateQueueEmbed(client, guild.id);
                    await message.edit(data).catch(console.error);
                    break;
                }

                case "Stop": {
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.color)
                                .setTimestamp()
                                .setTitle(`⏹ **Stopped playing and left the channel**`)
                                .setFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true }))
                        ]
                    });

                    await player.destroy();
                    const data = await generateQueueEmbed(client, guild.id, true);
                    await message.edit(data).catch(console.error);
                    break;
                }

                case "Pause": {
                    if (player.playing) {
                        await player.pause(true);
                        await interaction.reply({
                            embeds: [
                                new MessageEmbed()
                                    .setColor(ee.color)
                                    .setTimestamp()
                                    .setTitle(`⏸ **Paused!**`)
                                    .setFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true }))
                            ]
                        });
                    } else {
                        await player.pause(false);
                        await interaction.reply({
                            embeds: [
                                new MessageEmbed()
                                    .setColor(ee.color)
                                    .setTimestamp()
                                    .setTitle(`▶️ **Resumed!**`)
                                    .setFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true }))
                            ]
                        });
                    }

                    const data = await generateQueueEmbed(client, guild.id);
                    await message.edit(data).catch(console.error);
                    break;
                }

                case "Autoplay": {
                    player.autoplay = !player.autoplay;
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.color)
                                .setTimestamp()
                                .setTitle(player.autoplay
                                    ? `<a:yes:833101995723194437> **Enabled Autoplay**`
                                    : `<:no:833101993668771842> **Disabled Autoplay**`)
                                .setFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true }))
                        ]
                    });

                    const data = await generateQueueEmbed(client, guild.id);
                    await message.edit(data).catch(console.error);
                    break;
                }

                case "Shuffle": {
                    player.set("beforeshuffle", [...player.queue]);
                    player.queue.shuffle();

                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.color)
                                .setTimestamp()
                                .setTitle(`🔀 **Shuffled ${player.queue.size} songs!**`)
                                .setFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true }))
                        ]
                    });

                    const data = await generateQueueEmbed(client, guild.id);
                    await message.edit(data).catch(console.error);
                    break;
                }

                case "Song": {
                    const repeatMode = player.get("repeatMode") || "none";
                    if (repeatMode === "track") {
                        player.set("repeatMode", "none");
                    } else {
                        player.set("repeatMode", "track");
                        player.set("queueBeforeRepeat", [...player.queue]);
                    }

                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.color)
                                .setTimestamp()
                                .setTitle(player.get("repeatMode") === "track"
                                    ? `<a:yes:833101995723194437> **Enabled Song Loop**`
                                    : `<:no:833101993668771842> **Disabled Song Loop**`)
                                .setFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true }))
                        ]
                    });

                    const data = await generateQueueEmbed(client, guild.id);
                    await message.edit(data).catch(console.error);
                    break;
                }

                case "Queue": {
                    const repeatMode = player.get("repeatMode") || "none";
                    if (repeatMode === "queue") {
                        player.set("repeatMode", "none");
                    } else {
                        player.set("repeatMode", "queue");
                        player.set("queueBeforeRepeat", [...player.queue]);
                    }

                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.color)
                                .setTimestamp()
                                .setTitle(player.get("repeatMode") === "queue"
                                    ? `<a:yes:833101995723194437> **Enabled Queue Loop**`
                                    : `<:no:833101993668771842> **Disabled Queue Loop**`)
                                .setFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true }))
                        ]
                    });

                    const data = await generateQueueEmbed(client, guild.id);
                    await message.edit(data).catch(console.error);
                    break;
                }

                case "Forward": {
                    let seektime = player.position + 10 * 1000;
                    if (seektime >= player.current.duration) seektime = player.current.duration - 1000;

                    await player.seekTo(seektime);
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.color)
                                .setTimestamp()
                                .setTitle(`⏩ **Forwarded the song by 10 seconds!**`)
                                .setFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true }))
                        ]
                    });

                    const data = await generateQueueEmbed(client, guild.id);
                    await message.edit(data).catch(console.error);
                    break;
                }

                case "Rewind": {
                    let seektime = player.position - 10 * 1000;
                    if (seektime < 0) seektime = 0;

                    await player.seekTo(seektime);
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.color)
                                .setTimestamp()
                                .setTitle(`⏪ **Rewinded the song by 10 seconds!**`)
                                .setFooter(`💢 Action by: ${member.user.tag}`, member.user.displayAvatarURL({ dynamic: true }))
                        ]
                    });

                    const data = await generateQueueEmbed(client, guild.id);
                    await message.edit(data).catch(console.error);
                    break;
                }

                case "Lyrics": {
                    await interaction.reply({
                        content: "Lyrics functionality is not implemented yet.",
                        ephemeral: true
                    });
                    break;
                }
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: "An error occurred while processing your request.",
                ephemeral: true
            });
        }
    });

    client.on("messageCreate", async (message) => {
        if (!message.guild || message.author.bot) return;

        try {
            const data = await client.musicsettings.get(message.guild.id);
            if (!data || !data.channel || data.channel !== message.channel.id) return;

            // Auto-delete messages
            if (message.author.id === client.user.id) {
                setTimeout(() => message.delete().catch(() => null), 2500);
            } else {
                setTimeout(() => message.delete().catch(() => null), 5000);
            }

            const prefix = await client.settings.get(`${message.guild.id}.prefix`);
            const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(prefix)})\\s*`);
            if (prefixRegex.test(message.content)) return;

            const { channel } = message.member.voice;
            if (!channel) {
                return message.reply("<:no:833101993668771842> **Please join a voice channel first!**")
                    .then(msg => setTimeout(() => msg.delete().catch(() => null), 5000));
            }

            const player = client.tsumi.players.get(message.guild.id);
            if (player && channel.id !== player.voiceChannelId) {
                return message.reply(`<:no:833101993668771842> **Please join my voice channel first! <#${player.voiceChannelId}>**`)
                    .then(msg => setTimeout(() => msg.delete().catch(() => null), 5000));
            }

            return playermanager(client, message, message.content.trim().split(/ +/), "request:song");
        } catch (error) {
            console.error(error);
            await message.reply({
                content: "An error occurred while processing your request.",
                ephemeral: true
            });
        }
    });
};

async function generateQueueEmbed(client, guildId, leave = false) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const settings = await client.settings.get(guild.id);
    const es = settings.embed;
    const ls = settings.language;

    const embeds = [
        new MessageEmbed()
            .setColor(es.color)
            .setTitle(`📃 Queue of __${guild.name}__`)
            .setDescription(`**Currently there are __0 Songs__ in the Queue**`)
            .setThumbnail(guild.iconURL({ dynamic: true })),

        new MessageEmbed()
            .setColor(es.color)
            .setFooter(es.footertext, es.footericon)
            .setImage(guild.banner ? guild.bannerURL({ size: 4096 }) : "https://imgur.com/jLvYdb4.png")
            .setTitle(`Start Listening to Music, by connecting to a Voice Channel and sending either the **SONG LINK** or **SONG NAME** in this Channel!`)
            .setDescription(`> *I support <:Youtube:840260133686870036> Youtube, <:Spotify:846090652231663647> Spotify, <:soundcloud:825095625884434462> Soundcloud and direct MP3 Links!*`)
    ];

    const player = client.tsumi.players.get(guildId);
    if (!leave && player && player.current) {
        embeds[1]
            .setImage(`https://img.youtube.com/vi/${player.current.identifier}/mqdefault.jpg`)
            .setFooter(`Requested by: ${player.current.requester.tag}`, player.current.requester.displayAvatarURL({ dynamic: true }))
            .addField(`${emoji?.msg.time} Duration: `, `\`${format(player.current.duration).split(" | ")[0]}\` | \`${format(player.current.duration).split(" | ")[1]}\``, true)
            .addField(`${emoji?.msg.song_by} Song By: `, `\`${player.current.author}\``, true)
            .addField(`${emoji?.msg.repeat_mode} Queue length: `, `\`${player.queue.size} Songs\``, true)
            .setAuthor(player.current.title, "https://images-ext-1.discordapp.net/external/DkPCBVBHBDJC8xHHCF2G7-rJXnTwj_qs78udThL8Cy0/%3Fv%3D1/https/cdn.discordapp.com/emojis/859459305152708630.gif", player.current.uri);

        delete embeds[1].description;
        delete embeds[1].title;

        const tracks = player.queue.all();
        const maxTracks = 10;
        const songs = tracks.slice(0, maxTracks);

        embeds[0]
            .setTitle(`📃 Queue of __${guild.name}__  -  [ ${player.queue.size} Tracks ]`)
            .setColor(es.color)
            .setDescription(
                songs.map((track, index) =>
                    `**\` ${++index}. \` ${track.uri ? `[${track.title.substring(0, 60).replace(/\[/igu, "\\[\\[").replace(/\]/igu, "\\]\\]")}](${track.uri})` : track.title}** - \`${track.isStream ? `LIVE STREAM` : format(track.duration).split(` | `)[0]}\`\n> *Requested by: __${track.requester.tag}__*`
                ).join("\n").substring(0, 2048)
            );

        if (player.queue.size > maxTracks) {
            embeds[0].addField(`**\` N. \` *${player.queue.size - maxTracks} other Tracks ...***`, `\u200b`);
        }

        embeds[0].addField(
            `**\` 0. \` __CURRENT TRACK__**`,
            `**${player.current.uri ? `[${player.current.title.substring(0, 60).replace(/\[/igu, "\\[\\[").replace(/\]/igu, "\\]\\]")}](${player.current.uri})` : player.current.title}** - \`${player.current.isStream ? `LIVE STREAM` : format(player.current.duration).split(` | `)[0]}\`\n> *Requested by: __${player.current.requester.tag}__*`
        );
    }

    const joinbutton = new MessageButton().setStyle('SUCCESS').setCustomId('Join').setEmoji(`👌`).setLabel(`Join`).setDisabled(!!player);
    const leavebutton = new MessageButton().setStyle('DANGER').setCustomId('Leave').setEmoji(`👋`).setLabel(`Leave`).setDisabled(!player || leave);
    const stopbutton = new MessageButton().setStyle('DANGER').setCustomId('Stop').setEmoji(`🏠`).setLabel(`Stop`).setDisabled(!player || !player.current);
    const skipbutton = new MessageButton().setStyle('PRIMARY').setCustomId('Skip').setEmoji(`⏭`).setLabel(`Skip`).setDisabled(!player || !player.current);
    const shufflebutton = new MessageButton().setStyle('PRIMARY').setCustomId('Shuffle').setEmoji('🔀').setLabel(`Shuffle`).setDisabled(!player || !player.current);
    const pausebutton = new MessageButton().setStyle('SECONDARY').setCustomId('Pause').setEmoji(player?.playing ? '⏸' : '▶️').setLabel(player?.playing ? `Pause` : `Resume`).setDisabled(!player || !player.current);
    const autoplaybutton = new MessageButton().setStyle(player?.autoplay ? 'SECONDARY' : 'SUCCESS').setCustomId('Autoplay').setEmoji('🔁').setLabel(`Autoplay`).setDisabled(!player || !player.current);
    const songbutton = new MessageButton().setStyle(player?.get("repeatMode") === "track" ? 'SECONDARY' : 'SUCCESS').setCustomId('Song').setEmoji(`🔁`).setLabel(`Song`).setDisabled(!player || !player.current);
    const queuebutton = new MessageButton().setStyle(player?.get("repeatMode") === "queue" ? 'SECONDARY' : 'SUCCESS').setCustomId('Queue').setEmoji(`🔂`).setLabel(`Queue`).setDisabled(!player || !player.current);
    const forwardbutton = new MessageButton().setStyle('PRIMARY').setCustomId('Forward').setEmoji('⏩').setLabel(`+10 Sec`).setDisabled(!player || !player.current);
    const rewindbutton = new MessageButton().setStyle('PRIMARY').setCustomId('Rewind').setEmoji('⏪').setLabel(`-10 Sec`).setDisabled(!player || !player.current);
    const lyricsbutton = new MessageButton().setStyle('PRIMARY').setCustomId('Lyrics').setEmoji('📝').setLabel(`Lyrics`).setDisabled(true);

    const components = [
        new MessageActionRow().addComponents([joinbutton, leavebutton]),
        new MessageActionRow().addComponents([skipbutton, stopbutton, pausebutton, autoplaybutton, shufflebutton]),
        new MessageActionRow().addComponents([songbutton, queuebutton, forwardbutton, rewindbutton, lyricsbutton]),
    ];

    return { embeds, components };
}

module.exports.generateQueueEmbed = generateQueueEmbed;
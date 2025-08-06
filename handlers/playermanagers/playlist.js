const { MessageEmbed } = require("discord.js");
const ee = require(`${process.cwd()}/botconfig/embed.json`);
const config = require(`${process.cwd()}/botconfig/config.json`);
const { format, delay, arrayMove } = require("../functions");

async function playlist(client, message, args, type, slashCommand = false) {
    const ls = await client.settings.get(`${message.guild.id}.language`);
    const search = args.join(" ");

    try {
        let player = client.tsumi.players.get(message.guild.id);
        const vc = message.member.voice.channel;
        const tc = message.channel;

        if (!vc) throw new Error("NOT IN A VC");

        const botMember = message.guild.me || (await message.guild.members.fetch(client.user.id));

        if (!player) {
            if (!vc.permissionsFor(botMember).has(["CONNECT", "SPEAK"])) {
                const missing = [];
                if (!vc.permissionsFor(botMember).has("CONNECT")) missing.push("Connect");
                if (!vc.permissionsFor(botMember).has("SPEAK")) missing.push("Speak");

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
            await player.stop();

            player.set("messageid", message.id);
            player.set("message", message);
            player.set("playerauthor", message.author?.id);
        }

        if (!player.connection) {
            player.set("message", message);
            player.set("playerauthor", message.author?.id);
            await player.connect();
            if (!slashCommand) {
                await message.react("863876115584385074").catch(() => null);
            }
            await player.stop();
        }

        let res;
        try {
            res = await client.tsumi.resolve({ query: search, requester: message.author });
        } catch (error) {
            console.error("Error resolving playlist:", error);
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle(eval(client.la[ls]["handlers"]["playermanagers"]["playlist"]["variable1"]))
                .setDescription(eval(client.la[ls]["handlers"]["playermanagers"]["playlist"]["variable2"]));
            if (slashCommand) {
                return slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null);
            } else {
                return message.reply({ embeds: [embed] }).catch(() => null);
            }
        }

        if (res.loadType === "LOAD_FAILED") {
            throw res.exception;
        } else if (res.loadType === "SEARCH_RESULT") {
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle("❌ Searches not supported")
                .setDescription("Searches are not supported with this command. Use `?play` or `?search`.");
            if (slashCommand) {
                return slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null);
            } else {
                return message.reply({ embeds: [embed] }).catch(() => null);
            }
        }

        if (!res.tracks || res.tracks.length === 0) {
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle(`❌ Error | Found nothing for: **\`${search.substring(0, 253)}...\`**`)
                .setDescription(eval(client.la[ls]["handlers"]["playermanagers"]["playlist"]["variable3"]));
            if (slashCommand) {
                return slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null);
            } else {
                return message.reply({ embeds: [embed] }).catch(() => null).then(msg => {
                    setTimeout(() => msg.delete().catch(() => null), 3000);
                });
            }
        }

        if (!player.connection) {
            player.set("message", message);
            player.set("playerauthor", message.author?.id);
            await player.connect();
            if (!slashCommand) {
                await message.react("863876115584385074").catch(() => null);
            }
            player.queue.add(res.tracks);
            await player.play();
            if (player.paused) await player.pause(false);
        } else if (!player.current) {
            player.queue.add(res.tracks);
            await player.play();
            if (player.paused) await player.pause(false);
        } else {
            player.queue.add(res.tracks);
        }

        const playlistembed = new MessageEmbed()
            .setDescription(eval(client.la[ls]["handlers"]["playermanagers"]["playlist"]["variable4"]))
            .setColor(ee.color)
            .setThumbnail(`https://img.youtube.com/vi/${res.tracks[0].identifier}/mqdefault.jpg`)
            .addField("⌛ Duration: ", `\`${format(res.playlist?.duration || res.tracks.reduce((acc, t) => acc + t.duration, 0))}\``, true)
            .addField("🔂 Queue length: ", `\`${player.queue.size} Songs\``, true)
            .addField(":notes: Music Dashboard :new: ", `[**Check out the :new: Music Dashboard!**](https://milrato.com/dashboard/queue/${player.guildId})\n> Live Music View, Live Music Requests, Live Music Control and more!`);

        if (slashCommand) {
            slashCommand.reply({ ephemeral: true, embeds: [playlistembed] }).catch(() => null);
        } else {
            message.reply({ embeds: [playlistembed] }).catch(() => null);
        }

        const musicsettings = await client.musicsettings.get(player.guildId);
        if (musicsettings.channel && musicsettings.channel.length > 5) {
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

    } catch (e) {
        console.error(e);
        const embed = new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`❌ Error | Found nothing for: **\`${search.substring(0, 253)}...\`**`);
        if (slashCommand) {
            slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null);
        } else {
            message.reply({ embeds: [embed] }).catch(() => null).then(msg => {
                setTimeout(() => msg.delete().catch(() => null), 3000);
            });
        }
    }
}

module.exports = playlist;

const { MessageEmbed } = require("discord.js");
const ee = require(`${process.cwd()}/botconfig/embed.json`);
const config = require(`${process.cwd()}/botconfig/config.json`);
const { format, delay, arrayMove, isValidURL } = require("../functions");

async function skiptrack(client, message, args, type, slashCommand = false) {
    let ls = await client.settings.get(message.guild.id + ".language").catch(() => "en");
    const search = args.join(" ");

    try {
        if (!client.tsumi || !client.tsumi.players) {
            console.error("Tsumi client or players manager not initialized.");
            return;
        }

        let player = client.tsumi.players.get(message.guild.id);
        const vc = message.member.voice.channel;
        const tc = message.channel;

        if (!player) {
            const botMember = message.guild.me;
            if (!botMember || !vc.permissionsFor(botMember)?.has(["CONNECT", "SPEAK"])) {
                const missing = [];
                if (!vc.permissionsFor(botMember)?.has("CONNECT")) missing.push("Connect");
                if (!vc.permissionsFor(botMember)?.has("SPEAK")) missing.push("Speak");
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

            player.set("message", message);
            player.set("messageid", message.id);
            player.set("playerauthor", message.author?.id);
        }

        if (!player.connected) {
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
            const source = type.includes(":") ? type.split(":")[1] : null;
            const queryOptions = {
                query: search,
                requester: message.author,
            };
            if (source === "youtube" || source === "soundcloud") {
                if (!isValidURL(search)) queryOptions.source = source;
            }
            res = await client.tsumi.resolve(queryOptions);
        } catch (error) {
            console.error("Error resolving track:", error);
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle(client.la?.[ls]?.handlers?.playermanagers?.skiptrack?.variable1 || "❌ Failed to Load")
                .setDescription(client.la?.[ls]?.handlers?.playermanagers?.skiptrack?.variable2 || "An error occurred while resolving the track.");
            if (slashCommand) {
                return slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null);
            } else {
                return message.reply({ embeds: [embed] }).catch(() => null);
            }
        }

        if (res.loadType === "LOAD_FAILED") throw res.exception;
        if (res.loadType === "PLAYLIST_LOADED") {
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle("❌ Playlists not supported")
                .setDescription("Playlists are not supported with this command. Use `?playlist` instead.");
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
                .setDescription(client.la?.[ls]?.handlers?.playermanagers?.skiptrack?.variable3 || "Try again with a different search term.");
            if (slashCommand) {
                return slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null);
            } else {
                return message.reply({ embeds: [embed] }).catch(() => null).then(msg => {
                    setTimeout(() => msg.delete().catch(() => null), 3000);
                });
            }
        }

        const track = res.tracks[0];

        if (!player.connected) {
            await player.connect();
            player.queue.add(track);
            await player.play();
            if (player.paused) await player.pause(false);
            if (!slashCommand) await message.react("863876115584385074").catch(() => null);
        } else if (!player.current) {
            player.queue.add(track);
            await player.play();
            if (player.paused) await player.pause(false);
        } else {
            player.queue.add(track);
            const queueArray = arrayMove([...player.queue.all()], player.queue.size - 1, 0);
            player.queue.clear();
            for (const t of queueArray) player.queue.add(t);
            await player.stop();
        }

        const musicsettings = await client.musicsettings.get(player.guildId).catch(() => null);
        if (musicsettings?.channel?.length > 5) {
            const guild = client.guilds.cache.get(player.guildId);
            const channel = guild?.channels.cache.get(musicsettings.channel) || await client.channels.fetch(musicsettings.channel).catch(() => null);
            if (channel) {
                const msg = await channel.messages.fetch(musicsettings.message).catch(() => null);
                if (msg) {
                    const data = await require("../erela_events/musicsystem").generateQueueEmbed(client, player.guildId);
                    await msg.edit(data).catch(() => null);
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

module.exports = skiptrack;

const { MessageEmbed } = require("discord.js");
const ee = require(`${process.cwd()}/botconfig/embed.json`);
const config = require(`${process.cwd()}/botconfig/config.json`);
const { format, delay, arrayMove } = require("../functions");

module.exports = playtop;

async function playtop(client, message, args, type, slashCommand = false) {
    let ls = await client.settings.get(message.guild.id + ".language");
    const search = args.join(" ");
    let player = client.tsumi.players.get(message.guild.id);
    const vc = message.member.voice.channel;
    const tc = message.channel;

    if (!vc) {
        return message.reply({
            embeds: [new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle("❌ You are not in a Voice Channel.")]
        }).then(msg => setTimeout(() => msg.delete().catch(() => null), 3000));
    }

    if (!player) {
        if (!vc.permissionsFor(message.guild.me).has(["CONNECT", "SPEAK"])) {
            const missing = [];
            if (!vc.permissionsFor(message.guild.me).has("CONNECT")) missing.push("Connect");
            if (!vc.permissionsFor(message.guild.me).has("SPEAK")) missing.push("Speak");
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle("❌ Missing Permissions")
                .setDescription(`I need the following permissions in your voice channel: \`${missing.join(", ")}\``);
            return slashCommand
                ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
                : message.reply({ embeds: [embed] }).catch(() => null);
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
        res = await client.tsumi.resolve({
            query: search,
            source: source,
            requester: message.author
        });
    } catch (error) {
        console.error("Error resolving track:", error);
        const embed = new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(client.la?.[ls]?.handlers?.playermanagers?.playtop?.variable1 || "An error occurred")
            .setDescription(client.la?.[ls]?.handlers?.playermanagers?.playtop?.variable1 || "Could not resolve the track.");
        return slashCommand
            ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
            : message.reply({ embeds: [embed] }).catch(() => null);
    }

    if (res.loadType === "LOAD_FAILED") {
        throw res.exception;
    }

    if (res.loadType === "PLAYLIST_LOADED") {
        await playlist_();
    } else {
        await song_();
    }

    async function song_() {
        const track = res.tracks[0];
        if (!track) {
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle(`❌ Error | Found nothing for: **\`${search.substring(0, 253)}...\`**`)
                .setDescription(client.la?.[ls]?.handlers?.playermanagers?.playtop?.variable1 || "Track not found.");
            return slashCommand
                ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
                : message.reply({ embeds: [embed] }).catch(() => null).then(msg => {
                    setTimeout(() => msg.delete().catch(() => null), 3000);
                });
        }

        if (!player.connected) {
            player.set("message", message);
            player.set("playerauthor", message.author?.id);
            await player.connect();
            if (!slashCommand) {
                await message.react("863876115584385074").catch(() => null);
            }
            player.queue.add(track);
            await player.play();
            if (player.paused) await player.pause(false);
        } else if (!player.current) {
            player.queue.add(track);
            await player.play();
            if (player.paused) await player.pause(false);
        } else {
            const oldQueue = [...player.queue.all()];
            player.queue.clear();
            player.queue.add(track);
            for (const t of oldQueue) {
                player.queue.add(t);
            }
        }

        const playembed = new MessageEmbed()
            .setDescription(client.la?.[ls]?.handlers?.playermanagers?.playtop?.variable2 || `🎶 Now playing: ${track.title}`)
            .setColor(ee.color)
            .setThumbnail(`https://img.youtube.com/vi/${track.identifier}/mqdefault.jpg`)
            .addFields(
                { name: "⌛ Duration: ", value: `\`${track.isStream ? "LIVE STREAM" : format(track.duration)}\``, inline: true },
                { name: "💯 Song By: ", value: `\`${track.author}\``, inline: true },
                { name: "🔂 Queue length: ", value: `\`${player.queue.size} Songs\``, inline: true },
                { name: ":notes: Music Dashboard :new: ", value: `[**Check it out**](https://milrato.com/dashboard/queue/${player.guildId})` }
            );

        slashCommand
            ? slashCommand.reply({ ephemeral: true, embeds: [playembed] }).catch(() => null)
            : message.reply({ embeds: [playembed] }).catch(() => null);

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
    }

    async function playlist_() {
        if (!res.tracks || res.tracks.length === 0) {
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle(`❌ Error | Found nothing for: **\`${search.substring(0, 253)}...\`**`)
                .setDescription(client.la?.[ls]?.handlers?.playermanagers?.playtop?.variable3 || "Playlist empty or not found.");
            return slashCommand
                ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
                : message.reply({ embeds: [embed] }).catch(() => null).then(msg => {
                    setTimeout(() => msg.delete().catch(() => null), 3000);
                });
        }

        if (!player.connected) {
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
            const oldQueue = [...player.queue.all()];
            player.queue.clear();
            player.queue.add(res.tracks);
            for (const t of oldQueue) {
                player.queue.add(t);
            }
        }

        let time = 0;
        if (player.current) {
            time += player.current.duration - player.position;
        }
        for (const track of player.queue.all()) {
            time += track.duration;
        }

        const playlistembed = new MessageEmbed()
            .setAuthor("Playlist added to Queue", message.author.displayAvatarURL({ dynamic: true }), "https://milrato.eu")
            .setColor(ee.color)
            .setTitle(client.la?.[ls]?.handlers?.playermanagers?.playtop?.variable4 || "Playlist Queued")
            .setThumbnail(`https://img.youtube.com/vi/${res.tracks[0].identifier}/mqdefault.jpg`)
            .addFields(
                {
                    name: client.la?.[ls]?.handlers?.playermanagers?.playtop?.variablex_5 || "Playlist Name",
                    value: client.la?.[ls]?.handlers?.playermanagers?.playtop?.variable5 || "Playlist details"
                },
                {
                    name: "Position in queue",
                    value: `${player.queue.size - res.tracks.length + 1 === 0 ? "NOW" : player.queue.size - res.tracks.length + 1}`,
                    inline: true
                },
                {
                    name: "Enqueued",
                    value: `\`${res.tracks.length}\``,
                    inline: true
                }
            );

        if (message.guild.me.permissionsIn(message.channel).has("EMBED_LINKS")) {
            slashCommand
                ? slashCommand.reply({ ephemeral: true, embeds: [playlistembed] }).catch(() => null)
                : message.reply({ embeds: [playlistembed] }).catch(() => null);
        } else {
            const content = client.la?.[ls]?.handlers?.playermanagers?.playtop?.variable6 || "Playlist added.";
            slashCommand
                ? slashCommand.reply({ ephemeral: true, content }).catch(() => null)
                : message.reply({ content }).catch(() => null);
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
    }
}

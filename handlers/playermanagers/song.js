const { MessageEmbed } = require("discord.js");
const ee = require(`${process.cwd()}/botconfig/embed.json`);
const config = require(`${process.cwd()}/botconfig/config.json`);
const { format, delay, arrayMove, isValidURL } = require("../functions");

async function song(client, message, args, type, slashCommand = false, extras = false) {
    let ls = await client.settings.get(`${message.guild.id}.language`);
    const search = args.join(" ");

    try {
        let player = client.tsumi.players.get(message.guild.id);
        const vc = message.member.voice.channel;
        const tc = message.channel;

        if (!vc) throw new Error("NOT IN A VC");

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
            if (!slashCommand) await message.react("✅").catch(() => null);
            await player.stop();
        }

        let res;
        try {
            const source = type.includes(":") ? type.split(":")[1] : null;
            res = await client.tsumi.resolve({
                query: isValidURL(search) ? search : { query: search, source },
                requester: message.author,
            });
        } catch (error) {
            console.error("Error resolving track:", error);
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle(client.la[ls]?.handlers?.playermanagers?.song?.variable1 || "❌ Failed to resolve track")
                .setDescription(client.la[ls]?.handlers?.playermanagers?.song?.variable2 || "Please try again later.");

            return slashCommand
                ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
                : message.reply({ embeds: [embed] }).catch(() => null);
        }

        if (res.loadType === "LOAD_FAILED") throw res.exception;

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
                    .setDescription(client.la[ls]?.handlers?.playermanagers?.song?.variable3 || "Try another song.");
                return slashCommand
                    ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
                    : message.reply({ embeds: [embed] }).then(msg => setTimeout(() => msg.delete().catch(() => null), 3000));
            }

            const shouldPlay = !player.current;

            player.queue.add(track);
            if (shouldPlay) {
                await player.play();
                if (player.paused) await player.pause(false);
            }

            if (!shouldPlay) {
                const playembed = new MessageEmbed()
                    .setDescription(client.la[ls]?.handlers?.playermanagers?.song?.variable4 || `Added: **${track.title}**`)
                    .setColor(ee.color)
                    .setThumbnail(`https://img.youtube.com/vi/${track.identifier}/mqdefault.jpg`)
                    .addField("⌛ Duration", `\`${track.isStream ? "LIVE STREAM" : format(track.duration)}\``, true)
                    .addField("💯 Song By", `\`${track.author}\``, true)
                    .addField("🔂 Queue length", `\`${player.queue.size} Songs\``, true)
                    .addField(":notes: Music Dashboard", `[**Open Dashboard**](https://milrato.com/dashboard/queue/${player.guildId})`)
                    .setFooter(`Requested by: ${track.requester.tag}`, track.requester.displayAvatarURL({ dynamic: true }));

                return slashCommand
                    ? slashCommand.reply({ ephemeral: true, embeds: [playembed] }).catch(() => null)
                    : message.reply({ embeds: [playembed] }).catch(() => null);
            }

            updateMusicSystem();
        }

        async function playlist_() {
            if (!res.tracks || res.tracks.length === 0) {
                const embed = new MessageEmbed()
                    .setColor(ee.wrongcolor)
                    .setTitle(`❌ Error | Found nothing for: **\`${search.substring(0, 253)}...\`**`)
                    .setDescription(client.la[ls]?.handlers?.playermanagers?.song?.variable5 || "No tracks found.");
                return slashCommand
                    ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
                    : message.reply({ embeds: [embed] }).then(msg => setTimeout(() => msg.delete().catch(() => null), 3000));
            }

            const firstTrack = res.tracks[0];

            const shouldPlay = !player.current;

            if (extras === "songoftheday") {
                player.queue.add(res.tracks.slice(1));
                player.queue.add(firstTrack);
            } else {
                player.queue.add(res.tracks);
            }

            if (shouldPlay) {
                await player.play();
                if (player.paused) await player.pause(false);
            }

            const playlistembed = new MessageEmbed()
                .setTitle(`Added Playlist 🩸 \`${res.playlist.name.substring(0, 253)}\``)
                .setURL(res.playlist.uri)
                .setColor(ee.color)
                .setThumbnail(`https://img.youtube.com/vi/${res.tracks[0].identifier}/mqdefault.jpg`)
                .addField("⌛ Duration", `\`${format(res.playlist.duration)}\``, true)
                .addField("🔂 Queue length", `\`${player.queue.size} Songs\``, true)
                .addField(":notes: Music Dashboard", `[**Open Dashboard**](https://milrato.com/dashboard/queue/${player.guildId})`)
                .setFooter(`Requested by: ${message.author.tag}`, message.author.displayAvatarURL({ dynamic: true }));

            return slashCommand
                ? slashCommand.reply({ ephemeral: true, embeds: [playlistembed] }).catch(() => null)
                : message.reply({ embeds: [playlistembed] }).catch(() => null);

            updateMusicSystem();
        }

        async function updateMusicSystem() {
            const musicsettings = await client.musicsettings.get(player.guildId);
            if (!musicsettings?.channel || musicsettings.channel.length < 5) return;

            const guild = client.guilds.cache.get(player.guildId);
            const channel = guild?.channels.cache.get(musicsettings.channel) || await client.channels.fetch(musicsettings.channel).catch(() => null);
            if (!channel) return;

            const msg = await channel.messages.fetch(musicsettings.message).catch(() => null);
            if (!msg) return;

            const data = await require("../erela_events/musicsystem").generateQueueEmbed(client, player.guildId);
            await msg.edit(data).catch(() => null);
        }

    } catch (e) {
        console.error(e);
        const fallbackEmbed = new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(client.la[ls]?.handlers?.playermanagers?.song?.variable1 || "❌ Unexpected Error")
            .setDescription(client.la[ls]?.handlers?.playermanagers?.song?.variable2 || "Try again later.");

        return slashCommand
            ? slashCommand.reply({ ephemeral: true, embeds: [fallbackEmbed] }).catch(() => null)
            : message.reply({ embeds: [fallbackEmbed] }).catch(() => null);
    }
}

module.exports = song;

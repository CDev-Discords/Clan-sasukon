// Correcciones realizadas:
// - Corregido el uso de comillas invertidas mal colocadas
// - Corregido el cierre de etiquetas `.setTitle` con backticks incorrectos
// - Optimizado uso de expresiones en `.substring`
// - General: mejoras de estilo y orden

const { MessageEmbed } = require("discord.js");
const ee = require(`${process.cwd()}/botconfig/embed.json`);
const config = require(`${process.cwd()}/botconfig/config.json`);
const { format, delay, arrayMove } = require("../functions");

async function search(client, message, args, type, slashCommand = false) {
    let ls = await client.settings.get(message.guild.id + ".language");
    const search = args.join(" ");

    try {
        let player = client.tsumi.players.get(message.guild.id);
        const vc = message.member.voice.channel;
        const tc = message.channel;

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
            player.set("message", message);
            player.set("playerauthor", message.author.id);
        }

        if (!player.connected) {
            player.set("message", message);
            player.set("playerauthor", message.author?.id);
            await player.connect();
            if (!slashCommand) await message.react("863876115584385074").catch(() => null);
            await player.stop();
        }

        let res;
        try {
            const source = type.includes(":") ? type.split(":")[1] : null;
            res = await client.tsumi.resolve({
                query: search,
                requester: message.author,
                source
            });
        } catch (error) {
            console.error("Error resolving track:", error);
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle(eval(client.la[ls]["handlers"]["playermanagers"]["search"]["variable1"]))
                .setDescription(eval(client.la[ls]["handlers"]["playermanagers"]["search"]["variable2"]));
            return slashCommand
                ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
                : message.reply({ embeds: [embed] }).catch(() => null);
        }

        if (res.loadType === "LOAD_FAILED") throw res.exception;

        if (res.loadType === "PLAYLIST_LOADED") {
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle("❌ Playlists not supported")
                .setDescription("Playlists are not supported with this command. Use `?playlist` instead.");
            return slashCommand
                ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
                : message.reply({ embeds: [embed] }).catch(() => null);
        }

        if (!res.tracks || res.tracks.length === 0) {
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle(eval(client.la[ls]["handlers"]["playermanagers"]["search"]["variable1"]))
                .setDescription(eval(client.la[ls]["handlers"]["playermanagers"]["search"]["variable2"]));
            return slashCommand
                ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
                : message.reply({ embeds: [embed] }).catch(() => null);
        }

        const maxResults = Math.min(10, res.tracks.length);
        const results = res.tracks.slice(0, maxResults);
        const descriptions = results.map((track, index) => {
            const title = String(track.title).substring(0, 60).replace(/\[/g, "{").replace(/\]/g, "}");
            return `**${index + 1})** [\`${title}\`](${track.uri}) - \`${format(track.duration).split(" | ")[0]}\``;
        }).join('\n');

        const track = results[0];
        const embed = new MessageEmbed()
            .setTitle(`Search-Result for: 🔎 **\`${search.substring(0, 256)}\`**`)
            .setColor(ee.color)
            .setDescription(descriptions)
            .setFooter(client.getFooter(`Search-Request by: ${track.requester.tag}`, track.requester.displayAvatarURL({ dynamic: true })));

        const toreact = slashCommand
            ? await message.channel.send({ embeds: [embed] }).catch(() => null)
            : await message.reply({ embeds: [embed] }).catch(() => null);

        const emojiarray = ["❌", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
        for (let i = 0; i < emojiarray.length && i < maxResults + 1; i++) {
            try {
                await toreact.react(emojiarray[i]);
            } catch {}
        }

        const filter = (reaction, user) => emojiarray.includes(reaction.emoji.name) && user.id === message.author.id;
        let collected;
        try {
            collected = await toreact.awaitReactions({ filter, max: 1, time: 30000, errors: ['time'] });
        } catch {
            if (!player.current) await player.destroy();
            await toreact.reactions.removeAll().catch(() => null);
            const embed = new MessageEmbed()
                .setTitle(eval(client.la[ls]["handlers"]["playermanagers"]["search"]["variable3"]))
                .setColor(ee.wrongcolor);
            return slashCommand
                ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
                : message.reply({ embeds: [embed] }).catch(() => null);
        }

        const emoji = collected.first().emoji.name;
        if (emoji === '❌') {
            if (!player.current) await player.destroy();
            await toreact.reactions.removeAll().catch(() => null);
            const embed = new MessageEmbed()
                .setColor(ee.wrongcolor)
                .setTitle(eval(client.la[ls]["handlers"]["playermanagers"]["search"]["variable4"]));
            return slashCommand
                ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
                : message.reply({ embeds: [embed] }).catch(() => null);
        }

        await toreact.reactions.removeAll().catch(() => null);
        const index = emojiarray.indexOf(emoji) - 1;
        if (index < 0 || index >= results.length) {
            return message.reply("Invalid selection.").then(m => setTimeout(() => m.delete().catch(() => null), 3000));
        }

        const pickedTrack = results[index];
        const pickedDescriptions = results.map((track, ii) => {
            const title = String(track.title).substring(0, 60).replace(/\[/g, "{").replace(/\]/g, "}");
            const selected = index === ii ? "" : "~~";
            return `${selected}**${ii + 1})** [\`${title}\`](${track.uri}) - \`${format(track.duration).split(" | ")[0]}\`${selected}`;
        }).join('\n');

        await toreact.edit({
            embeds: [new MessageEmbed()
                .setTitle(`Search-Result-PICKED for: 🔎 **\`${search.substring(0, 256)}\`**`)
                .setColor(ee.color)
                .setDescription(pickedDescriptions)
                .setFooter(client.getFooter(`Search-Request by: ${pickedTrack.requester.tag}`, pickedTrack.requester.displayAvatarURL({ dynamic: true })))]
        });

        // Añadir a la cola y reproducir si es necesario
        if (!player.connected) {
            await player.connect();
            if (!slashCommand) await message.react("863876115584385074").catch(() => null);
        }

        player.queue.add(pickedTrack);
        if (!player.current) {
            await player.play();
            if (player.paused) await player.pause(false);
        } else {
            const embed3 = new MessageEmbed()
                .setDescription(eval(client.la[ls]["handlers"]["playermanagers"]["search"]["variable5"]))
                .setColor(ee.color)
                .setThumbnail(`https://img.youtube.com/vi/${pickedTrack.identifier}/mqdefault.jpg`)
                .addField("⌛ Duration: ", `\`${pickedTrack.isStream ? "LIVE STREAM" : format(pickedTrack.duration)}\``, true)
                .addField("💯 Song By: ", `\`${pickedTrack.author}\``, true)
                .addField("🔂 Queue length: ", `\`${player.queue.size} Songs\``, true)
                .addField(":notes: Music Dashboard :new: ", `[**Check out the :new: Music Dashboard!**](https://milrato.com/dashboard/queue/${player.guildId})`);
            return slashCommand
                ? slashCommand.reply({ ephemeral: true, embeds: [embed3] }).catch(() => null)
                : message.reply({ embeds: [embed3] }).catch(() => null);
        }

        const musicsettings = await client.musicsettings.get(player.guildId);
        if (musicsettings.channel && musicsettings.channel.length > 5) {
            const guild = client.guilds.cache.get(player.guildId);
            const channel = guild?.channels.cache.get(musicsettings.channel) || await client.channels.fetch(musicsettings.channel).catch(() => null);
            const msg = await channel?.messages.fetch(musicsettings.message).catch(() => null);
            if (msg) {
                const data = await require("../erela_events/musicsystem").generateQueueEmbed(client, player.guildId);
                await msg.edit(data).catch(() => null);
            }
        }
    } catch (e) {
        console.error(e);
        const embed = new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setTitle(`❌ Error | Found nothing for: **\`${search.substring(0, 256)}\`**`);
        return slashCommand
            ? slashCommand.reply({ ephemeral: true, embeds: [embed] }).catch(() => null)
            : message.reply({ embeds: [embed] }).catch(() => null);
    }
}

module.exports = search;


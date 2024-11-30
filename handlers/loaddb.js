const { remoteCacheClient } = require("remote-sqlite-database");
const ee = require("../botconfig/embed.json")
const { dbEnsure, delay } = require("./functions")
module.exports = async (client, enableGiveaways = true) => {
    return new Promise(async (res) => {
        let dateNow = Date.now();
        console.log(`${String("[x] :: ".magenta)}Now loading the Database ...`.brightGreen)

             client.notes = loadDB("CaletaDB", "gamer0706", "localhost", 4040)

            client.economy = loadDB("CaletaDB", "gamer0706", "localhost", 4041)

            client.invitesdb = loadDB("CaletaDB", "gamer0706", "localhost", 4042)

            client.tiktok = loadDB("CaletaDB", "gamer0706", "localhost", 4043)

            client.youtube_log = loadDB("CaletaDB", "gamer0706", "localhost", 4044)

            client.mutes = loadDB("CaletaDB", "gamer0706", "localhost", 4045)

            client.snipes = loadDB("CaletaDB", "gamer0706", "localhost", 4046)

            client.stats = loadDB("CaletaDB", "gamer0706", "localhost", 4047)
      
            client.afkDB = loadDB("CaletaDB", "gamer0706", "localhost", 4048)

            client.musicsettings = loadDB("CaletaDB", "gamer0706", "localhost", 4049)

            client.settings = loadDB("CaletaDB", "gamer0706", "localhost", 4050)

            client.jointocreatemap = loadDB("CaletaDB", "gamer0706", "localhost", 4051)

            client.joinvc = loadDB("CaletaDB", "gamer0706", "localhost", 4052)

            client.setups = loadDB("CaletaDB", "gamer0706", "localhost", 4053)

            client.queuesaves = loadDB("CaletaDB", "gamer0706", "localhost", 4054)

            client.modActions = loadDB("CaletaDB", "gamer0706", "localhost", 4055)

            client.userProfiles = loadDB("CaletaDB", "gamer0706", "localhost", 4056)

            client.jtcsettings = loadDB("CaletaDB", "gamer0706", "localhost", 4057)

            client.roster = loadDB("CaletaDB", "gamer0706", "localhost", 4058)

            client.autosupport = loadDB("CaletaDB", "gamer0706", "localhost", 4059)

            client.menuticket = loadDB("CaletaDB", "gamer0706", "localhost", 4060)

            client.menuapply = loadDB("CaletaDB", "gamer0706", "localhost", 4061)

            client.apply = loadDB("CaletaDB", "gamer0706", "localhost", 4062)

            client.modal = loadDB("CaletaDB", "gamer0706", "localhost", 4063)

            client.points = loadDB("CaletaDB", "gamer0706", "localhost", 4064)

            client.voicepoints = loadDB("CaletaDB", "gamer0706", "localhost", 4065)

            client.reactionrole = loadDB("CaletaDB", "gamer0706", "localhost", 4066)

            client.social_log = loadDB("CaletaDB", "gamer0706", "localhost", 4067)

            client.blacklist = loadDB("CaletaDB", "gamer0706", "localhost", 4068)

            client.customcommands = loadDB("CaletaDB", "gamer0706", "localhost", 4069)

            client.keyword = loadDB("CaletaDB", "gamer0706", "localhost", 4070)

            client.premium = loadDB("CaletaDB", "gamer0706", "localhost", 4071)

            client.epicgamesDB = loadDB("CaletaDB", "gamer0706", "localhost", 4072)

            client.Anti_Nuke_System = loadDB("CaletaDB", "gamer0706", "localhost", 4073)

            client.backupDB = loadDB("CaletaDB", "gamer0706", "localhost", 4074)

            client.giveawayDB = loadDB("CaletaDB", "gamer0706", "localhost", 4075)
//Inicia la base de datos como "cliente"
      
function loadDB(username, password, host, port) {
    client.database = new remoteCacheClient({
        username,
        password,
        host,
        port,
        tls: true,
        keyPathing: true
    })
    return client.database;
}
      
            const DbPing = await client.database.ping();
            
            console.log(`[x] :: `.magenta + `LOADED THE DATABASE after: `.brightGreen + `${Date.now() - dateNow}ms\n       Database got a ${DbPing}ms ping`.green)
            
            await client.stats.ensure("global", {
                commands: 0,
                songs: 0
            })
            await client.afkDB.ensure("REMIND", {
                REMIND: []
            });
            await client.mutes.ensure("MUTES", {
                MUTES: []
            })
            let obj = {};
            for (let i = 0; i <= 100; i++) {
                obj[`tickets${i != 0 ? i : ""}`] = [];
                obj[`menutickets${i != 0 ? i : ""}`] = [];
                obj[`applytickets${i != 0 ? i : ""}`] = [];
            }

            await client.setups.ensure("TICKETS", obj);
            if(enableGiveaways) manageGiveaways()
            res(true);
        });

        var errortrys = 0;
        client.database.on("error", async () => {
            errortrys++;
            if(errortrys == 5) return 
            await delay(2_000);
            await client.database.connect();
        })

        var closetrys = 0;
        client.database.on("close", async () => {
            closetrys++;
            if(closetrys == 5) return 
            await delay(2_000);
            await client.database.connect();
        })

        var disconnecttrys = 0;
        client.database.on("disconnected", async () => {
            disconnecttrys++;
            if(disconnecttrys == 5) return 
            await delay(2_000);
            await client.database.connect();
        })

        // top-level awaits
        await client.database.connect();
        async function manageGiveaways() {
            const { MessageEmbed } = require("discord.js");
            const { GiveawaysManager } = require('discord-giveaways');
            const CustomGiveawayManager = class extends GiveawaysManager {
                async getAllGiveaways() {
                    return await client.giveawayDB.all(true);
                }
                async saveGiveaway(messageId, giveawayData) {
                    await client.giveawayDB.set(messageId, giveawayData);
                    return true;
                }
                async editGiveaway(messageId, giveawayData) {
                    await client.giveawayDB.set(messageId, giveawayData);
                    return true;
                }
                async deleteGiveaway(messageId) {
                    await client.giveawayDB.delete(messageId);
                    return true;
                }
                /*async refreshStorage() {
                    // This should make all shards refresh their cache with the updated database
                    return client.cluster.broadcastEval(`this.giveawaysManager.getAllGiveaways()`);
                }*/
            };

            const manager = new CustomGiveawayManager(client, {
                default: {
                    botsCanWin: false,
                    embedColor: ee.color,
                    embedColorEnd: ee.wrongcolor,
                    reaction: '🎉'
                }
            });
            // We now have a giveawaysManager property to access the manager everywhere!
            client.giveawaysManager = manager;
            client.giveawaysManager.on("giveawayReactionAdded", async (giveaway, member, reaction) => {
                try {
                    const isNotAllowed = await giveaway.exemptMembers(member);
                    if (isNotAllowed) {
                        member.send({
                            embeds: [
                                new MessageEmbed()
                                    .setColor(ee.wrongcolor)
                                    .setThumbnail(member.guild.iconURL({ dynamic: true }))
                                    .setAuthor(client.getAuthor(`Missing the Requirements`, `https://cdn.discordapp.com/emojis/906917501986820136.png?size=128`))
                                    .setDescription(`> **Your are not fullfilling the Requirements for [this Giveaway](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}), please make sure to fullfill them!.**\n\n> Go back to the Channel: <#${giveaway.channelId}>`)
                                    .setFooter(client.getFooter(member.guild.name, member.guild.iconURL({ dynamic: true })))
                            ]
                        }).catch(() => { });
                        reaction.users.remove(member.user).catch(() => { });
                        return;
                    }
                    let BonusEntries = await giveaway.checkBonusEntries(member.user).catch(() => { }) || 0;
                    if (!BonusEntries) BonusEntries = 0;
                    member.send({
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.color)
                                .setThumbnail(member.guild.iconURL({ dynamic: true }))
                                .setAuthor(client.getAuthor(`Giveaway Entry Confirmed`, `https://cdn.discordapp.com/emojis/833101995723194437.gif?size=128`))
                                .setDescription(`> **Your entry for [this Giveaway](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}) has been confirmed.**\n\n**Prize:**\n> ${giveaway.prize}\n\n**Winnersamount:**\n> \`${giveaway.winnerCount}\`\n\n**Your Bonus Entries**\n> \`${BonusEntries}\`\n\n> Go back to the Channel: <#${giveaway.channelId}>`)
                                .setFooter(client.getFooter(member.guild.name, member.guild.iconURL({ dynamic: true })))
                        ]
                    }).catch(() => { });
                    console.log(`${member.user.tag} entered giveaway #${giveaway.messageId} (${reaction.emoji?.name})`);
                } catch (e) {
                    console.error(e);
                }
            });
            client.giveawaysManager.on("giveawayReactionRemoved", async (giveaway, member, reaction) => {
                try {
                    member.send({
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.wrongcolor)
                                .setThumbnail(member.guild.iconURL({ dynamic: true }))
                                .setAuthor(client.getAuthor(`Giveaway Left!`, `https://cdn.discordapp.com/emojis/833101995723194437.gif?size=128`))
                                .setDescription(`> **You left [this Giveaway](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}) and aren't participating anymore.**\n\n> Go back to the Channel: <#${giveaway.channelId}>`)
                                .setFooter(client.getFooter(member.guild.name, member.guild.iconURL({ dynamic: true })))
                        ]
                    }).catch(() => { });
                    console.log(`${member.user.tag} left giveaway #${giveaway.messageId} (${reaction.emoji?.name})`);
                } catch (e) {
                    console.error(e);
                }
            });
            client.giveawaysManager.on("giveawayEnded", async (giveaway, winners) => {
                for await (const winner of winners) {
                    winner.send({
                        contents: `Congratulations, **${winner.user.tag}**! You won the Giveaway.`,
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.color)
                                .setThumbnail(winner.guild.iconURL({ dynamic: true }))
                                .setAuthor(client.getAuthor(`Giveaway Won!`, `https://cdn.discordapp.com/emojis/833101995723194437.gif?size=128`))
                                .setDescription(`> **You won [this Giveaway](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}), congrats!**\n\n> Go to the Channel: <#${giveaway.channelId}>\n\n**Prize:**\n> ${giveaway.prize}`)
                                .setFooter(client.getFooter(winner.guild.name, winner.guild.iconURL({ dynamic: true })))
                        ]
                    }).catch(() => { });
                }
                console.log(`Giveaway #${giveaway.messageId} ended! Winners: ${winners.map((member) => member.user.username).join(', ')}`);
            });
            client.giveawaysManager.on('giveawayRerolled', async (giveaway, winners) => {
                for await (const winner of winners) {
                    winner.send({
                        contents: `Congratulations, **${winner.user.tag}**! You won the Giveaway through a \`reroll\`.`,
                        embeds: [
                            new MessageEmbed()
                                .setColor(ee.wrongcolor)
                                .setThumbnail(winner.guild.iconURL({ dynamic: true }))
                                .setAuthor(client.getAuthor(`Giveaway Won!`, `https://cdn.discordapp.com/emojis/833101995723194437.gif?size=128`))
                                .setDescription(`> **You won [this Giveaway](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}), congrats!**\n\n> Go to the Channel: <#${giveaway.channelId}>\n\n**Prize:**\n> ${giveaway.prize}`)
                                .setFooter(client.getFooter(winner.guild.name, winner.guild.iconURL({ dynamic: true })))
                        ]
                    }).catch(() => { });
                }
            })
        }
}
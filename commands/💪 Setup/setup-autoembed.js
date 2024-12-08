var { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js'); // Corrected imports
var config = require('../../botconfig/config.json');
var ee = require('../../botconfig/embed.json');
var emoji = require('../../botconfig/emojis.json');
var { dbEnsure, edit_msg, dbRemove } = require('../../handlers/functions');

module.exports = {
  name: "setup-autoembed",
  category: "💪 Setup",
  aliases: ["setupautoembed", "autoembed-setup"],
  cooldown: 5,
  usage: "setup-autoembed  --> Follow the Steps",
  description: "Define a Channel where every message is replaced with an EMBED or disable this feature",
  memberpermissions: ["ADMINISTRATOR"],
  type: "system",
  run: async (client, message, args, cmduser, text, prefix, player, es, ls, GuildSettings) => {
    try {
      first_layer();

      async function first_layer() {
        let menuoptions = [
          {
            value: "Add a Channel",
            description: "Add a auto sending Embed Setup Channel",
            emoji: "✅"
          },
          {
            value: "Remove a Channel",
            description: "Remove a Channel from the Setup",
            emoji: "❌"
          },
          {
            value: "Show all Channels",
            description: "Show all setup Channels!",
            emoji: "📑"
          },
          {
            value: "Cancel",
            description: "Cancel and stop the Auto-Nsfw-Setup!",
            emoji: "🙄"
          }
        ];

        let Selection = new MessageSelectMenu()
          .setCustomId('MenuSelection')
          .setMaxValues(1)
          .setMinValues(1)
          .setPlaceholder('Click me to setup the Automated Embed System!')
          .addOptions(menuoptions.map(option => {
            let Obj = {
              label: option.label ? option.label.substring(0, 50) : option.value.substring(0, 50),
              value: option.value.substring(0, 50),
              description: option.description.substring(0, 50),
            }
            if (option.emoji) Obj.emoji = option.emoji;
            return Obj;
          }));

        let MenuEmbed = new MessageEmbed()
          .setColor(es.color)
          .setAuthor('Auto Embed Setup', 'https://cdn.discordapp.com/emojis/850829013438300221.png?size=96', 'https://discord.gg/milrato')
          .setDescription("Please choose an option below to manage autoembed settings.");

        let used1 = false;
        let menumsg = await message.reply({embeds: [MenuEmbed], components: [new MessageActionRow().addComponents(Selection)]});

        const collector = menumsg.createMessageComponentCollector({
          filter: i => i?.isSelectMenu() && i?.message.author?.id == client.user.id && i?.user.id === cmduser.id,
          time: 90000
        });

        collector.on('collect', async menu => {
          if (menu?.user.id === cmduser.id) {
            collector.stop();
            let menuoptiondata = menuoptions.find(v => v.value == menu?.values[0]);
            if (menu?.values[0] == "Cancel") {
              // Disable the select menu
              await menu.update({embeds: [new MessageEmbed().setColor(es.color).setTitle("Cancelled Setup").setDescription("The setup has been cancelled. You will not be able to interact further.")], components: []});
              return; // Stop further execution
            }
            client.disableComponentMessage(menu);
            used1 = true;
            handle_the_picks(menu?.values[0], menuoptiondata);
          } else {
            menu?.reply({content: `❌ Only the user who initiated the command can interact!`, ephemeral: true});
          }
        });

        collector.on('end', collected => {
          menumsg.edit({embeds: [menumsg.embeds[0].setDescription(`Selected: ${collected && collected.first() && collected.first().values ? collected.first().values[0] : "Nothing"}`)], components: [], content: ""});
        });
      }

      async function handle_the_picks(optionhandletype, menuoptiondata) {
        switch (optionhandletype) {
          case "Add a Channel": {
            let tempmsg = await message.reply({embeds: [new MessageEmbed()
              .setTitle("Please mention a channel to add.")
              .setColor(es.color)
              .setDescription("You can mention a channel or provide the channel ID.")
              .setFooter(client.getFooter(es))]}); 
            
            await tempmsg.channel.awaitMessages({filter: m => m.author.id === message.author?.id, max: 1, time: 90000, errors: ["time"]})
              .then(async collected => {
                var message = collected.first();
                var channel = message.mentions.channels.first() || message.guild.channels.cache.get(message.content.trim().split(" ")[0]);
                if (channel) {
                  try {
                    var a = await client.settings.get(message.guild.id + ".autoembed") || [];
                    if (a.length >= 100) {
                      return message.reply({embeds: [new MessageEmbed().setColor(es.wrongcolor).setTitle("❌ Max Limit Reached").setDescription("You can only add up to 100 channels.")], ephemeral: true});
                    }
                    if (a.includes(channel.id)) {
                      return message.reply({embeds: [new MessageEmbed().setColor(es.wrongcolor).setTitle("❌ Already Added").setDescription("This channel is already set for auto-embed.")], ephemeral: true});
                    }
                    await client.settings.push(message.guild.id + ".autoembed", channel.id);
                    return message.reply({embeds: [new MessageEmbed().setColor(es.color).setTitle("✅ Channel Added").setDescription(`Successfully added the channel ${channel}`)]});
                  } catch (e) {
                    return message.reply({embeds: [new MessageEmbed().setColor(es.wrongcolor).setTitle("❌ Error").setDescription("An error occurred while adding the channel.")]});
                  }
                } else {
                  return message.reply({embeds: [new MessageEmbed().setColor(es.wrongcolor).setTitle("❌ Invalid Channel").setDescription("You didn't mention a valid channel.")], ephemeral: true});
                }
              })
              .catch(e => {
                console.error(e);
                return message.reply({embeds: [new MessageEmbed().setColor(es.wrongcolor).setTitle("❌ Timeout").setDescription("The operation was cancelled due to timeout.")], ephemeral: true});
              });
          }
          break;

          case "Remove a Channel": {
            let a = await client.settings.get(message.guild.id + ".autoembed") || [];
            if (a.length === 0) {
              return message.reply({embeds: [new MessageEmbed().setColor(es.wrongcolor).setTitle("❌ No Channels").setDescription("No channels are set for auto-embed.")]});
            }

            let channelList = a.map((id, index) => `${index + 1}. <#${id}>`).join("\n");

            let tempmsg = await message.reply({embeds: [new MessageEmbed()
              .setTitle("Please select a channel number to delete.")
              .setColor(es.color)
              .setDescription("Here is the list of channels set for auto-embed:\n" + channelList)
              .setFooter(client.getFooter(es))]}); 
            
            await tempmsg.channel.awaitMessages({
              filter: m => m.author.id === message.author.id && !isNaN(m.content) && parseInt(m.content) <= a.length,
              max: 1,
              time: 90000,
              errors: ["time"]
            }).then(async collected => {
              var message = collected.first();
              var number = parseInt(message.content.trim());

              if (isNaN(number) || number <= 0 || number > a.length) {
                return message.reply({embeds: [new MessageEmbed().setColor(es.wrongcolor).setTitle("❌ Invalid Number").setDescription("The number you provided is invalid or out of range.")], ephemeral: true});
              }

              var channelIdToRemove = a[number - 1];
              await dbRemove(client.settings, message.guild.id + ".autoembed", channelIdToRemove);

              return message.reply({embeds: [new MessageEmbed().setColor(es.color).setTitle("✅ Channel Removed").setDescription(`Successfully removed channel <#${channelIdToRemove}>`)]});
            }).catch(e => {
              console.error(e);
              return message.reply({embeds: [new MessageEmbed().setColor(es.wrongcolor).setTitle("❌ Timeout").setDescription("The operation was cancelled due to timeout.")], ephemeral: true});
            });
          }
          break;

          case "Show all Channels": {
            let a = await client.settings.get(message.guild.id + ".autoembed") || [];
            if (a.length === 0) {
              return message.reply({embeds: [new MessageEmbed().setColor(es.wrongcolor).setTitle("❌ No Channels").setDescription("No channels are set for auto-embed.")]});
            }

            let channelList = a.map((id, index) => `${index + 1}. <#${id}>`).join("\n");

            return message.reply({embeds: [new MessageEmbed()
              .setTitle("List of Auto-Embed Channels")
              .setColor(es.color)
              .setDescription(channelList)
              .setFooter(client.getFooter(es))]});
          }
          break;
        }
      }
    } catch (e) {
      console.error(e);
      return message.reply({embeds: [new MessageEmbed().setColor(ee.wrongcolor).setFooter(client.getFooter(ee)).setTitle("❌ An Error Occurred").setDescription("Please try again later.")]});
    }
  },
};






const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');

module.exports = {
  name: "setup-autoembed",
  category: "💪 Setup",
  aliases: ["setupautoembed", "autoembed-setup"],
  cooldown: 5,
  usage: "setup-autoembed  --> Follow the Steps",
  description: "Define a channel where every message is replaced with an embed or disable this feature",
  memberpermissions: ["ADMINISTRATOR"],
  type: "system",
  run: async (client, message, args) => {
    const guildId = message.guild.id;
    const commandInitiator = message.author.id;

    try {
      await client.settings.ensure(`${guildId}.autoembed`, []);
      await showMenu();

      async function showMenu() {
        const menuOptions = [
          { value: "Add a Channel", description: "Add an auto-embed channel", emoji: "✅" },
          { value: "Remove a Channel", description: "Remove an existing auto-embed channel", emoji: "❌" },
          { value: "Show all Channels", description: "List all auto-embed channels", emoji: "📑" },
          { value: "Cancel", description: "Cancel the setup process", emoji: "🚫" },
        ];

        const selectionMenu = new MessageSelectMenu()
          .setCustomId('MenuSelection')
          .setPlaceholder('Click to configure auto-embed channels')
          .addOptions(menuOptions.map(option => ({
            label: option.value,
            value: option.value,
            description: option.description,
            emoji: option.emoji,
          })));

        const menuEmbed = new MessageEmbed()
          .setColor("#00FF00")
          .setTitle("Auto-Embed Setup")
          .setDescription("Choose an option to configure auto-embed channels.");

        const menuMessage = await message.reply({
          embeds: [menuEmbed],
          components: [new MessageActionRow().addComponents(selectionMenu)],
        });

        const collector = menuMessage.createMessageComponentCollector({
          filter: i => i.isSelectMenu(),
          time: 120000,
        });

        collector.on('collect', async interaction => {
          if (interaction.user.id !== commandInitiator) {
            return interaction.reply({
              embeds: [new MessageEmbed()
                .setColor("#FF0000")
                .setTitle("⚠ Unauthorized")
                .setDescription("Only the command initiator can interact with this menu.")],
              ephemeral: true,
            });
          }

          const selected = interaction.values[0];
          interaction.deferUpdate();

          switch (selected) {
            case "Add a Channel":
              await handleAddChannel(menuMessage);
              break;
            case "Remove a Channel":
              await handleRemoveChannel(menuMessage);
              break;
            case "Show all Channels":
              await paginateChannels(menuMessage);
              break;
            case "Cancel":
              collector.stop();
              return menuMessage.edit({
                embeds: [new MessageEmbed()
                  .setColor("#FF0000")
                  .setTitle("Setup Cancelled")
                  .setDescription("The setup process has been cancelled.")],
                components: [],
              });
          }
        });

        collector.on('end', () => {
          menuMessage.edit({
            components: [
              new MessageActionRow().addComponents(selectionMenu.setDisabled(true)),
            ],
          }).catch(() => {});
        });
      }

      async function handleAddChannel(menuMessage) {
        const embed = new MessageEmbed()
          .setColor("#00FF00")
          .setTitle("Add a Channel")
          .setDescription("Please mention the channel you want to add or provide its ID.");

        await menuMessage.reply({ embeds: [embed] });

        const messageCollector = menuMessage.channel.createMessageCollector({
          filter: m => m.author.id === commandInitiator,
          time: 120000,
        });

        messageCollector.on('collect', async m => {
          const channel = m.mentions.channels.first() || m.guild.channels.cache.get(m.content.trim());
          if (!channel) {
            return m.reply({
              embeds: [new MessageEmbed()
                .setColor("#FF0000")
                .setTitle("❌ Invalid Input")
                .setDescription("Please provide a valid channel mention or ID.")],
            });
          }

          const currentChannels = await client.settings.get(`${guildId}.autoembed`);
          if (currentChannels.includes(channel.id)) {
            return m.reply({
              embeds: [new MessageEmbed()
                .setColor("#FF0000")
                .setTitle("⚠ Channel Already Added")
                .setDescription(`<#${channel.id}> is already configured for auto-embed.`)],
            });
          }

          currentChannels.push(channel.id);
          await client.settings.set(`${guildId}.autoembed`, currentChannels);

          messageCollector.stop();
          return menuMessage.reply({
            embeds: [new MessageEmbed()
              .setColor("#00FF00")
              .setTitle("✅ Channel Added")
              .setDescription(`The channel <#${channel.id}> has been successfully added to auto-embed.`)],
          });
        });

        messageCollector.on('end', (_, reason) => {
          if (reason === "time") {
            menuMessage.reply({
              embeds: [new MessageEmbed()
                .setColor("#FF0000")
                .setTitle("⏰ Time Expired")
                .setDescription("The setup process has been cancelled due to inactivity.")],
            });
          }
        });
      }

      async function handleRemoveChannel(menuMessage) {
        const currentChannels = await client.settings.get(`${guildId}.autoembed`);
        if (currentChannels.length === 0) {
          return menuMessage.reply({
            embeds: [new MessageEmbed()
              .setColor("#FF0000")
              .setTitle("⚠ No Channels Configured")
              .setDescription("There are no channels configured for auto-embed.")],
          });
        }

        const embed = new MessageEmbed()
          .setColor("#00FF00")
          .setTitle("Remove a Channel")
          .setDescription(currentChannels.map((id, index) => `${index + 1}. <#${id}>`).join("\n"));

        await menuMessage.reply({ embeds: [embed] });

        const messageCollector = menuMessage.channel.createMessageCollector({
          filter: m => m.author.id === commandInitiator,
          time: 120000,
        });

        messageCollector.on('collect', async m => {
          const selectedIndex = parseInt(m.content.trim(), 10) - 1;
          if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= currentChannels.length) {
            return m.reply({
              embeds: [new MessageEmbed()
                .setColor("#FF0000")
                .setTitle("❌ Invalid Input")
                .setDescription("Please provide a valid number corresponding to a channel.")],
            });
          }

          const removedChannel = currentChannels.splice(selectedIndex, 1)[0];
          await client.settings.set(`${guildId}.autoembed`, currentChannels);

          messageCollector.stop();
          return menuMessage.reply({
            embeds: [new MessageEmbed()
              .setColor("#00FF00")
              .setTitle("✅ Channel Removed")
              .setDescription(`The channel <#${removedChannel}> has been successfully removed from auto-embed.`)],
          });
        });

        messageCollector.on('end', (_, reason) => {
          if (reason === "time") {
            menuMessage.reply({
              embeds: [new MessageEmbed()
                .setColor("#FF0000")
                .setTitle("⏰ Time Expired")
                .setDescription("The setup process has been cancelled due to inactivity.")],
            });
          }
        });
      }

      async function paginateChannels(menuMessage) {
        const currentChannels = await client.settings.get(`${guildId}.autoembed`);
        if (currentChannels.length === 0) {
          return menuMessage.reply({
            embeds: [new MessageEmbed()
              .setColor("#FF0000")
              .setTitle("⚠ No Channels Configured")
              .setDescription("There are no channels configured for auto-embed.")],
          });
        }

        const itemsPerPage = 25;
        let page = 0;

        const generateEmbed = () => {
          const start = page * itemsPerPage;
          const end = start + itemsPerPage;
          const paginatedChannels = currentChannels.slice(start, end);

          return new MessageEmbed()
            .setColor("#00FF00")
            .setTitle("Auto-Embed Channels")
            .setDescription(paginatedChannels.map(id => `<#${id}>`).join("\n"))
            .setFooter(`Page ${page + 1} of ${Math.ceil(currentChannels.length / itemsPerPage)}`);
        };

        const embedMessage = await menuMessage.reply({
          embeds: [generateEmbed()],
          components: [
            new MessageActionRow().addComponents([
              new MessageButton().setCustomId("previous").setLabel("Previous").setStyle("SECONDARY"),
              new MessageButton().setCustomId("main").setLabel("Main").setStyle("PRIMARY"),
              new MessageButton().setCustomId("next").setLabel("Next").setStyle("SECONDARY"),
            ]),
          ],
        });

        const buttonCollector = embedMessage.createMessageComponentCollector({
          filter: i => i.user.id === commandInitiator,
          time: 180000,
        });

        buttonCollector.on('collect', async interaction => {
          if (interaction.customId === "previous" && page > 0) {
            page--;
          } else if (interaction.customId === "next" && page < Math.ceil(currentChannels.length / itemsPerPage) - 1) {
            page++;
          } else if (interaction.customId === "main") {
            buttonCollector.stop();
            return showMenu();
          }

          await interaction.update({
            embeds: [generateEmbed()],
          });
        });

        buttonCollector.on('end', () => {
          embedMessage.edit({
            components: [
              new MessageActionRow().addComponents([
                new MessageButton().setCustomId("previous").setLabel("Previous").setStyle("SECONDARY").setDisabled(true),
                new MessageButton().setCustomId("main").setLabel("Main").setStyle("PRIMARY").setDisabled(true),
                new MessageButton().setCustomId("next").setLabel("Next").setStyle("SECONDARY").setDisabled(true),
              ]),
            ],
          });
        });
      }
    } catch (error) {
      console.error(error);
      return message.reply({
        embeds: [new MessageEmbed()
          .setColor("#FF0000")
          .setTitle("❌ An Error Occurred")
          .setDescription("An unexpected error occurred. Please try again later.")],
      });
    }
  },
};













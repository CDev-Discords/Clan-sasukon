const config = require('../../botconfig/config.json');
const ms = require('ms');
const ee = require('../../botconfig/embed.json');
const emoji = require('../../botconfig/emojis.json');
const {
  MessageEmbed,
  Permissions,
  MessageSelectMenu,
  MessageButton,
  MessageActionRow,
} = require('discord.js');
const { databasing, GetUser, dbEnsure } = require('../../handlers/functions');
const { DbAllCache } = require('../../handlers/caches.js');

module.exports = {
  name: 'manageinvites',
  category: '🚫 Administration',
  cooldown: 4,
  usage: 'manageinvites @USER --> Follow the Steps',
  description: 'Manages the Invites of a User',
  memberpermissions: ['ADMINISTRATOR'],
  type: 'member',
  run: async (client, message, args, cmduser, text, prefix, player, es, ls, GuildSettings) => {
    try {
      // Obtener usuario
      let user;
      if (args[0]) {
        try {
          user = await GetUser(message, args);
        } catch (e) {
          return message.reply({ content: e || client.la[ls].common.usernotfound });
        }
      } else {
        user = message.author;
      }

      if (!user || !user.id) {
        return message.reply({ content: client.la[ls].common.usernotfound });
      }

      // Opciones del menú
      const menuoptions = [
        { value: 'Add Joins', description: `Add a specific Number of Joins to: ${user.username}`, replymsg: 'Please send the number of invites (joins) to add.', emoji: '866356465299488809' },
        { value: 'Remove Joins', description: `Remove a specific Number of Joins from: ${user.username}`, replymsg: 'Please send the number of invites (joins) to remove.', emoji: '866356465299488809' },
        { value: 'Add Fakes', description: `Add a specific Number of Fakes to: ${user.username}`, replymsg: 'Please send the number of fake invites to add.', emoji: '833101993668771842' },
        { value: 'Remove Fakes', description: `Remove a specific Number of Fakes from: ${user.username}`, replymsg: 'Please send the number of fake invites to remove.', emoji: '833101993668771842' },
        { value: 'Add Leaves', description: `Add a specific Number of Leaves to: ${user.username}`, replymsg: 'Please send the number of leaves to add.', emoji: '866356598356049930' },
        { value: 'Remove Leaves', description: `Remove a specific Number of Leaves from: ${user.username}`, replymsg: 'Please send the number of leaves to remove.', emoji: '866356598356049930' },
        { value: 'Cancel', description: 'Cancel and stop the process!', emoji: '862306766338523166' },
      ];

      // Crear selección
      const Selection = new MessageSelectMenu()
        .setCustomId('MenuSelection')
        .setPlaceholder('Choose an action')
        .addOptions(
          menuoptions.map((option) => ({
            label: option.value,
            value: option.value,
            description: option.description,
            emoji: option.emoji,
          }))
        );

      // Configuración inicial de base de datos
      await client.invitesdb.ensure(message.guild.id + user.id, {
        id: user.id,
        guildId: message.guild.id,
        fake: 0,
        leaves: 0,
        invites: 0,
        invited: [],
        left: [],
        invitedBy: '',
        usedInvite: {},
        joinData: { type: 'unknown', invite: null },
        messagesCount: 0,
        bot: user.bot || false,
      });

      const memberData = await client.invitesdb.get(`${message.guild.id}${user.id}`);
      const { invites = 0, fake = 0, leaves = 0 } = memberData || {};
      const realInvites = invites - fake - leaves;

      // Crear embed inicial
      const MenuEmbed = new MessageEmbed()
        .setColor(es.color)
        .setAuthor(`Manage Invites for ${user.username}`)
        .setDescription('Select an option from the menu below to manage invites.')
        .addField('**Current Invites:**', `\u200b\n${user} has **${realInvites} real invites**.`);

      const menumsg = await message.reply({
        embeds: [MenuEmbed],
        components: [new MessageActionRow().addComponents(Selection)],
      });

      const collector = menumsg.createMessageComponentCollector({
        filter: (i) => i.user.id === cmduser.id,
        time: 90000,
      });

      collector.on('collect', async (menu) => {
        const selectedOption = menuoptions.find((opt) => opt.value === menu.values[0]);
        if (!selectedOption) {
          return menu.reply({ content: 'Invalid selection.', ephemeral: true });
        }

        if (menu.values[0] === 'Cancel') {
          return menu.reply({ content: 'Process cancelled!', ephemeral: true });
        }

        await menu.reply({ content: selectedOption.replymsg, ephemeral: true });

        const filter = (m) => m.author.id === menu.user.id;
        const collected = await message.channel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
        });

        const inputNumber = parseInt(collected.first()?.content, 10);
        if (isNaN(inputNumber) || inputNumber < 0) {
          return message.reply('Invalid number provided. Please try again.');
        }

        const userKey = `${message.guild.id}${user.id}`;

        switch (menu.values[0]) {
          case 'Add Joins':
            await client.invitesdb.add(`${userKey}.invites`, inputNumber);
            break;
          case 'Remove Joins':
            await client.invitesdb.subtract(`${userKey}.invites`, inputNumber);
            break;
          case 'Add Fakes':
            await client.invitesdb.add(`${userKey}.fake`, inputNumber);
            break;
          case 'Remove Fakes':
            await client.invitesdb.subtract(`${userKey}.fake`, inputNumber);
            break;
          case 'Add Leaves':
            await client.invitesdb.add(`${userKey}.leaves`, inputNumber);
            break;
          case 'Remove Leaves':
            await client.invitesdb.subtract(`${userKey}.leaves`, inputNumber);
            break;
        }

        const updatedData = await client.invitesdb.get(userKey);
        const { invites: updatedInvites = 0, fake: updatedFake = 0, leaves: updatedLeaves = 0 } = updatedData || {};
        const updatedRealInvites = updatedInvites - updatedFake - updatedLeaves;

        return message.reply({
          embeds: [
            new MessageEmbed()
              .setColor(es.color)
              .setAuthor(`${user.username}'s Updated Invites`)
              .setDescription(`${user} now has **${updatedRealInvites} real invites**.`),
          ],
        });
      });

      collector.on('end', () => {
        menumsg.edit({ components: [] });
      });
    } catch (error) {
      console.error(error);
      message.reply({
        embeds: [
          new MessageEmbed()
            .setColor(es.wrongcolor)
            .setTitle('An error occurred')
            .setDescription('Something went wrong while managing invites.'),
        ],
      });
    }
  },
};

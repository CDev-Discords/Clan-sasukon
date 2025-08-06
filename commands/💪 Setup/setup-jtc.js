const {
  MessageEmbed,
  MessageActionRow,
  MessageButton,
} = require('discord.js');

const emoji = {
  next: '▶️',
  prev: '◀️',
  add: '➕',
  edit: '🔧',
  delete: '🗑️',
  cancel: '❌',
  check: '✅',
  voice: '🔊',
  user: '👤',
  number: '#️⃣',
  owner: '👑',
  info: 'ℹ️',
  warning: '⚠️',
  hardreset: '💥',
  remove: '🚮'
};

module.exports = {
  name: 'setup-jtc',
  description: 'Configura el sistema de canales temporales (Join to Create)',
  category: '💪 Setup',
  permissions: ['ADMINISTRATOR'],
  cooldown: 5,
  run: async (client, message, args) => {
    const { guild, member, channel } = message;

    // ✅ Declarar base de datos
    let theDB = client.jtcsettings;

    // 🛠️ Embed base
    const embed = new MessageEmbed()
      .setColor('#00FFC3')
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
      .setFooter({ text: 'Sistema Join-to-Create | Página' });

    // 🗂️ Obtener configuraciones
    const configs = (await theDB.get(guild.id, 'configs')) || [];

    // 🧮 Dividir en listas de 25 y páginas de 4 listas
    const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
    const lists = chunk(configs, 25);
    const pages = chunk(lists, 4);
    let currentPageIndex = 0;

    // 🔧 Generar embed de página
    const generatePageEmbed = (pageIndex) => {
      const page = pages[pageIndex] || [];
      const totalConfigs = configs.length;

      let description = '';

      if (totalConfigs === 0) {
        description = `${emoji.info} No hay configuraciones. Usa ${emoji.add} para crear una.`;
      } else {
        description = page.map((list, idx) => {
          const listIndex = pageIndex * 4 + idx;
          const start = listIndex * 25 + 1;
          const end = Math.min(start + list.length - 1, start + 24);
          return `**Lista ${listIndex + 1}** (${start}-${end})\n${list.map((c, i) => `> ${i + 1}. <#${c.channel_id}>`).join('\n')}`;
        }).join('\n\n');
      }

      embed
        .setTitle(`${emoji.voice} Configuraciones Join-to-Create (${totalConfigs}/200)`)
        .setDescription(description)
        .setFooter({ text: `Página ${pageIndex + 1}/${pages.length || 1} | ${totalConfigs} configuraciones` });

      return embed;
    };

    // 🔘 Botones principales
    const createMainButtons = (pageIndex) => {
      const prevDisabled = pageIndex === 0;
      const nextDisabled = pageIndex >= pages.length - 1;

      return new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('prev')
          .setLabel('Anterior')
          .setStyle('SECONDARY')
          .setEmoji(emoji.prev)
          .setDisabled(prevDisabled),
        new MessageButton()
          .setCustomId('add_config')
          .setLabel('Nueva')
          .setStyle('SUCCESS')
          .setEmoji(emoji.add),
        new MessageButton()
          .setCustomId('next')
          .setLabel('Siguiente')
          .setStyle('SECONDARY')
          .setEmoji(emoji.next)
          .setDisabled(nextDisabled)
      );
    };

    // 🔘 Botones de acción peligrosa
    const createActionButtons = () => {
      return new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('hardreset')
          .setLabel('Hard Reset')
          .setStyle('DANGER')
          .setEmoji(emoji.hardreset),
        new MessageButton()
          .setCustomId('delete_single')
          .setLabel('Eliminar')
          .setStyle('SECONDARY')
          .setEmoji(emoji.remove),
        new MessageButton()
          .setCustomId('cancel')
          .setLabel('Cancelar')
          .setStyle('PRIMARY')
          .setEmoji(emoji.cancel)
      );
    };

    // 📨 Enviar mensaje inicial
    let msg = await channel.send({
      embeds: [generatePageEmbed(currentPageIndex)],
      components: [
        createMainButtons(currentPageIndex),
        createActionButtons()
      ]
    });

    // 🔁 Coleccionador de interacciones
    const filter = i => i.user.id === member.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 300000 }); // 5 minutos

    collector.on('collect', async i => {
      if (!i.deferred) await i.deferUpdate();

      // 📌 Navegación
      if (i.customId === 'next' && currentPageIndex < pages.length - 1) {
        currentPageIndex++;
        await msg.edit({ embeds: [generatePageEmbed(currentPageIndex)], components: [createMainButtons(currentPageIndex), createActionButtons()] });
      } else if (i.customId === 'prev' && currentPageIndex > 0) {
        currentPageIndex--;
        await msg.edit({ embeds: [generatePageEmbed(currentPageIndex)], components: [createMainButtons(currentPageIndex), createActionButtons()] });
      }

      // ➕ Nueva configuración
      else if (i.customId === 'add_config') {
        if (configs.length >= 200) {
          await i.followUp({
            content: `${emoji.delete} No puedes tener más de 200 configuraciones.`,
            ephemeral: true
          });
          return;
        }

        const setupEmbed = new MessageEmbed()
          .setColor('#00BFFF')
          .setTitle(`${emoji.add} Crear nueva configuración`)
          .setDescription(
            `${emoji.voice} **Opción 1:** Usa un canal existente\n` +
            `${emoji.user} **Opción 2:** Usa el canal donde estés ahora\n\n` +
            `Responde con:\n` +
            `1️⃣ para elegir un canal por ID\n` +
            `2️⃣ para usar tu canal actual\n` +
            `${emoji.cancel} para cancelar`
          );

        await msg.edit({ embeds: [setupEmbed], components: [] });

        const choice = await awaitResponse(message);
        if (!choice) return;

        let targetChannel = null;

        if (choice.content === '1') {
          await msg.edit({
            embeds: [new MessageEmbed()
              .setColor('#FFD700')
              .setTitle(`${emoji.voice} Ingresa el ID del canal de voz`)
              .setDescription(`Envía el **ID numérico** del canal de voz principal.`)
            ],
            components: []
          });

          const idMsg = await awaitResponse(message);
          if (!idMsg) return;

          const id = idMsg.content.trim();
          targetChannel = guild.channels.cache.get(id);
          if (!targetChannel || targetChannel.type !== 'GUILD_VOICE') {
            await message.channel.send(`${emoji.delete} Canal no válido o no es de voz.`);
            return;
          }
        } else if (choice.content === '2') {
          if (!member.voice.channel) {
            await message.channel.send(`${emoji.delete} No estás en un canal de voz.`);
            return;
          }
          targetChannel = member.voice.channel;
        } else {
          await message.channel.send(`${emoji.cancel} Opción no válida.`);
          return;
        }

        await msg.edit({
          embeds: [new MessageEmbed()
            .setColor('#2ECC71')
            .setTitle(`${emoji.edit} Nombre del canal temporal`)
            .setDescription(
              `Ejemplo: \`{User}'s Room ({Number})\`\n\n` +
              `Variables:\n` +
              `- \`{User}\` → Nombre del dueño\n` +
              `- \`{Number}\` → Número de canal\n\n` +
              `Ingresa el nombre del canal temporal:`
            )
          ],
          components: []
        });

        const nameMsg = await awaitResponse(message);
        if (!nameMsg) return;

        const templateName = nameMsg.content.slice(0, 99);

        const newConfig = {
          channel_id: targetChannel.id,
          template_name: templateName,
          created_at: Date.now()
        };

        configs.push(newConfig);
        await theDB.set(guild.id, configs, 'configs');

        const successEmbed = new MessageEmbed()
          .setColor('#2ECC71')
          .setTitle(`${emoji.check} Configuración creada`)
          .setDescription(
            `${emoji.voice} Canal principal: <#${targetChannel.id}>\n` +
            `${emoji.user} Nombre: \`${templateName}\`\n` +
            `${emoji.info} Listo para usarse.`
          );

        await msg.edit({ embeds: [successEmbed] });
        collector.stop();
        return;
      }

      // 💥 Hard Reset (confirmación)
      else if (i.customId === 'hardreset') {
        if (configs.length === 0) {
          await i.followUp({
            content: `${emoji.info} No hay configuraciones para eliminar.`,
            ephemeral: true
          });
          return;
        }

        const confirmEmbed = new MessageEmbed()
          .setColor('#FF5555')
          .setTitle(`${emoji.warning} ¿Eliminar TODAS las configuraciones?`)
          .setDescription(
            `Esta acción **eliminará todas las ${configs.length} configuraciones**.\n` +
            `Esta acción **no se puede deshacer**.\n\n` +
            `¿Estás seguro?`
          );

        const confirmRow = new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId('confirm_hardreset')
            .setLabel('Sí, eliminar todo')
            .setStyle('DANGER')
            .setEmoji(emoji.hardreset),
          new MessageButton()
            .setCustomId('cancel_hardreset')
            .setLabel('Cancelar')
            .setStyle('SUCCESS')
            .setEmoji(emoji.cancel)
        );

        await msg.edit({ embeds: [confirmEmbed], components: [confirmRow] });
        return;
      }

      // ✅ Confirmar Hard Reset
      else if (i.customId === 'confirm_hardreset') {
        await theDB.delete(guild.id, 'configs');
        const resetEmbed = new MessageEmbed()
          .setColor('#FF5555')
          .setTitle(`${emoji.hardreset} Todas las configuraciones eliminadas`)
          .setDescription(`${emoji.info} Se han eliminado **${configs.length} configuraciones**.`);
        await msg.edit({ embeds: [resetEmbed], components: [] });
        collector.stop();
        return;
      }

      // ❌ Cancelar Hard Reset
      else if (i.customId === 'cancel_hardreset') {
        await msg.edit({
          embeds: [generatePageEmbed(currentPageIndex)],
          components: [createMainButtons(currentPageIndex), createActionButtons()]
        });
        return;
      }

      // 🚮 Eliminar una configuración específica
      else if (i.customId === 'delete_single') {
        if (configs.length === 0) {
          await i.followUp({
            content: `${emoji.info} No hay configuraciones para eliminar.`,
            ephemeral: true
          });
          return;
        }

        await msg.edit({
          embeds: [new MessageEmbed()
            .setColor('#FF5555')
            .setTitle(`${emoji.remove} Eliminar configuración`)
            .setDescription(
              `Ingresa el **número de lista** de la configuración que deseas eliminar.\n\n` +
              `Ejemplo: \`1\` para eliminar la primera.\n\n` +
              `Hay ${configs.length} configuraciones en total.`
            )
          ],
          components: []
        });

        const response = await awaitResponse(message);
        if (!response) return;

        const num = parseInt(response.content);
        if (isNaN(num) || num < 1 || num > configs.length) {
          await message.channel.send({
            content: `${emoji.delete} Número inválido. Debe estar entre 1 y ${configs.length}.`
          });
          return;
        }

        const target = configs[num - 1];
        configs.splice(num - 1, 1);
        await theDB.set(guild.id, configs, 'configs');

        const deletedEmbed = new MessageEmbed()
          .setColor('#FF5555')
          .setTitle(`${emoji.delete} Configuración eliminada`)
          .setDescription(
            `Se eliminó la configuración #${num}:\n` +
            `Canal: <#${target.channel_id}>\n` +
            `Nombre: \`${target.template_name}\``
          );

        await msg.edit({ embeds: [deletedEmbed] });
        collector.stop();
        return;
      }

      // ❌ Cancelar menú
      else if (i.customId === 'cancel') {
        embed
          .setTitle(`${emoji.cancel} Configuración cancelada`)
          .setDescription(`${emoji.info} Has salido del menú.`)
          .setColor('#777777')
          .setFooter({ text: '' });
        await msg.edit({ embeds: [embed], components: [] });
        collector.stop();
        return;
      }
    });

    collector.on('end', async collected => {
      if (collected.size === 0) {
        embed
          .setColor('#777777')
          .setTitle(`${emoji.info} Tiempo agotado`)
          .setDescription(`${emoji.cancel} No se recibió interacción.`)
          .setFooter({ text: '' });
        await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
      }
    });

    // 🔍 Función auxiliar: esperar mensaje del usuario
    function awaitResponse(msg) {
      return new Promise((resolve) => {
        const filter = m => m.author.id === member.id;
        const collector = msg.channel.createMessageCollector({ filter, max: 1, time: 60000 });
        collector.on('collect', m => resolve(m));
        collector.on('end', collected => {
          if (collected.size === 0) resolve(null);
        });
      });
    }
  }
};
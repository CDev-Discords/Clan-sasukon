const { VoiceChannel } = require('discord.js');

module.exports = (client) => {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const guildId = newState.guild.id;
    const theDB = client.jtcsettings;

    // 🚫 Si el usuario cambia de canal (no es entrada pura)
    if (oldState.channelId && newState.channelId) return;

    // 🚫 Si el usuario salió de un canal
    if (!newState.channelId) return;

    const channel = newState.channel;
    if (channel.type !== 'GUILD_VOICE') return;

    // 🔍 Buscar si este canal está en configuraciones JTC
    const configs = (await theDB.get(guildId, 'configs')) || [];
    const config = configs.find(c => c.channel_id === channel.id);
    if (!config) return;

    const owner = newState.member;
    const guild = newState.guild;

    // 🔢 Obtener o inicializar el contador del servidor
    if (!(await theDB.has(guildId, 'counter'))) {
      await theDB.set(guildId, 1, 'counter'); // Inicializa en 1
    } else {
      await theDB.add(guildId, 1, 'counter'); // Suma 1
    }

    const counter = await theDB.get(guildId, 'counter');

    // 🧩 Generar nombre del canal temporal
    let name = config.template_name
      .replace(/{\s*user\s*}/gi, owner.displayName)
      .replace(/{\s*number\s*}/gi, counter);

    // 🛠️ Crear canal temporal
    let tempChannel;
    try {
      tempChannel = await guild.channels.create(name, {
        type: 'GUILD_VOICE',
        parent: channel.parentId,
        permissionOverwrites: [
          // Copiar permisos del canal base
          ...channel.permissionOverwrites.cache.map(perm => perm.toJSON()),
          // Dar control total al dueño
          {
            id: owner.id,
            allow: ['MANAGE_CHANNELS', 'MANAGE_ROLES']
          }
        ]
      });
    } catch (error) {
      console.error(`[JTC] Error creando canal temporal en el servidor ${guildId}:`, error);
      return;
    }

    // 🔄 Mover al usuario al canal temporal
    setTimeout(async () => {
      const member = guild.members.cache.get(owner.id);
      if (!member || member.voice.channelId !== channel.id) return;

      try {
        await member.voice.setChannel(tempChannel);
      } catch (err) {
        console.error(`[JTC] No se pudo mover al usuario ${owner.id} al canal temporal:`, err);
      }
    }, 1000);

    // 👑 Guardar al dueño del canal temporal
    await theDB.set(tempChannel.id, owner.id, 'owners');

    // 👤 Función para transferir o eliminar el canal
    const handleChannelEmpty = async () => {
      const voiceChannel = guild.channels.cache.get(tempChannel.id);
      if (!voiceChannel) return;

      if (voiceChannel.members.size === 0) {
        // 🗑️ Canal vacío: eliminar
        try {
          await voiceChannel.delete();
        } catch (err) {
          console.error(`[JTC] No se pudo borrar el canal temporal ${tempChannel.id}:`, err);
        }
        await theDB.delete(tempChannel.id, 'owners');
        return;
      }

      // 👤 Transferir owner si el actual ya no está
      const currentOwnerId = await theDB.get(tempChannel.id, 'owners');
      const currentOwner = voiceChannel.members.get(currentOwnerId);

      if (!currentOwner) {
        const members = voiceChannel.members.filter(m => m.id !== currentOwnerId);
        if (members.size > 0) {
          const newOwner = members.random();
          await theDB.set(tempChannel.id, newOwner.id, 'owners');

          try {
            await voiceChannel.permissionOverwrites.edit(newOwner.id, {
              MANAGE_CHANNELS: true,
              MANAGE_ROLES: true
            });
          } catch (err) {
            console.error(`[JTC] No se pudieron dar permisos al nuevo owner ${newOwner.id}:`, err);
          }
        }
      }
    };

    // 🎧 Escuchar cambios de estado para manejar salidas
    const listener = async (old, updated) => {
      if (updated.channelId === tempChannel.id || old.channelId === tempChannel.id) {
        // Esperar un momento para asegurar el estado actualizado
        setTimeout(handleChannelEmpty, 500);
      }
    };

    // 📡 Registrar el listener globalmente
    if (!client.jtcListeners) client.jtcListeners = new Map();
    if (!client.jtcListeners.has(tempChannel.id)) {
      client.jtcListeners.set(tempChannel.id, listener);
      client.on('voiceStateUpdate', listener);
    }

    // 🧹 Limpiar listener cuando se borre el canal
    tempChannel.on('delete', () => {
      const savedListener = client.jtcListeners.get(tempChannel.id);
      if (savedListener) {
        client.removeListener('voiceStateUpdate', savedListener);
        client.jtcListeners.delete(tempChannel.id);
      }
    });
  });
};
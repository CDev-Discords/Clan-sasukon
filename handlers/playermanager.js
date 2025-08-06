const Discord = require("discord.js");
const { MessageEmbed } = require("discord.js");
const config = require(`${process.cwd()}/botconfig/config.json`);
const ee = require(`${process.cwd()}/botconfig/embed.json`);
const { format, delay, arrayMove } = require(`./functions`);

/**
 * ✅ MIGRATED TO TSUMILINK
 * 
 * Este archivo es un enrutador de acciones musicales.
 * No interactúa directamente con el reproductor,
 * por lo que no requiere cambios en lógica.
 * 
 * Los módulos llamados (request, song, playlist, etc.)
 * sí deben ser migrados para usar `client.tsumi` en lugar de `client.manager`.
 */

module.exports = async (client, message, args, type, slashCommand = false, extras = false) => {
  let method = type.includes(":") ? type.split(":") : Array(type);
  if (!message.guild) return;

  // Configuración de embeds y lenguaje
  let settings = client.settings.get(message.guild.id);
  let es = settings.embed || ee;
  let ls = settings.language || "en";
  ee = es;

  // Verificar canal de voz del usuario
  let { channel } = message.member.voice;
  if (!channel) {
    if (slashCommand) {
      return slashCommand.reply({
        ephemeral: true,
        embeds: [new MessageEmbed()
          .setColor(ee.wrongcolor)
          .setFooter(client.getFooter(ee))
          .setTitle(":x: You are not connected to a Voice Channel!")
        ]
      }).catch((e) => console.error(e));
    } else {
      return message.reply({
        embeds: [new MessageEmbed()
          .setColor(ee.wrongcolor)
          .setFooter(client.getFooter(ee))
          .setTitle(":x: You are not connected to a Voice Channel!")
        ]
      }).catch((e) => console.error(e));
    }
  }

  // Verificar permisos del bot
  const permissions = channel.permissionsFor(client.user);
  if (!permissions.has("CONNECT")) {
    if (slashCommand) {
      return slashCommand.reply({
        ephemeral: true,
        embeds: [new MessageEmbed()
          .setColor(ee.wrongcolor)
          .setFooter(client.getFooter(ee))
          .setTitle(eval(client.la[ls]["handlers"]["playermanagerjs"]["playermanager"]["variable1"]))
        ]
      }).catch((e) => console.error(e));
    }
    return message.reply({
      embeds: [new MessageEmbed()
        .setColor(ee.wrongcolor)
        .setFooter(client.getFooter(ee))
        .setTitle(eval(client.la[ls]["handlers"]["playermanagerjs"]["playermanager"]["variable1"]))
      ]
    }).catch((e) => console.error(e));
  }

  if (!permissions.has("SPEAK")) {
    if (slashCommand) {
      return slashCommand.reply({
        ephemeral: true,
        embeds: [new MessageEmbed()
          .setColor(ee.wrongcolor)
          .setFooter(client.getFooter(ee))
          .setTitle(eval(client.la[ls]["handlers"]["playermanagerjs"]["playermanager"]["variable2"]))
        ]
      }).catch((e) => console.error(e));
    }
    return message.reply({
      embeds: [new MessageEmbed()
        .setColor(ee.wrongcolor)
        .setFooter(client.getFooter(ee))
        .setTitle(eval(client.la[ls]["handlers"]["playermanagerjs"]["playermanager"]["variable2"]))
      ]
    }).catch((e) => console.error(e));
  }

  // Verificar si el canal está lleno
  let botchannel = message.guild.me.voice.channel;
  if (!botchannel && channel.userLimit !== 0 && channel.full) {
    const embed = new MessageEmbed()
      .setTitle(":x: Your Voice Channel is full!")
      .setColor(es.wrongcolor)
      .setFooter(client.getFooter(es));

    if (slashCommand) {
      return slashCommand.reply({ embeds: [embed] }).catch(() => null);
    } else {
      return message.reply({ embeds: [embed] }).catch(() => null);
    }
  }

  // Enrutamiento a módulos específicos
  try {
    if (method[0] === "song") {
      require("./playermanagers/song")(client, message, args, type, slashCommand, extras);
    } else if (method[0] === "request") {
      require("./playermanagers/request")(client, message, args, type, slashCommand);
    } else if (method[0] === "playlist") {
      require("./playermanagers/playlist")(client, message, args, type, slashCommand);
    } else if (method[0] === "similar") {
      require("./playermanagers/similar")(client, message, args, type, slashCommand);
    } else if (method[0] === "search") {
      require("./playermanagers/search")(client, message, args, type, slashCommand);
    } else if (method[0] === "skiptrack") {
      require("./playermanagers/skiptrack")(client, message, args, type, slashCommand);
    } else if (method[0] === "playtop") {
      require("./playermanagers/playtop")(client, message, args, type, slashCommand);
    } else {
      if (slashCommand) {
        return slashCommand.reply({
          ephemeral: true,
          embeds: [new MessageEmbed()
            .setColor(ee.wrongcolor)
            .setFooter(client.getFooter(ee))
            .setTitle(eval(client.la[ls]["handlers"]["playermanagerjs"]["playermanager"]["variable3"]))
          ]
        }).catch((e) => console.error(e));
      }
      return message.reply({
        embeds: [new MessageEmbed()
          .setColor(ee.wrongcolor)
          .setFooter(client.getFooter(ee))
          .setTitle(eval(client.la[ls]["handlers"]["playermanagerjs"]["playermanager"]["variable3"]))
        ]
      }).catch((e) => console.error(e));
    }
  } catch (e) {
    console.error(`Error loading module in playermanager: ${e.stack}`);
    if (slashCommand) {
      slashCommand.reply({
        ephemeral: true,
        content: "❌ An error occurred while processing your request."
      }).catch(() => null);
    } else {
      message.reply("❌ An error occurred while processing your request.").catch(() => null);
    }
  }
};

/**
 * @INFO
 * Bot Coded by Tomato#6966 | https://discord.gg/milrato  
 * @INFO
 * Work for Milrato Development | https://milrato.eu  
 * @INFO
 * Please mention him / Milrato Development, when using this Code!
 * @INFO
 */

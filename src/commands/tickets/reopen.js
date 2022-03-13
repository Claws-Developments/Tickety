const tickets = require("../../models/Tickets");
const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");

module.exports = class Reopen extends Interaction {
  constructor() {
    super({
      name: "reopen",
      description: "Reopens a ticket",
    });
  }

  async exec(int, data) {
    let channel = int.channel;

    let isMod = data.modRoles.some((r) => int.member._roles.includes(r));

    if (!isMod && !int.member.permissions.has("MANAGE_GUILD")) {
      return int.reply({
        content: "You don't have permission to do that!",
        ephemeral: true,
      });
    }

    let ticket = await tickets.findOne({ ticketID: channel.id });
    if (!ticket) {
      return int.reply({
        content: "This is not a ticket!",
        ephemeral: true,
      });
    }

    if (ticket.closed === false) {
      return int.reply({
        content: "This ticket is not closed!",
        ephemeral: true,
      });
    }

    let main = await int.channel.messages.fetch(ticket.mainMessageID);
    let member = await int.guild.members.fetch(ticket._id);
    let panel = await int.channel.messages.fetch(ticket.panelMessageID);

    if (!member) return int.reply("Couldn't find the ticket owner!");

    let row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("close")
        .setLabel("Close ticket")
        .setStyle("SECONDARY")
        .setEmoji("🔒")
    );

    await main.edit({
      components: [row],
    });

    if (panel) {
      panel.delete();
      ticket.panelMessageID = undefined;
    }

    ticket.closed = false;
    await ticket.save();

    await int.channel.permissionOverwrites
      .edit(member.user.id, {
        SEND_MESSAGES: true,
        VIEW_CHANNEL: true,
      })
      .catch((err) => {
        console.log(err);
      });

    if (data.logsChannel) {
      let owner = await int.guild.members.fetch(ticket._id);
      let log = new MessageEmbed()
        .setTitle("Ticket reopened")
        .setAuthor(
          int.user.username,
          int.user.displayAvatarURL({ dynamic: true })
        )
        .addFields([
          {
            name: "Moderator",
            value: `${int.user}`,
            inline: true,
          },
          {
            name: "Ticket",
            value: `${int.channel.id}`,
            inline: true,
          },
          { name: "Opened by", value: `${owner}`, inline: true },
        ])
        .setColor("#faea3c")
        .setTimestamp();
      let logs = await int.guild.channels.fetch(data.logsChannel);
      logs.send({ embeds: [log] });
    }

    return int.reply({
      content: "Ticket reopened!",
      ephemeral: true,
    });
  }
};

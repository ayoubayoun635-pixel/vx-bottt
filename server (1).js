const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

// --- CONFIGURATION ---
const PREFIX = "vx ";
const GOLD = 0xFFD700;
const DARK_BLUE = 0x1A237E;

client.on('ready', () => {
    console.log(`>>> SYSTEM ONLINE: ${client.user.tag}`);
    client.user.setActivity('vx help | Dar Lkbira', { type: ActivityType.Watching });
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- COMMAND: HELP (The Professional Panel) ---
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('🏛️ DAR LKBIRA | MAIN TERMINAL')
            .setColor(DARK_BLUE)
            .setDescription('Welcome to the official control panel. Below are the available command modules.')
            .addFields(
                { name: '🛡️ MODERATION (10+)', value: '`kick`, `ban`, `clear`, `nuke`, `lock`, `unlock`, `slowmode`, `mute`, `unmute`', inline: false },
                { name: '⚙️ UTILITY', value: '`ping`, `stats`, `userinfo`, `serverinfo`, `avatar`, `invite`', inline: false },
                { name: '🎮 ENTERTAINMENT', value: '`roll`, `coinflip`, `8ball`, `poll`, `calculate`', inline: false }
            )
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: 'System Architecture: vx | JavaScript Edition', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }

    // --- COMMAND: PING ---
    if (command === 'ping') {
        return message.channel.send({ 
            embeds: [new EmbedBuilder().setDescription(`🛰️ **Latency:** \`${client.ws.ping}ms\``).setColor(GOLD)] 
        });
    }

    // --- COMMAND: CLEAR ---
    if (command === 'clear') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const amount = parseInt(args[0]) || 5;
        if (amount > 100) return message.reply("Maximum 100 messages.");
        
        await message.channel.bulkDelete(amount + 1, true);
        const msg = await message.channel.send(`🧹 **Purged ${amount} messages.**`);
        setTimeout(() => msg.delete(), 3000);
    }

    // --- COMMAND: KICK ---
    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
        const member = message.mentions.members.first();
        if (!member) return message.reply("Please mention a user to kick.");
        const reason = args.slice(1).join(' ') || "No reason provided.";
        
        await member.kick(reason);
        const embed = new EmbedBuilder()
            .setTitle('Action: Kick')
            .setColor(GOLD)
            .setDescription(`**User:** ${member.user.tag}\n**Reason:** ${reason}`)
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // --- COMMAND: BAN ---
    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
        const member = message.mentions.members.first();
        if (!member) return message.reply("Please mention a user to ban.");
        const reason = args.slice(1).join(' ') || "No reason provided.";
        
        await member.ban({ reason });
        const embed = new EmbedBuilder()
            .setTitle('Action: Ban')
            .setColor(0xFF0000)
            .setDescription(`**User:** ${member.user.tag}\n**Reason:** ${reason}`)
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // --- COMMAND: NUKE (The reset command) ---
    if (command === 'nuke') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        const position = message.channel.position;
        const newChannel = await message.channel.clone();
        await message.channel.delete();
        await newChannel.setPosition(position);
        return newChannel.send({ 
            embeds: [new EmbedBuilder().setDescription('💥 **Channel Nuked and Reconstructed.**').setColor(GOLD)] 
        });
    }

    // --- COMMAND: USERINFO ---
    if (command === 'userinfo') {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setTitle(`Identity: ${user.username}`)
            .setColor(DARK_BLUE)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'ID', value: `\`${user.id}\``, inline: true },
                { name: 'Joined Discord', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
            );
        return message.channel.send({ embeds: [embed] });
    }

    // --- COMMAND: ROLL ---
    if (command === 'roll') {
        const result = Math.floor(Math.random() * 100) + 1;
        return message.channel.send(`🎲 You rolled: **${result}**`);
    }
});

// Login using Railway Environment Variable
client.login(process.env.DISCORD_TOKEN);

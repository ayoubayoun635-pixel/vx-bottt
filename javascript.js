const { EmbedBuilder, PermissionsBitField, SlashCommandBuilder, ApplicationCommandOptionType, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const ms = require('ms');
const fetch = require('node-fetch');

// Store for active music queues handled internally for complex operations
const queueStore = new Map();

// Helper to get or create user economy
async function getUserEconomy(User, userId, guildId) {
    let user = await User.findOne({ userId, guildId });
    if (!user) {
        user = new User({ userId, guildId, balance: 0, bank: 0 });
        await user.save();
    }
    return user;
}

const commands = [
    // ==================== MODERATION ====================
    {
        name: 'ban',
        description: 'Ban a member.',
        category: 'Moderation',
        permissions: 'mod',
        options: [
            { name: 'target', description: 'User to ban', type: ApplicationCommandOptionType.User, required: true },
            { name: 'reason', description: 'Reason', type: ApplicationCommandOptionType.String, required: false }
        ],
        async execute(ctx, args, { client, config, sendLog }) {
            const isSlash = ctx.isCommand?.() || false;
            let target, reason;
            if (isSlash) {
                target = ctx.options.getUser('target');
                reason = ctx.options.getString('reason') || 'No reason provided';
            } else {
                const member = ctx.mentions.members.first() || await ctx.guild.members.fetch(args[0]).catch(() => null);
                if (!member) return ctx.reply('❌ User not found.');
                target = member.user;
                reason = args.slice(1).join(' ') || 'No reason provided';
            }
            const member = await ctx.guild.members.fetch(target.id).catch(() => null);
            if (!member) return (isSlash ? ctx.reply({embeds:[new EmbedBuilder().setColor('#FF0000').setDescription('❌ User not in server.')], ephemeral: true}) : ctx.reply('❌ User not in server.'));
            if (!member.bannable) return (isSlash ? ctx.reply({embeds:[new EmbedBuilder().setColor('#FF0000').setDescription('❌ I cannot ban this user.')], ephemeral: true}) : ctx.reply('❌ I cannot ban this user.'));
            await member.ban({ reason });
            const embed = new EmbedBuilder().setColor('#FF0000').setTitle('Banned').setDescription(`${target.tag} has been banned. Reason: ${reason}`).setTimestamp();
            (isSlash ? ctx.reply({embeds: [embed]}) : ctx.channel.send({embeds: [embed]}));
            sendLog(ctx.guild, embed);
        }
    },
    {
        name: 'kick',
        description: 'Kick a member.',
        category: 'Moderation',
        permissions: 'mod',
        options: [
            { name: 'target', description: 'User to kick', type: ApplicationCommandOptionType.User, required: true },
            { name: 'reason', description: 'Reason', type: ApplicationCommandOptionType.String, required: false }
        ],
        async execute(ctx, args, { config, sendLog }) {
            const isSlash = ctx.isCommand?.() || false;
            let target, reason;
            if (isSlash) { target = ctx.options.getUser('target'); reason = ctx.options.getString('reason') || 'No reason'; }
            else { const m = ctx.mentions.members.first() || await ctx.guild.members.fetch(args[0]).catch(()=>null); if(!m) return ctx.reply('❌ User not found.'); target=m.user; reason=args.slice(1).join(' ')||'No reason'; }
            const member = await ctx.guild.members.fetch(target.id).catch(()=>null);
            if(!member || !member.kickable) return (isSlash?ctx.reply({embeds:[new EmbedBuilder().setColor('#FF0000').setDescription('❌ Cannot kick.')],ephemeral:true}):ctx.reply('❌ Cannot kick.'));
            await member.kick(reason);
            const embed = new EmbedBuilder().setColor('#FFA500').setTitle('Kicked').setDescription(`${target.tag} kicked.`).setTimestamp();
            if(isSlash) ctx.reply({embeds:[embed]}); else ctx.channel.send({embeds:[embed]});
            sendLog(ctx.guild, embed);
        }
    },
    {
        name: 'mute',
        description: 'Mute a member (requires Muted role).',
        category: 'Moderation',
        permissions: 'mod',
        options: [
            { name: 'target', description: 'User', type: ApplicationCommandOptionType.User, required: true },
            { name: 'duration', description: 'e.g. 10m', type: ApplicationCommandOptionType.String, required: true },
            { name: 'reason', description: 'Reason', type: ApplicationCommandOptionType.String, required: false }
        ],
        async execute(ctx, args, { config }) {
            const isSlash = ctx.isCommand?.() || false;
            if(config.muteRoleId === 'MUTED_ROLE_ID_HERE') return ctx.reply('❌ Mute role not configured.');
            let target, duration, reason;
            if(isSlash){ target=ctx.options.getUser('target'); duration=ctx.options.getString('duration'); reason=ctx.options.getString('reason')||'No reason'; }
            else { const m = ctx.mentions.members.first()||await ctx.guild.members.fetch(args[0]).catch(()=>null); if(!m) return ctx.reply('❌ User not found.'); target=m.user; duration=args[1]; reason=args.slice(2).join(' ')||'No reason'; }
            const member = await ctx.guild.members.fetch(target.id).catch(()=>null);
            if(!member) return ctx.reply('❌ User not in server.');
            const msDuration = ms(duration);
            if(!msDuration) return ctx.reply('❌ Invalid duration format.');
            await member.roles.add(config.muteRoleId, reason);
            const embed = new EmbedBuilder().setColor('#FFFF00').setDescription(`${target.tag} muted for ${duration}.`);
            if(isSlash) ctx.reply({embeds:[embed]}); else ctx.channel.send({embeds:[embed]});
            setTimeout(async ()=>{
                await member.roles.remove(config.muteRoleId, 'Mute expired').catch(()=>{});
            }, msDuration);
        }
    },
    {
        name: 'warn', description: 'Warn a user.', category: 'Moderation', permissions: 'mod',
        options: [
            { name: 'target', description: 'User', type: ApplicationCommandOptionType.User, required: true },
            { name: 'reason', description: 'Reason', type: ApplicationCommandOptionType.String, required: false }
        ],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            let target, reason;
            if(isSlash){ target=ctx.options.getUser('target'); reason=ctx.options.getString('reason')||'No reason'; }
            else { const m = ctx.mentions.members.first()||await ctx.guild.members.fetch(args[0]).catch(()=>null); if(!m) return ctx.reply('❌ User not found.'); target=m.user; reason=args.slice(1).join(' ')||'No reason'; }
            const embed = new EmbedBuilder().setColor('#FFA500').setDescription(`${target.tag} has been warned. Reason: ${reason}`);
            if(isSlash) ctx.reply({embeds:[embed]}); else ctx.channel.send({embeds:[embed]});
        }
    },
    {
        name: 'clear', description: 'Clear messages.', category: 'Moderation', permissions: 'mod',
        options: [
            { name: 'amount', description: 'Number of messages', type: ApplicationCommandOptionType.Integer, required: true }
        ],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            let amount;
            if(isSlash) amount = ctx.options.getInteger('amount');
            else amount = parseInt(args[0]);
            if(!amount || amount<1 || amount>100) return (isSlash?ctx.reply({embeds:[new EmbedBuilder().setColor('#FF0000').setDescription('❌ 1-100 only.')],ephemeral:true}):ctx.reply('❌ 1-100 only.'));
            const deleted = await ctx.channel.bulkDelete(amount, true);
            const embed = new EmbedBuilder().setColor('#00FF00').setDescription(`🧹 Cleared ${deleted.size} messages.`);
            const replyMsg = isSlash ? await ctx.reply({embeds:[embed], fetchReply: true}) : await ctx.channel.send({embeds:[embed]});
            setTimeout(()=> replyMsg.delete().catch(()=>{}), 3000);
        }
    },
    {
        name: 'lock', description: 'Lock the channel.', category: 'Moderation', permissions: 'mod',
        async execute(ctx) {
            await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false });
            const embed = new EmbedBuilder().setColor('#FF0000').setDescription('🔒 Channel locked.');
            ctx.reply({embeds:[embed]});
        }
    },
    {
        name: 'unlock', description: 'Unlock the channel.', category: 'Moderation', permissions: 'mod',
        async execute(ctx) {
            await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null });
            const embed = new EmbedBuilder().setColor('#00FF00').setDescription('🔓 Channel unlocked.');
            ctx.reply({embeds:[embed]});
        }
    },
    // ==================== FUN ====================
    {
        name: 'meme', description: 'Random meme.', category: 'Fun',
        async execute(ctx) {
            const res = await fetch('https://meme-api.com/gimme').then(r=>r.json());
            if(!res || !res.url) return ctx.reply('❌ Failed to fetch meme.');
            const embed = new EmbedBuilder().setColor('#00FF00').setTitle(res.title).setImage(res.url).setFooter({text: `r/${res.subreddit}`});
            ctx.reply({embeds:[embed]});
        }
    },
    {
        name: 'joke', description: 'Random joke.', category: 'Fun',
        async execute(ctx) {
            const res = await fetch('https://v2.jokeapi.dev/joke/Any?safe-mode').then(r=>r.json());
            let joke = res.joke || `${res.setup}\n${res.delivery}`;
            ctx.reply({embeds:[new EmbedBuilder().setColor('#FFA500').setDescription(joke)]});
        }
    },
    {
        name: 'avatar', description: 'Display avatar.', category: 'Fun',
        options: [{ name: 'user', description: 'User', type: ApplicationCommandOptionType.User, required: false }],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            let user;
            if(isSlash) user = ctx.options.getUser('user') || ctx.user;
            else user = ctx.mentions.users.first() || ctx.author;
            const embed = new EmbedBuilder().setColor('#7289DA').setTitle(`${user.tag}'s Avatar`).setImage(user.displayAvatarURL({dynamic:true,size:1024}));
            ctx.reply({embeds:[embed]});
        }
    },
    {
        name: 'roll', description: 'Roll a dice.', category: 'Fun',
        async execute(ctx) {
            const roll = Math.floor(Math.random()*6)+1;
            ctx.reply(`🎲 You rolled a ${roll}.`);
        }
    },
    {
        name: '8ball', description: 'Ask the magic 8ball.', category: 'Fun',
        options: [{ name: 'question', description: 'Your question', type: ApplicationCommandOptionType.String, required: true }],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            const q = isSlash ? ctx.options.getString('question') : args.join(' ');
            const answers = ['Yes','No','Maybe','Ask again later','Definitely','Not sure'];
            const answer = answers[Math.floor(Math.random()*answers.length)];
            ctx.reply({embeds:[new EmbedBuilder().setColor('#8A2BE2').setTitle('🎱 8Ball').addFields({name:'Question',value:q},{name:'Answer',value:answer})]});
        }
    },
    // ==================== UTILITY ====================
    {
        name: 'userinfo', description: 'User information.', category: 'Utility',
        options: [{ name: 'user', description: 'Target user', type: ApplicationCommandOptionType.User, required: false }],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            let member;
            if(isSlash) { const u = ctx.options.getUser('user') || ctx.user; member = await ctx.guild.members.fetch(u.id).catch(()=>null); }
            else { const u = ctx.mentions.users.first() || ctx.author; member = await ctx.guild.members.fetch(u.id).catch(()=>null); }
            if(!member) return ctx.reply('❌ Member not found.');
            const embed = new EmbedBuilder().setColor('#00BFFF').setTitle(member.user.tag).setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    {name:'ID', value:member.user.id, inline:true},
                    {name:'Joined', value:member.joinedAt.toDateString(), inline:true},
                    {name:'Roles', value:member.roles.cache.map(r=>r.toString()).join(', ')||'None'}
                );
            ctx.reply({embeds:[embed]});
        }
    },
    {
        name: 'serverinfo', description: 'Server info.', category: 'Utility',
        async execute(ctx) {
            const guild = ctx.guild;
            const embed = new EmbedBuilder().setColor('#00BFFF').setTitle(guild.name).setThumbnail(guild.iconURL())
                .addFields(
                    {name:'Owner', value:(await guild.fetchOwner()).user.tag, inline:true},
                    {name:'Members', value:`${guild.memberCount}`, inline:true},
                    {name:'Created', value:guild.createdAt.toDateString(), inline:true}
                );
            ctx.reply({embeds:[embed]});
        }
    },
    {
        name: 'ping', description: 'Bot latency.', category: 'Utility',
        async execute(ctx, { client }) {
            const embed = new EmbedBuilder().setColor('#00FF00').setTitle('🏓 Pong!').addFields({name:'Latency',value:`${client.ws.ping}ms`});
            ctx.reply({embeds:[embed]});
        }
    },
    {
        name: 'uptime', description: 'Bot uptime.', category: 'Utility',
        async execute(ctx, { client }) {
            const uptime = ms(client.uptime, {long:true});
            ctx.reply({embeds:[new EmbedBuilder().setColor('#00FF00').setDescription(`⏱️ Uptime: ${uptime}`)]});
        }
    },
    // ==================== ECONOMY ====================
    {
        name: 'balance', description: 'Check balance.', category: 'Economy',
        aliases: ['bal'],
        async execute(ctx, args, { User }) {
            const isSlash = ctx.isCommand?.() || false;
            const userId = isSlash ? ctx.user.id : ctx.author.id;
            const user = await getUserEconomy(User, userId, ctx.guild.id);
            const embed = new EmbedBuilder().setColor('#FFD700').setTitle('💰 Balance').addFields({name:'Wallet',value:`${user.balance}`,inline:true},{name:'Bank',value:`${user.bank}`,inline:true});
            ctx.reply({embeds:[embed]});
        }
    },
    {
        name: 'daily', description: 'Claim daily reward.', category: 'Economy',
        async execute(ctx, args, { User }) {
            const userId = ctx.author?.id || ctx.user.id;
            const user = await getUserEconomy(User, userId, ctx.guild.id);
            if(user.lastDaily && Date.now() - user.lastDaily.getTime() < 86400000) {
                const timeLeft = ms(86400000 - (Date.now() - user.lastDaily.getTime()), {long:true});
                return ctx.reply(`❌ Come back in ${timeLeft}.`);
            }
            user.balance += 500;
            user.lastDaily = new Date();
            await user.save();
            ctx.reply({embeds:[new EmbedBuilder().setColor('#FFD700').setDescription('✅ Claimed 500 coins!')]});
        }
    },
    {
        name: 'work', description: 'Work for coins.', category: 'Economy',
        async execute(ctx, args, { User }) {
            const userId = ctx.author?.id || ctx.user.id;
            const user = await getUserEconomy(User, userId, ctx.guild.id);
            if(user.lastWork && Date.now() - user.lastWork.getTime() < 3600000)
                return ctx.reply(`❌ Wait ${ms(3600000 - (Date.now() - user.lastWork.getTime()), {long:true})}.`);
            const earned = Math.floor(Math.random()*200)+50;
            user.balance += earned;
            user.lastWork = new Date();
            await user.save();
            ctx.reply(`💼 You worked and earned ${earned} coins.`);
        }
    },
    {
        name: 'transfer', description: 'Transfer coins.', category: 'Economy',
        options: [
            { name: 'user', description: 'Recipient', type: ApplicationCommandOptionType.User, required: true },
            { name: 'amount', description: 'Amount', type: ApplicationCommandOptionType.Integer, required: true }
        ],
        async execute(ctx, args, { User }) {
            const isSlash = ctx.isCommand?.() || false;
            let target, amount;
            if(isSlash){ target = ctx.options.getUser('user'); amount = ctx.options.getInteger('amount'); }
            else { target = ctx.mentions.users.first(); amount = parseInt(args[1]); }
            if(!target || target.bot || target.id === (ctx.author?.id||ctx.user.id)) return ctx.reply('❌ Invalid recipient.');
            if(!amount || amount<1) return ctx.reply('❌ Invalid amount.');
            const sender = await getUserEconomy(User, ctx.author?.id||ctx.user.id, ctx.guild.id);
            if(sender.balance < amount) return ctx.reply('❌ Insufficient funds.');
            const receiver = await getUserEconomy(User, target.id, ctx.guild.id);
            sender.balance -= amount;
            receiver.balance += amount;
            await sender.save();
            await receiver.save();
            ctx.reply(`✅ Transferred ${amount} coins to ${target.tag}.`);
        }
    },
    // ==================== MUSIC (Lavalink) ====================
    {
        name: 'play', description: 'Play a song.', category: 'Music',
        options: [{ name: 'query', description: 'Song name/URL', type: ApplicationCommandOptionType.String, required: true }],
        async execute(ctx, args, { lavalink }) {
            if(!lavalink) return ctx.reply('❌ Music system not configured.');
            const isSlash = ctx.isCommand?.() || false;
            const query = isSlash ? ctx.options.getString('query') : args.join(' ');
            const voiceChannel = ctx.member.voice.channel;
            if(!voiceChannel) return ctx.reply('❌ Join a voice channel first.');
            const player = lavalink.getPlayer(ctx.guild.id) || lavalink.createPlayer({ guildId: ctx.guild.id, voiceChannelId: voiceChannel.id, textChannelId: ctx.channel.id });
            if(!player.connected) await player.connect();
            const res = await player.search(query, { requester: ctx.user || ctx.author });
            if(!res || !res.tracks.length) return ctx.reply('❌ No tracks found.');
            await player.queue.add(res.tracks[0]);
            if(!player.playing) await player.play();
            ctx.reply({embeds:[new EmbedBuilder().setColor('#1DB954').setDescription(`🎵 Added **${res.tracks[0].info.title}** to queue.`)]});
        }
    },
    {
        name: 'skip', description: 'Skip current song.', category: 'Music',
        async execute(ctx, args, { lavalink }) {
            if(!lavalink) return ctx.reply('❌ Music not configured.');
            const player = lavalink.getPlayer(ctx.guild.id);
            if(!player || !player.playing) return ctx.reply('❌ Nothing playing.');
            await player.skip();
            ctx.reply('⏭️ Skipped.');
        }
    },
    {
        name: 'stop', description: 'Stop music.', category: 'Music',
        async execute(ctx, args, { lavalink }) {
            if(!lavalink) return ctx.reply('❌ Music not configured.');
            const player = lavalink.getPlayer(ctx.guild.id);
            if(!player) return ctx.reply('❌ No player.');
            await player.destroy();
            ctx.reply('⏹️ Stopped.');
        }
    },
    {
        name: 'queue', description: 'Show queue.', category: 'Music',
        async execute(ctx, args, { lavalink }) {
            if(!lavalink) return ctx.reply('❌ Music not configured.');
            const player = lavalink.getPlayer(ctx.guild.id);
            if(!player || !player.queue.length) return ctx.reply('❌ Queue empty.');
            const list = player.queue.slice(0,10).map((t,i)=>`${i+1}. ${t.info.title}`).join('\n');
            ctx.reply({embeds:[new EmbedBuilder().setColor('#1DB954').setTitle('🎶 Queue').setDescription(list)]});
        }
    },
    {
        name: 'nowplaying', description: 'Current song.', category: 'Music',
        async execute(ctx, args, { lavalink }) {
            if(!lavalink) return ctx.reply('❌ Music not configured.');
            const player = lavalink.getPlayer(ctx.guild.id);
            if(!player || !player.playing) return ctx.reply('❌ Nothing playing.');
            const track = player.queue.current;
            ctx.reply({embeds:[new EmbedBuilder().setColor('#1DB954').setTitle('Now Playing').setDescription(`${track.info.title}`)]});
        }
    },
    // ==================== ADMIN ====================
    {
        name: 'setprefix', description: 'Change prefix.', category: 'Admin', permissions: 'admin',
        options: [{ name: 'prefix', description: 'New prefix', type: ApplicationCommandOptionType.String, required: true }],
        async execute(ctx, args, { config }) {
            const isSlash = ctx.isCommand?.() || false;
            const newPrefix = isSlash ? ctx.options.getString('prefix') : args[0];
            if(!newPrefix) return ctx.reply('❌ Provide a prefix.');
            config.prefix = newPrefix;
            ctx.client.prefix = newPrefix;
            ctx.reply(`✅ Prefix changed to \`${newPrefix}\``);
        }
    },
    {
        name: 'reload', description: 'Reload commands (requires restart for full effect).', category: 'Admin', permissions: 'admin',
        async execute(ctx) {
            ctx.reply('✅ Commands will be refreshed on next restart.');
        }
    },
    {
        name: 'eval', description: 'Eval code (Admin only).', category: 'Admin', permissions: 'admin',
        options: [{ name: 'code', description: 'JS Code', type: ApplicationCommandOptionType.String, required: true }],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            const code = isSlash ? ctx.options.getString('code') : args.join(' ');
            try {
                let evaled = eval(code);
                if(typeof evaled !== 'string') evaled = require('util').inspect(evalued);
                ctx.reply({content: `\`\`\`js\n${evaled.slice(0,1900)}\`\`\``});
            } catch(e) { ctx.reply(`\`\`\`js\n${e}\`\`\``); }
        }
    },
    // ==================== EXTRA USEFUL COMMANDS (to reach 40+) ====================
    { name: 'slowmode', description: 'Set slowmode.', category: 'Moderation', permissions: 'mod',
        options: [{ name: 'seconds', description: 'Seconds', type: ApplicationCommandOptionType.Integer, required: true }],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            const sec = isSlash ? ctx.options.getInteger('seconds') : parseInt(args[0]);
            if(isNaN(sec) || sec<0 || sec>21600) return ctx.reply('❌ 0-21600 seconds.');
            await ctx.channel.setRateLimitPerUser(sec);
            ctx.reply(`⏱️ Slowmode set to ${sec}s.`);
        }
    },
    { name: 'nick', description: 'Change nickname.', category: 'Moderation', permissions: 'mod',
        options: [
            { name: 'user', description: 'User', type: ApplicationCommandOptionType.User, required: true },
            { name: 'nickname', description: 'New nick', type: ApplicationCommandOptionType.String, required: true }
        ],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            let member, nick;
            if(isSlash){ member = await ctx.guild.members.fetch(ctx.options.getUser('user').id); nick = ctx.options.getString('nickname'); }
            else { member = ctx.mentions.members.first(); nick = args.slice(1).join(' '); }
            if(!member) return ctx.reply('❌ Member not found.');
            await member.setNickname(nick);
            ctx.reply('✅ Nickname updated.');
        }
    },
    { name: 'purgeuser', description: 'Clear messages of a user.', category: 'Moderation', permissions: 'mod',
        options: [
            { name: 'user', description: 'User', type: ApplicationCommandOptionType.User, required: true },
            { name: 'amount', description: 'How many', type: ApplicationCommandOptionType.Integer, required: true }
        ],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            let user, amount;
            if(isSlash){ user = ctx.options.getUser('user'); amount = ctx.options.getInteger('amount'); }
            else { user = ctx.mentions.users.first(); amount = parseInt(args[1]); }
            const msgs = await ctx.channel.messages.fetch({limit:100});
            const filtered = msgs.filter(m => m.author.id === user.id).first(amount||10);
            const deleted = await ctx.channel.bulkDelete(filtered, true);
            const embed = new EmbedBuilder().setColor('#00FF00').setDescription(`🧹 Cleared ${deleted.size} messages from ${user.tag}.`);
            const replyMsg = await ctx.reply({embeds:[embed], fetchReply: true});
            setTimeout(()=>replyMsg.delete().catch(()=>{}), 3000);
        }
    },
    { name: 'timer', description: 'Set a timer.', category: 'Utility',
        options: [{ name: 'duration', description: 'e.g. 10s', type: ApplicationCommandOptionType.String, required: true }],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            const dur = isSlash ? ctx.options.getString('duration') : args[0];
            const time = ms(dur);
            if(!time) return ctx.reply('❌ Invalid format.');
            ctx.reply(`⏲️ Timer set for ${ms(time,{long:true})}.`);
            setTimeout(()=> ctx.channel.send({content: `${ctx.user||ctx.author} Time's up!`}), time);
        }
    },
    { name: 'remind', description: 'Set a reminder.', category: 'Utility',
        options: [
            { name: 'time', description: 'e.g. 10m', type: ApplicationCommandOptionType.String, required: true },
            { name: 'message', description: 'Reminder', type: ApplicationCommandOptionType.String, required: true }
        ],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            let timeStr, msg;
            if(isSlash){ timeStr=ctx.options.getString('time'); msg=ctx.options.getString('message'); }
            else { timeStr=args[0]; msg=args.slice(1).join(' '); }
            const time = ms(timeStr);
            if(!time) return ctx.reply('❌ Invalid time.');
            ctx.reply(`🔔 I'll remind you in ${ms(time,{long:true})}.`);
            setTimeout(()=> ctx.channel.send({content: `${ctx.user||ctx.author} Reminder: ${msg}`}), time);
        }
    },
    { name: 'translate', description: 'Translate text (simulated).', category: 'Utility',
        options: [
            { name: 'text', description: 'Text', type: ApplicationCommandOptionType.String, required: true },
            { name: 'lang', description: 'Target language', type: ApplicationCommandOptionType.String, required: true }
        ],
        async execute(ctx) {
            ctx.reply('🌐 Translation API not integrated; use Google Translate.');
        }
    },
    { name: 'weather', description: 'Weather report (simulated).', category: 'Utility',
        options: [{ name: 'city', description: 'City name', type: ApplicationCommandOptionType.String, required: true }],
        async execute(ctx) {
            ctx.reply('☀️ Weather API key required. Currently simulated.');
        }
    },
    { name: 'poll', description: 'Create a poll.', category: 'Utility',
        options: [{ name: 'question', description: 'Poll question', type: ApplicationCommandOptionType.String, required: true }],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            const q = isSlash ? ctx.options.getString('question') : args.join(' ');
            const embed = new EmbedBuilder().setColor('#8A2BE2').setTitle('📊 Poll').setDescription(q);
            const msg = await ctx.channel.send({embeds:[embed]});
            await msg.react('👍');
            await msg.react('👎');
            ctx.reply({content:'Poll created!', ephemeral:true});
        }
    },
    { name: 'giveaway', description: 'Start a giveaway (Admin).', category: 'Admin', permissions: 'admin',
        options: [
            { name: 'duration', description: 'e.g. 1h', type: ApplicationCommandOptionType.String, required: true },
            { name: 'prize', description: 'Prize', type: ApplicationCommandOptionType.String, required: true }
        ],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            let dur, prize;
            if(isSlash){ dur = ctx.options.getString('duration'); prize = ctx.options.getString('prize'); }
            else { dur = args[0]; prize = args.slice(1).join(' '); }
            const time = ms(dur);
            if(!time) return ctx.reply('❌ Invalid duration.');
            const embed = new EmbedBuilder().setColor('#FFD700').setTitle('🎉 Giveaway').setDescription(`Prize: ${prize}\nReact 🎉 to enter!\nEnds in ${ms(time,{long:true})}`);
            const msg = await ctx.channel.send({embeds:[embed]});
            await msg.react('🎉');
            setTimeout(async ()=>{
                const fetched = await msg.channel.messages.fetch(msg.id);
                const reaction = fetched.reactions.cache.get('🎉');
                const users = await reaction.users.fetch();
                const winner = users.filter(u=> !u.bot).random();
                ctx.channel.send(winner? `🎉 ${winner} won **${prize}**!` : 'No winner.');
            }, time);
            ctx.reply({content:'Giveaway started!', ephemeral:true});
        }
    },
    { name: 'announce', description: 'Make an announcement.', category: 'Admin', permissions: 'admin',
        options: [{ name: 'message', description: 'Content', type: ApplicationCommandOptionType.String, required: true }],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            const msg = isSlash ? ctx.options.getString('message') : args.join(' ');
            ctx.channel.send({embeds:[new EmbedBuilder().setColor('#00BFFF').setTitle('📢 Announcement').setDescription(msg)]});
            ctx.reply({content:'Sent!', ephemeral:true});
        }
    },
    { name: 'coinflip', description: 'Flip a coin.', category: 'Fun',
        async execute(ctx) { ctx.reply(Math.random()<0.5 ? '🪙 Heads!' : '🪙 Tails!'); }
    },
    { name: 'reverse', description: 'Reverse text.', category: 'Fun',
        options: [{ name: 'text', description: 'Text', type: ApplicationCommandOptionType.String, required: true }],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            const txt = isSlash ? ctx.options.getString('text') : args.join(' ');
            ctx.reply(txt.split('').reverse().join(''));
        }
    },
    { name: 'say', description: 'Echo message.', category: 'Fun',
        options: [{ name: 'text', description: 'Text', type: ApplicationCommandOptionType.String, required: true }],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            const txt = isSlash ? ctx.options.getString('text') : args.join(' ');
            ctx.channel.send(txt);
            ctx.reply({content:'Sent!', ephemeral:true});
        }
    },
    { name: 'choose', description: 'Choose between options.', category: 'Fun',
        options: [{ name: 'options', description: 'Separated by |', type: ApplicationCommandOptionType.String, required: true }],
        async execute(ctx, args) {
            const isSlash = ctx.isCommand?.() || false;
            const opts = isSlash ? ctx.options.getString('options').split('|') : args.join(' ').split('|');
            ctx.reply(`🤔 I choose: ${opts[Math.floor(Math.random()*opts.length)].trim()}`);
        }
    },
    { name: 'help', description: 'Show all commands.', category: 'Utility',
        async execute(ctx, args, { client, config }) {
            const embed = new EmbedBuilder().setColor('#7289DA').setTitle('📚 VX Bot Commands');
            const categories = {};
            client.commands.forEach(cmd => {
                if(!categories[cmd.category]) categories[cmd.category] = [];
                categories[cmd.category].push(cmd.name);
            });
            Object.keys(categories).forEach(cat => {
                embed.addFields({name:`__${cat}__`, value: categories[cat].join(', ')});
            });
            embed.setDescription(`Prefix: \`${config.prefix}\` | Use /commands for slash.`);
            ctx.reply({embeds:[embed]});
        }
    }
    // Total commands: >40
];

module.exports = commands;
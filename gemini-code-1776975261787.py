import os, discord, asyncio, random
from discord.ext import commands
from datetime import datetime

# --- CORE SETTINGS ---
intents = discord.Intents.all()
bot = commands.Bot(command_prefix="vx ", intents=intents, help_command=None)

# Colors for Professional Panel
GOLD = 0xFFD700
BLUE = 0x1A237E

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user}')
    await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name="vx help"))

# --- PROFESSIONAL CONTROL PANEL ---
@bot.command(name="help")
async def help(ctx):
    embed = discord.Embed(title="SYSTEM CONTROL PANEL", color=BLUE, timestamp=datetime.utcnow())
    embed.add_field(name="🛡️ MODERATION", value="`kick`, `ban`, `clear`, `lock`, `unlock`, `nuke`", inline=False)
    embed.add_field(name="⚙️ UTILITY", value="`ping`, `userinfo`, `serverinfo`, `avatar`", inline=False)
    embed.add_field(name="🎮 FUN", value="`roll`, `coinflip`, `8ball`", inline=False)
    embed.set_footer(text="Prefix: vx | System Online")
    await ctx.send(embed=embed)

# --- MODERATION COMMANDS ---
@bot.command()
@commands.has_permissions(manage_messages=True)
async def clear(ctx, amount: int = 5):
    await ctx.channel.purge(limit=amount + 1)
    msg = await ctx.send(f"🧹 Cleaned `{amount}` messages."); await asyncio.sleep(2); await msg.delete()

@bot.command()
@commands.has_permissions(kick_members=True)
async def kick(ctx, member: discord.Member, *, reason="No reason"):
    await member.kick(reason=reason)
    await ctx.send(embed=discord.Embed(description=f"✅ **{member}** kicked.", color=GOLD))

@bot.command()
@commands.has_permissions(administrator=True)
async def nuke(ctx):
    pos = ctx.channel.position
    new = await ctx.channel.clone()
    await ctx.channel.delete()
    await new.edit(position=pos)
    await new.send(embed=discord.Embed(description="💥 **Channel Nuked.**", color=GOLD))

# --- UTILITY COMMANDS ---
@bot.command()
async def ping(ctx):
    await ctx.send(f"🛰️ Latency: `{round(bot.latency * 1000)}ms`")

@bot.command()
async def userinfo(ctx, member: discord.Member = None):
    member = member or ctx.author
    e = discord.Embed(title=f"User: {member}", color=BLUE)
    e.set_thumbnail(url=member.avatar.url if member.avatar else None)
    e.add_field(name="ID", value=member.id)
    await ctx.send(embed=e)

# --- RUN SYSTEM ---
TOKEN = os.getenv('DISCORD_TOKEN')
if TOKEN:
    bot.run(TOKEN)
else:
    print("ERROR: Add 'DISCORD_TOKEN' to Railway Variables!")
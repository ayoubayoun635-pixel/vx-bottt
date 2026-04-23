import discord
from discord.ext import commands

class General(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name="help")
    async def help_command(self, ctx):
        embed = discord.Embed(
            title="SYSTEM CONTROL PANEL",
            description="Professional Command Interface. Use `vx <command>`",
            color=0x1A237E # Dark Blue
        )
        embed.set_author(name=self.bot.user.name, icon_url=self.bot.user.avatar.url if self.bot.user.avatar else None)
        embed.add_field(name="🛡️ Moderation", value="`kick`, `ban`, `unban`, `mute`, `unmute`, `clear`, `slowmode`, `lock`, `unlock`, `nuke`")
        embed.add_field(name="⚙️ Utility", value="`ping`, `stats`, `userinfo`, `serverinfo`, `avatar`, `invite`, `uptime`")
        embed.add_field(name="🎮 Fun & Tools", value="`coinflip`, `roll`, `echo`, `poll`, `calculate`")
        embed.set_footer(text="System Architecture: Dar Lkbira | Gold & Blue Edition")
        await ctx.send(embed=embed)

    @commands.command()
    async def ping(self, ctx):
        latency = round(self.bot.latency * 1000)
        embed = discord.Embed(description=f"🛰️ **Satellite Latency:** `{latency}ms`", color=0xFFD700)
        await ctx.send(embed=embed)

async def setup(bot):
    await bot.add_cog(General(bot))

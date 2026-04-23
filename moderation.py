import discord
from discord.ext import commands
import asyncio

class Moderation(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    @commands.has_permissions(manage_messages=True)
    async def clear(self, ctx, amount: int = 5):
        await ctx.channel.purge(limit=amount + 1)
        msg = await ctx.send(f"🧹 Cleaned `{amount}` messages.")
        await asyncio.sleep(3)
        await msg.delete()

    @commands.command()
    @commands.has_permissions(kick_members=True)
    async def kick(self, ctx, member: discord.Member, *, reason="No reason provided"):
        await member.kick(reason=reason)
        embed = discord.Embed(title="Member Kicked", description=f"**{member}** has been removed.\n**Reason:** {reason}", color=0xFFD700)
        await ctx.send(embed=embed)

    @commands.command()
    @commands.has_permissions(ban_members=True)
    async def ban(self, ctx, member: discord.Member, *, reason="No reason provided"):
        await member.ban(reason=reason)
        embed = discord.Embed(title="Member Banned", description=f"**{member}** has been banned.\n**Reason:** {reason}", color=0xFF0000)
        await ctx.send(embed=embed)

    @commands.command()
    @commands.has_permissions(manage_channels=True)
    async def lock(self, ctx):
        await ctx.channel.set_permissions(ctx.guild.default_role, send_messages=False)
        await ctx.send("🔒 Channel locked.")

    @commands.command()
    @commands.has_permissions(manage_channels=True)
    async def unlock(self, ctx):
        await ctx.channel.set_permissions(ctx.guild.default_role, send_messages=True)
        await ctx.send("🔓 Channel unlocked.")

    @commands.command()
    @commands.has_permissions(manage_guild=True)
    async def nuke(self, ctx):
        new_channel = await ctx.channel.clone(reason="Nuke command")
        await ctx.channel.delete()
        await new_channel.send("💥 **Channel Nuked Successfully.**")

async def setup(bot):
    await bot.add_cog(Moderation(bot))

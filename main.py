import os
import discord
from discord.ext import commands

class ProfessionalBot(commands.Bot):
    def __init__(self):
        # Setting the 'vx' prefix and all intents
        intents = discord.Intents.all()
        super().__init__(command_prefix="vx ", intents=intents, help_command=None)

    async def setup_hook(self):
        # Auto-load cogs from the directory
        for filename in os.listdir('./cogs'):
            if filename.endswith('.py'):
                try:
                    await self.load_extension(f'cogs.{filename[:-3]}')
                    print(f'Successfully loaded {filename}')
                except Exception as e:
                    print(f'Failed to load {filename}: {e}')

    async def on_ready(self):
        print(f'Logged in as {self.user} (ID: {self.user.id})')
        await self.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name="vx help"))

bot = ProfessionalBot()
TOKEN = os.getenv('DISCORD_TOKEN')

if __name__ == "__main__":
    if TOKEN:
        bot.run(TOKEN)
    else:
        print("CRITICAL ERROR: DISCORD_TOKEN variable not found.")

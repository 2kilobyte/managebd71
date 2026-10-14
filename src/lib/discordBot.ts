import { Client, GatewayIntentBits, OverwriteType, PermissionFlagsBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user?.tag}`);
});

// Connect only when an admin requests a Discord action, never during a build.
let loginPromise: Promise<void> | undefined;
async function ensureReady() {
  if (client.isReady()) return;
  if (!loginPromise) {
    loginPromise = new Promise<void>((resolve, reject) => {
      const token = process.env.DISCORD_TOKEN;
      if (!token) { reject(new Error('Discord token is not configured')); return; }
      const onReady = () => { clearTimeout(timer); resolve(); };
      const onError = (error: Error) => {
        clearTimeout(timer);
        client.removeListener('ready', onReady);
        reject(error);
      };
      const timer = setTimeout(() => onError(new Error('Discord connection timed out')), 15000);
      client.once('ready', onReady);
      client.login(token).catch(onError);
    }).catch((error) => { loginPromise = undefined; throw error; });
  }
  await loginPromise;
}

// Function to create voice channel
export const createVoiceChannel = async (teamName: string, userLimit: number): Promise<string> => {
    await ensureReady();
    const guild = await client.guilds.fetch(process.env.GUILD_ID!);

    const channel = await guild.channels.create({
        name: teamName,
        type: 2, // Voice channel
        parent: process.env.VOICE_CHANNEL_CATEGORY_ID || undefined,
        userLimit, // Limit to 5 users
        reason: `Voice channel created for team ${teamName}`,
    });

    return channel.id;
};

// ✅ Function to assign a role to a user by their Discord ID
export const assignRoleToUser = async (
  discordId: string,
  roleID: string = process.env.DISCORD_ROLE_ID!
): Promise<void> => {
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  try {
    const member = await guild.members.fetch(discordId);
    await member.roles.add(roleID);
    console.log(`✅ Assigned role to ${member.user.tag}`);
  } catch (err) {
    console.warn(`⚠️ Could not assign role to ${discordId}:`, err);
  }
};



// ✅ Function to create a new role for a team
export const createRoleForTeam = async (teamName: string): Promise<string> => {
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);

  try {
    // Check if role already exists
    const existingRole = guild.roles.cache.find(role => role.name === teamName);
    if (existingRole) {
      console.log(`ℹ️ Role "${teamName}" already exists.`);
      return existingRole.id;
    }

    // Create new role
    const newRole = await guild.roles.create({
      name: teamName,
      color: 'Random', // You can customize this
      reason: `Role created for team ${teamName}`,
    });

    console.log(`✅ Created role "${teamName}"`);
    return newRole.id;
  } catch (err) {
    console.error(`❌ Failed to create role "${teamName}":`, err);
    throw err;
  }
};




// ✅ Function to set up permissions for a voice channel
export const setChannelPermissions = async (
  channelId: string,
  connectRoleId: string,   // Can view and connect
  viewOnlyRoleId: string  = process.env.DISCORD_ROLE_ID!,
): Promise<void> => {
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  const channel = await guild.channels.fetch(channelId);

  

  if (!channel || !channel.isVoiceBased()) {
    throw new Error(`❌ Channel with ID ${channelId} is not a valid voice channel.`);
  }

  try {
    await channel.permissionOverwrites.set([
      {
        // Deny everyone from viewing and connecting
        id: guild.roles.everyone.id,
        type: OverwriteType.Role,
        allow: [ PermissionFlagsBits.ViewChannel ],
        deny: [ PermissionFlagsBits.Connect ],
      },
      {
        // View-only role: can see but not connect
        id: viewOnlyRoleId,
        type: OverwriteType.Role,
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [PermissionFlagsBits.Connect],
      },
      {
        // Full-access role: can see and connect
        id: connectRoleId,
        type: OverwriteType.Role,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
        ],
      }
    ]);

    console.log(`✅ Permissions set on channel "${channel.name}"`);
  } catch (err) {
    console.error(`❌ Failed to set permissions on channel ${channelId}:`, err);
    throw err;
  }
};


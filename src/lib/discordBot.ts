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

const staffRoleEnvironmentKeys = [
  'DISCORD_ADMINISTRATOR_ROLE_ID',
  'DISCORD_MODERATOR_ROLE_ID',
  'DISCORD_COMMUNITY_MANAGER_ROLE_ID',
  'DISCORD_TOURNAMENT_MANAGER_ROLE_ID',
  'DISCORD_COMMENTATORS_ROLE_ID',
] as const;

export const validateDiscordSetupPermissions = async (): Promise<void> => {
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  const botMember = await guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error('Discord bot is missing Manage Channels. Grant it to the bot role, then retry setup.');
  }
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error('Discord bot is missing Manage Roles. Grant it to the bot role, then retry setup.');
  }

  const missing = staffRoleEnvironmentKeys.filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing Discord staff role environment values: ${missing.join(', ')}.`);

  await Promise.all(staffRoleEnvironmentKeys.map(async (key) => {
    const id = process.env[key]!.trim();
    const role = await guild.roles.fetch(id);
    if (!role) throw new Error(`${key} points to a role that is not in the configured Discord server.`);
  }));
  // Channel permission overwrites can target high-position roles. The bot's
  // hierarchy only limits role assignment/management, not channel overwrites.
};

// Function to create voice channel
export const createVoiceChannel = async (teamName: string, userLimit: number): Promise<string> => {
    await ensureReady();
    const guild = await client.guilds.fetch(process.env.GUILD_ID!);
    try {
      const channel = await guild.channels.create({
        name: teamName,
        type: 2, // Voice channel
        parent: process.env.VOICE_CHANNEL_CATEGORY_ID || undefined,
        userLimit, // Limit to 5 users
        reason: `Voice channel created for team ${teamName}`,
      });

      return channel.id;
    } catch (error) {
      return permissionError('create a team voice channel', error, 'The bot needs Manage Channels, and the selected category must allow the bot to create channels.');
    }
};

const permissionError = (action: string, error: unknown, requirement: string): never => {
  const discordError = error as { code?: number; message?: string };
  if (discordError?.code === 50013 || /Missing Permissions/i.test(discordError?.message ?? '')) {
    throw new Error(`Discord denied ${action} (Missing Permissions). ${requirement}`);
  }
  throw error instanceof Error ? error : new Error(`Could not ${action}.`);
};

// ✅ Function to assign a role to a user by their Discord ID
export const assignRoleToUser = async (
  discordId: string,
  roleID: string = process.env.DISCORD_ROLE_ID!
): Promise<boolean> => {
  if (!roleID) throw new Error('Discord role ID is not configured.');
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  const member = await guild.members.fetch(discordId);
  if (member.roles.cache.has(roleID)) return false;
  try {
    await member.roles.add(roleID, 'Tournament Discord setup');
  } catch (error) {
    permissionError('assign a role', error, 'The bot needs Manage Roles, and its highest role must be above the role it is assigning.');
  }
  console.log(`✅ Assigned role to ${member.user.tag}`);
  return true;
};



// ✅ Function to create a new role for a team
export const createRoleForTeam = async (teamName: string): Promise<{ id: string; created: boolean }> => {
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);

  try {
    // Check if role already exists
    await guild.roles.fetch();
    const existingRole = guild.roles.cache.find(role => role.name === teamName);
    if (existingRole) {
      const botMember = await guild.members.fetchMe();
      if (existingRole.position >= botMember.roles.highest.position) {
        throw new Error(`The existing team role "${teamName}" is above the bot role. Move the bot role above that team role so the bot can assign it to registered players.`);
      }
      console.log(`ℹ️ Role "${teamName}" already exists.`);
      return { id: existingRole.id, created: false };
    }

    // Create new role
    const newRole = await guild.roles.create({
      name: teamName,
      color: 'Random', // You can customize this
      reason: `Role created for team ${teamName}`,
    });

    console.log(`✅ Created role "${teamName}"`);
    return { id: newRole.id, created: true };
  } catch (err) {
    console.error(`❌ Failed to create role "${teamName}":`, err);
    return permissionError('create a team role', err, 'The bot needs Manage Roles in this server.');
  }
};




// ✅ Function to set up permissions for a voice channel
export const setChannelPermissions = async (
  channelId: string,
  connectRoleId: string,
): Promise<void> => {
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  const channel = await guild.channels.fetch(channelId);

  if (!channel || !channel.isVoiceBased()) {
    throw new Error(`❌ Channel with ID ${channelId} is not a valid voice channel.`);
  }

  const botMember = await guild.members.fetchMe();
  const channelPermissions = channel.permissionsFor(botMember);
  const missingChannelPermissions = [
    [PermissionFlagsBits.ManageRoles, 'Manage Roles'],
    [PermissionFlagsBits.ManageChannels, 'Manage Channels'],
  ].filter(([permission]) => !channelPermissions?.has(permission as bigint)).map(([, name]) => name);
  if (missingChannelPermissions.length) {
    const categoryName = channel.parent?.name ? ` The parent category is "${channel.parent.name}".` : '';
    throw new Error(`The bot has ${missingChannelPermissions.join(' and ')} missing in this channel's effective permissions.${categoryName} Allow these permissions for the bot role in Server Settings → Roles and, if needed, in the parent category's Permissions.`);
  }

  try {
    const staffRoleIds = [
      process.env.DISCORD_ADMINISTRATOR_ROLE_ID,
      process.env.DISCORD_MODERATOR_ROLE_ID,
      process.env.DISCORD_COMMUNITY_MANAGER_ROLE_ID,
      process.env.DISCORD_TOURNAMENT_MANAGER_ROLE_ID,
      process.env.DISCORD_COMMENTATORS_ROLE_ID,
    ].filter((id): id is string => Boolean(id?.trim()));
    const channelManagerRoleIds = [
      process.env.DISCORD_ADMINISTRATOR_ROLE_ID,
      process.env.DISCORD_MODERATOR_ROLE_ID,
      process.env.DISCORD_COMMUNITY_MANAGER_ROLE_ID,
      process.env.DISCORD_TOURNAMENT_MANAGER_ROLE_ID,
    ].filter((id): id is string => Boolean(id?.trim()));
    const roleIds = [...new Set([...staffRoleIds, connectRoleId])];
    const fetchedRoles = await Promise.all(roleIds.map(async (id) => {
      const role = await guild.roles.fetch(id);
      if (!role) throw new Error(`Discord access role ${id} was not found in the configured guild.`);
      return role;
    }));
    // Guild administrators bypass channel overwrites, so no explicit override
    // is needed for those roles.
    const roles = fetchedRoles.filter((role) => !role.permissions.has(PermissionFlagsBits.Administrator));
    const staffIds = new Set(staffRoleIds);
    const viewOnlyRoleId = process.env.DISCORD_ROLE_ID?.trim();

    await channel.permissionOverwrites.set([
      {
        // Hide private team channels from everyone by default.
        id: guild.roles.everyone.id,
        type: OverwriteType.Role,
        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      },
      ...(viewOnlyRoleId && !staffIds.has(viewOnlyRoleId) && viewOnlyRoleId !== connectRoleId ? [{
        id: viewOnlyRoleId,
        type: OverwriteType.Role,
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [PermissionFlagsBits.Connect],
      }] : []),
      ...roles.map((role) => ({
        id: role.id,
        type: OverwriteType.Role,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.UseVAD,
          PermissionFlagsBits.Stream,
          ...(channelManagerRoleIds.includes(role.id) ? [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers,
          ] : []),
        ],
      })),
    ]);

    console.log(`✅ Permissions set on channel "${channel.name}"`);
  } catch (err) {
    console.error(`❌ Failed to set permissions on channel ${channelId}:`, err);
    permissionError('set channel access', err, 'The bot needs effective Manage Roles permission in this channel. If the channel belongs to a category, explicitly allow Manage Roles for the bot role in that category; a guild-level allow can be blocked by a category overwrite. Staff-role position does not need to be above the bot for a channel overwrite.');
  }
};

export const removeRoleFromUser = async (discordId: string, roleId: string): Promise<void> => {
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  const member = await guild.members.fetch(discordId).catch(() => null);
  if (member?.roles.cache.has(roleId)) await member.roles.remove(roleId);
};

export const deleteVoiceChannel = async (channelId: string): Promise<void> => {
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (channel) {
    try { await channel.delete('Tournament Discord cleanup'); }
    catch (error) { permissionError('delete a generated channel', error, 'The bot needs Manage Channels for this channel.'); }
  }
};

export const deleteTeamRole = async (roleId: string): Promise<void> => {
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  const role = await guild.roles.fetch(roleId).catch(() => null);
  if (role && role.id !== guild.roles.everyone.id) {
    try { await role.delete('Tournament Discord cleanup'); }
    catch (error) { permissionError('delete a generated team role', error, 'The bot needs Manage Roles, and its highest role must be above that team role.'); }
  }
};


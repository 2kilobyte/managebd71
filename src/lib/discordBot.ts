import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, GatewayIntentBits, OverwriteType, PermissionFlagsBits } from 'discord.js';
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

export const createDiscordServerInvite = async (): Promise<string> => {
  const configuredInviteUrl = process.env.DISCORD_SERVER_INVITE_URL?.trim();
  if (configuredInviteUrl) {
    let parsedInvite: URL;
    try { parsedInvite = new URL(configuredInviteUrl); }
    catch { throw new Error('DISCORD_SERVER_INVITE_URL must be a valid Discord invite URL.'); }
    const isDiscordInviteHost = parsedInvite.hostname === 'discord.gg'
      || parsedInvite.hostname === 'www.discord.gg'
      || parsedInvite.hostname === 'discord.com'
      || parsedInvite.hostname === 'www.discord.com';
    const hasInviteCode = parsedInvite.hostname.includes('discord.gg')
      ? parsedInvite.pathname.length > 1
      : /^\/invite\/[^/]+\/?$/.test(parsedInvite.pathname);
    if (parsedInvite.protocol !== 'https:' || !isDiscordInviteHost || !hasInviteCode) {
      throw new Error('DISCORD_SERVER_INVITE_URL must be an https://discord.gg/... or https://discord.com/invite/... link.');
    }
    return configuredInviteUrl;
  }

  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  const botMember = await guild.members.fetchMe();
  const preferredChannelId = process.env.DISCORD_INVITE_CHANNEL_ID?.trim();
  const channels = await guild.channels.fetch();
  const publicTextChannels = [...channels.values()]
    .filter((channel) => channel?.isTextBased())
    .filter((channel) => Boolean(channel && 'createInvite' in channel))
    .filter((channel) => channel!.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel))
    .filter((channel) => channel!.permissionsFor(botMember)?.has(PermissionFlagsBits.CreateInstantInvite));

  const channel = preferredChannelId
    ? publicTextChannels.find((candidate) => candidate?.id === preferredChannelId)
    : publicTextChannels.find((candidate) => candidate?.id === guild.systemChannelId) ?? publicTextChannels[0];
  if (!channel || !channel.isTextBased() || !('createInvite' in channel)) {
    throw new Error('No public Discord text channel is available for an invite. Set DISCORD_INVITE_CHANNEL_ID to a public welcome channel where the bot can create invites.');
  }

  const invite = await channel.createInvite({
    maxAge: 60 * 60 * 24 * 7,
    maxUses: 0,
    unique: false,
    reason: 'Tournament team member onboarding',
  });
  return invite.url;
};

export const sendTournamentInviteDM = async (
  discordId: string,
  tournamentName: string,
  teamName: string,
  inviteUrl: string,
): Promise<void> => {
  await ensureReady();
  const user = await client.users.fetch(discordId);
  await user.send({
    content: `You are part of the **${teamName}** team for **${tournamentName}**. Please join this Discord server to access your team channel.`,
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Join this Discord server').setURL(inviteUrl),
    )],
  });
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

export const removeRoleFromUser = async (
  discordId: string,
  roleId: string,
): Promise<'member-left' | 'already-absent' | 'removed'> => {
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  let member;
  try {
    member = await guild.members.fetch({ user: discordId, force: true });
  } catch (error) {
    if (Number((error as { code?: unknown })?.code) === 10007) return 'member-left';
    throw error;
  }
  if (!member.roles.cache.has(roleId)) return 'already-absent';
  try {
    await member.roles.remove(roleId, 'Tournament Discord cleanup');
    return 'removed';
  } catch (error) {
    // A role that was already deleted needs no further cleanup.
    if (Number((error as { code?: unknown })?.code) === 10011) return 'already-absent';
    return permissionError('remove a setup-assigned role', error, 'The bot needs Manage Roles, and its highest role must be above the role it is removing.');
  }
};

export const deleteVoiceChannel = async (channelId: string): Promise<void> => {
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  let channel;
  try {
    channel = await guild.channels.fetch(channelId, { force: true });
  } catch (error) {
    if (Number((error as { code?: unknown })?.code) === 10003) return;
    throw error;
  }
  if (channel) {
    try { await channel.delete('Tournament Discord cleanup'); }
    catch (error) {
      if (Number((error as { code?: unknown })?.code) === 10003) return;
      permissionError('delete a generated channel', error, 'The bot needs Manage Channels for this channel.');
    }
  }
};

export const deleteTeamRole = async (roleId: string): Promise<void> => {
  await ensureReady();
  const guild = await client.guilds.fetch(process.env.GUILD_ID!);
  let role;
  try {
    role = await guild.roles.fetch(roleId, { force: true });
  } catch (error) {
    if (Number((error as { code?: unknown })?.code) === 10011) return;
    throw error;
  }
  if (role && role.id !== guild.roles.everyone.id) {
    try { await role.delete('Tournament Discord cleanup'); }
    catch (error) {
      if (Number((error as { code?: unknown })?.code) === 10011) return;
      permissionError('delete a generated team role', error, 'The bot needs Manage Roles, and its highest role must be above that team role.');
    }
  }
};


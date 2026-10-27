import {
  assignRoleToUser,
  createRoleForTeam,
  createDiscordServerInvite,
  createVoiceChannel,
  deleteTeamRole,
  deleteVoiceChannel,
  removeRoleFromUser,
  sendTournamentInviteDM,
  setChannelPermissions,
  validateDiscordSetupPermissions,
} from '@/lib/discordBot';
import clientPromise from '@/lib/mongodb';
import { timingSafeEqual } from 'node:crypto';
import { ObjectId, type Db, type Document } from 'mongodb';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RoleGrant = { userId: string; roleId: string; addedBySetup: boolean };
type SkippedRoleGrant = { userId: string; teamName: string; roleName: string; reason: string };
type InviteNotice = { userId: string; teamName: string; status: 'sent' | 'failed'; reason?: string };
type SetupChannel = { id: string; name: string; teamName: string };
type SetupRole = { id: string; name: string; createdBySetup: boolean };
type SetupRun = Document & {
  tournamentId: string;
  status: 'running' | 'completed' | 'failed' | 'cleaned' | 'cleanup-partial';
  createdAt: Date;
  updatedAt: Date;
  channels: SetupChannel[];
  roles: SetupRole[];
  roleGrants: RoleGrant[];
  skippedRoleGrants?: SkippedRoleGrant[];
  inviteNotices?: InviteNotice[];
  missingMemberCount?: number;
  inviteTrackingEnabled?: boolean;
  error?: string;
};

const HISTORY_COLLECTION = 'tournamentDiscordSetupHistory';

async function tournamentHistoryCollection(db: Db) {
  const history = db.collection(HISTORY_COLLECTION);
  await history.createIndex({ tournamentId: 1, createdAt: -1 });
  return history;
}

async function migrateLegacyHistory(db: Db, tournamentId: string) {
  const legacy = await db.collection('discordSetupRuns').find({ tournamentId }).toArray();
  const history = await tournamentHistoryCollection(db);
  for (const entry of legacy) {
    const { _id, ...document } = entry;
    await history.updateOne({ _id }, { $setOnInsert: document } as never, { upsert: true });
  }
  return history;
}

function authError(request: Request) {
  const expected = (process.env.BD71_LIVE_SCORE_ADMIN_SECRET ?? '').trim();
  const supplied = (request.headers.get('x-bd71-admin-secret') ?? '').trim();
  if (expected.length < 32) return 'Admin secret is not configured on this server.';
  if (!supplied) return 'Enter the Admin access key to manage Discord setup.';
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes)
    ? null
    : 'Admin access key is invalid.';
}

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function isUnknownMemberError(error: unknown) {
  const discordError = error as { code?: unknown; rawError?: { code?: unknown }; message?: string };
  const code = Number(discordError?.code ?? discordError?.rawError?.code);
  return code === 10007 || /unknown member/i.test(discordError?.message ?? '');
}

function tournamentParam(request: Request) {
  const tournamentId = new URL(request.url).searchParams.get('tournamentId') ?? '';
  return ObjectId.isValid(tournamentId) ? tournamentId : '';
}

export async function GET(request: Request) {
  const denied = authError(request);
  if (denied) return fail(denied.includes('not configured') ? 503 : 401, denied);
  const tournamentId = tournamentParam(request);
  if (!tournamentId) return fail(400, 'A valid tournamentId is required.');
  try {
    const db = (await clientPromise).db('bd71');
    const history = await migrateLegacyHistory(db, tournamentId);
    const runs = await history
      .find({ tournamentId }, { projection: { status: 1, createdAt: 1, updatedAt: 1, channels: 1, roles: 1, roleGrants: 1, skippedRoleGrants: 1, inviteNotices: 1, missingMemberCount: 1, inviteTrackingEnabled: 1, error: 1 } })
      .sort({ createdAt: -1 }).limit(10).toArray() as unknown as SetupRun[];
    return NextResponse.json({ runs: runs.map((run) => ({
      id: run._id.toString(), status: run.status, createdAt: run.createdAt,
      channelCount: run.channels?.length ?? 0,
      createdRoleCount: run.roles?.filter((role) => role.createdBySetup).length ?? 0,
      roleGrantCount: run.roleGrants?.length ?? 0,
      skippedRoleGrants: run.skippedRoleGrants ?? [],
      inviteNotices: run.inviteNotices ?? [],
      missingMemberCount: run.missingMemberCount ?? 0,
      inviteTrackingEnabled: run.inviteTrackingEnabled === true,
      error: run.error,
    })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Discord setup history error:', error);
    return fail(500, 'Could not load Discord setup history.');
  }
}

export async function POST(request: Request) {
  const denied = authError(request);
  if (denied) return fail(denied.includes('not configured') ? 503 : 401, denied);
  const tournamentId = tournamentParam(request);
  if (!tournamentId) return fail(400, 'A valid tournamentId is required.');

  const db = (await clientPromise).db('bd71');
  let teams: Document[] = [];
  let tournamentName = 'the tournament';
  try {
    const tournament = await db.collection('tournaments').findOne({ _id: new ObjectId(tournamentId) }, { projection: { tournamentName: 1 } });
    if (tournament?.tournamentName) tournamentName = String(tournament.tournamentName);
    teams = await db.collection('teams').find({ tournamentId, isApproved: true, isDisqualified: { $ne: true } }).sort({ teamGameId: 1 }).toArray();
    if (teams.length) await validateDiscordSetupPermissions();
  } catch (error) {
    console.error('Discord setup preflight failed:', error);
    return fail(500, error instanceof Error ? error.message : 'Discord setup preflight failed.');
  }
  const history = await tournamentHistoryCollection(db);
  const { insertedId } = await history.insertOne({
    tournamentId, status: 'running', createdAt: new Date(), updatedAt: new Date(),
    channels: [], roles: [], roleGrants: [], skippedRoleGrants: [], inviteNotices: [], inviteTrackingEnabled: true,
    });
  const runId = insertedId;
  const recordChannel = async (entry: SetupChannel) => history.updateOne({ _id: runId }, { $push: { channels: entry }, $set: { updatedAt: new Date() } } as never);
  const recordRole = async (entry: SetupRole) => history.updateOne({ _id: runId }, { $push: { roles: entry }, $set: { updatedAt: new Date() } } as never);
  const recordGrant = async (entry: RoleGrant) => history.updateOne({ _id: runId }, { $push: { roleGrants: entry }, $set: { updatedAt: new Date() } } as never);
  const recordSkippedGrant = async (entry: SkippedRoleGrant) => history.updateOne({ _id: runId }, { $push: { skippedRoleGrants: entry }, $set: { updatedAt: new Date() } } as never);
  const recordInviteNotice = async (entry: InviteNotice) => history.updateOne({ _id: runId }, { $push: { inviteNotices: entry }, $set: { updatedAt: new Date() } } as never);
  const invitedUsers = new Set<string>();
  let inviteUrlPromise: Promise<string> | undefined;
  const inviteMissingMember = async (userId: string, teamName: string) => {
    if (invitedUsers.has(userId)) return;
    invitedUsers.add(userId);
    await history.updateOne({ _id: runId }, { $inc: { missingMemberCount: 1 }, $set: { updatedAt: new Date() } });
    try {
      inviteUrlPromise ??= createDiscordServerInvite();
      const inviteUrl = await inviteUrlPromise;
      await sendTournamentInviteDM(userId, tournamentName, teamName, inviteUrl);
      await recordInviteNotice({ userId, teamName, status: 'sent' });
      console.info(`Sent Discord server invite DM to non-member ${userId} for ${teamName} (${tournamentName}).`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Could not send the Discord invite DM.';
      await recordInviteNotice({ userId, teamName, status: 'failed', reason });
      console.error(`Could not DM a Discord invite to ${userId} for ${teamName}: ${reason}`);
    }
  };

  try {
    if (!teams.length) {
      await history.updateOne({ _id: runId }, { $set: { status: 'completed', updatedAt: new Date() } });
      return NextResponse.json({ message: 'No eligible approved teams were found; an empty setup run was recorded.' });
    }

    for (const team of teams) {
      const teamName = String(team.teamName || team.name || `Team ${team.teamGameId ?? ''}`).trim();
      const channelName = String(team.name || `${team.teamGameId ?? ''}. ${teamName}`).trim().slice(0, 100);
      const role = await createRoleForTeam(teamName);
      await recordRole({ id: role.id, name: teamName, createdBySetup: role.created });
      const channelId = await createVoiceChannel(channelName, Array.isArray(team.players) ? team.players.length : 4);
      await recordChannel({ id: channelId, name: channelName, teamName });
      await setChannelPermissions(channelId, role.id);

      for (const player of Array.isArray(team.players) ? team.players : []) {
        const userId = String(player?.discordName ?? '').trim();
        const playerLabel = String(player?.ign ?? player?.fullName ?? 'Unknown player').trim();
        if (!/^\d{17,20}$/.test(userId)) {
          await recordSkippedGrant({ userId: userId || '(empty)', teamName, roleName: 'Member roles', reason: `Invalid Discord user ID for ${playerLabel}.` });
          continue;
        }
        const defaultRole = process.env.DISCORD_ROLE_ID?.trim();
        if (defaultRole) {
          try {
            const added = await assignRoleToUser(userId, defaultRole);
            await recordGrant({ userId, roleId: defaultRole, addedBySetup: added });
          } catch (error) {
            const missingMember = isUnknownMemberError(error);
            const reason = missingMember
              ? `Discord member not found in this server (${playerLabel}).`
              : `${error instanceof Error ? error.message : 'Could not assign the default role.'} (${playerLabel}).`;
            await recordSkippedGrant({ userId, teamName, roleName: 'Default member role', reason });
            console.warn(`Skipped default role grant for ${userId} in ${teamName}: ${reason}`);
            if (missingMember) await inviteMissingMember(userId, teamName);
            continue;
          }
        }
        try {
          const addedTeamRole = await assignRoleToUser(userId, role.id);
          await recordGrant({ userId, roleId: role.id, addedBySetup: addedTeamRole });
        } catch (error) {
          const missingMember = isUnknownMemberError(error);
          const reason = missingMember
            ? `Discord member not found in this server (${playerLabel}).`
            : `${error instanceof Error ? error.message : 'Could not assign the team role.'} (${playerLabel}).`;
          await recordSkippedGrant({ userId, teamName, roleName: teamName, reason });
          console.warn(`Skipped team role grant for ${userId} in ${teamName}: ${reason}`);
          if (missingMember) await inviteMissingMember(userId, teamName);
        }
      }
    }

    await history.updateOne({ _id: runId }, { $set: { status: 'completed', updatedAt: new Date() } });
    const completedRun = await history.findOne({ _id: runId }, { projection: { skippedRoleGrants: 1, inviteNotices: 1, missingMemberCount: 1 } });
    const skippedCount = completedRun?.skippedRoleGrants?.length ?? 0;
    const inviteSentCount = completedRun?.inviteNotices?.filter((item: InviteNotice) => item.status === 'sent').length ?? 0;
    const inviteFailedCount = completedRun?.inviteNotices?.filter((item: InviteNotice) => item.status === 'failed').length ?? 0;
    const missingMemberCount = completedRun?.missingMemberCount ?? 0;
    return NextResponse.json({
      message: `Discord setup completed for ${teams.length} eligible approved teams. Non-members found: ${missingMemberCount}; invite DMs sent: ${inviteSentCount}; failed: ${inviteFailedCount}.${skippedCount ? ` Skipped ${skippedCount} member role grant(s); see setup history for details.` : ''}`,
      runId: runId.toString(), skippedRoleGrantCount: skippedCount, missingMemberCount, inviteSentCount, inviteFailedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discord setup failed.';
    await history.updateOne({ _id: runId }, { $set: { status: 'failed', error: message, updatedAt: new Date() } });
    console.error('Discord setup failed:', error);
    return fail(500, `Discord setup stopped partway through. Its history was saved so cleanup can remove created items. ${message}`);
  }
}

export async function DELETE(request: Request) {
  const denied = authError(request);
  if (denied) return fail(denied.includes('not configured') ? 503 : 401, denied);
  const tournamentId = tournamentParam(request);
  if (!tournamentId) return fail(400, 'A valid tournamentId is required.');

  try {
    const db = (await clientPromise).db('bd71');
    const history = await migrateLegacyHistory(db, tournamentId);
    const runs = await history.find({ tournamentId, status: { $ne: 'cleaned' } }).toArray() as unknown as SetupRun[];
    if (!runs.length) return NextResponse.json({ message: 'There are no generated Discord items to clean up.' });
    const activeRuns = runs.filter((run) => run.status !== 'cleaned');
    const errors: string[] = [];
    let skippedLeftMembers = 0;

    // Revoke only grants with recorded setup ownership, and keep them while any
    // other active tournament setup still references the same member and role.
    const grants = new Map<string, RoleGrant>();
    for (const run of activeRuns) for (const grant of run.roleGrants ?? []) {
      if (!grant.addedBySetup) continue;
      grants.set(`${grant.userId}:${grant.roleId}`, grant);
    }
    for (const grant of grants.values()) {
      const referencedElsewhere = await history.findOne({
        _id: { $nin: activeRuns.map((run) => run._id) }, status: { $ne: 'cleaned' },
        roleGrants: { $elemMatch: { userId: grant.userId, roleId: grant.roleId } },
      });
      if (referencedElsewhere) continue;
      try {
        if (await removeRoleFromUser(grant.userId, grant.roleId) === 'member-left') skippedLeftMembers += 1;
      }
      catch (error) { errors.push(`Could not remove role ${grant.roleId} from ${grant.userId}: ${error instanceof Error ? error.message : 'unknown error'}`); }
    }

    const channelIds = [...new Set(activeRuns.flatMap((run) => (run.channels ?? []).map((channel) => channel.id)))];
    const failedChannelIds = new Set<string>();
    for (const channelId of channelIds) {
      try { await deleteVoiceChannel(channelId); }
      catch (error) { failedChannelIds.add(channelId); errors.push(`Could not delete channel ${channelId}: ${error instanceof Error ? error.message : 'unknown error'}`); }
    }

    const createdRoles = new Map<string, SetupRole>();
    for (const run of activeRuns) for (const role of run.roles ?? []) if (role.createdBySetup) createdRoles.set(role.id, role);
    for (const role of createdRoles.values()) {
      const linkedChannels = activeRuns.flatMap((run) => (run.channels ?? []).filter((channel) => channel.teamName === role.name));
      if (linkedChannels.some((channel) => failedChannelIds.has(channel.id))) continue;
      const referencedElsewhere = await history.findOne({
        _id: { $nin: activeRuns.map((run) => run._id) }, status: { $ne: 'cleaned' },
        roles: { $elemMatch: { id: role.id } },
      });
      if (referencedElsewhere) continue;
      try { await deleteTeamRole(role.id); }
      catch (error) { errors.push(`Could not delete role ${role.name}: ${error instanceof Error ? error.message : 'unknown error'}`); }
    }

    const status = errors.length ? 'cleanup-partial' : 'cleaned';
    await history.updateMany({ _id: { $in: activeRuns.map((run) => run._id) } }, {
      $set: { status, updatedAt: new Date(), ...(errors.length ? { error: errors.join(' | ').slice(0, 1500) } : {}) },
      ...(errors.length ? {} : { $unset: { error: '' } }),
    });
    return NextResponse.json({
      message: errors.length ? `Cleanup finished with ${errors.length} issue(s). Retry cleanup after fixing the listed Discord permissions.` : `Cleanup completed: ${channelIds.length} generated channel(s), ${createdRoles.size} setup-created role(s), and setup-added member role grants were removed.${skippedLeftMembers ? ` Skipped ${skippedLeftMembers} member role grant(s) because those members had already left the server.` : ''}`,
      errors,
    }, { status: errors.length ? 207 : 200 });
  } catch (error) {
    console.error('Discord cleanup failed:', error);
    return fail(500, 'Discord cleanup failed. The saved history is still available to retry.');
  }
}

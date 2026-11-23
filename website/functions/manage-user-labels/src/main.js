import { Client, Users, TablesDB, Query } from 'node-appwrite';

// manage-user-labels
// ---------------------------------------------------------------------------
// Admin-only. Reads / sets Appwrite Auth labels AND mirrors role + labels into
// the ronakbyali_users row in one call. If the table write fails the labels
// are rolled back, so Auth and the table never disagree.
//
// POST body (JSON):
//   { action: 'get', userId }
//        -> { ok, userId, labels, role }       live labels from Auth (+ table role)
//   { action: 'set', userId, role, labels: [...] }
//        -> { ok, userId, role, labels, profile }
//           `labels` = EXTRA labels only (admin / support / manager come from `role`)
//
// 'getAccess' and 'setAccess' are accepted as aliases of 'get' and 'set'.
//
// Always answers with JSON:
//   success -> { ok: true, ... }
//   failure -> { ok: false, message, error }   (`error` = same text, for older clients)
//
// Required in Function > Settings > Scopes:
//   users.read, users.write, rows.read, rows.write
// Function > Settings > Execute access: "Users" is enough (admin is checked here).

const DATABASE_ID = process.env.DATABASE_ID || '6ae9c630001237f0900e';
const TABLE_ID = process.env.USERS_TABLE_ID || 'ronakbyali_users';

const STAFF = ['admin', 'support', 'manager']; // real Auth labels
const TABLE_ONLY = ['customer', 'loyal', 'new']; // stored in the table only
const ALL_ROLES = [...STAFF, ...TABLE_ONLY];

const LABEL_RE = /^[a-zA-Z0-9]{1,36}$/; // Appwrite: letters + digits, max 36
const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/; // Appwrite id rules
const MAX_EXTRA = 10;

const ACTIONS = {
  get: 'get',
  getaccess: 'get',
  set: 'set',
  setaccess: 'set',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const unique = (list) => [...new Set(list)];

// Appwrite "not found" -> null; anything else (scopes, network...) is re-thrown
// so real problems are not hidden behind a fake "does not exist".
async function orNull(promise) {
  try {
    return await promise;
  } catch (err) {
    if (err?.code === 404) return null;
    throw err;
  }
}

function readBody(req) {
  try {
    const body =
      typeof req.bodyJson === 'object' && req.bodyJson
        ? req.bodyJson
        : JSON.parse(req.bodyText || '{}');
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
    return body;
  } catch {
    throw new HttpError(400, 'Invalid JSON body.');
  }
}

// Validates the "extra labels" list and returns it cleaned.
function cleanExtras(input) {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) throw new HttpError(400, '"labels" must be an array.');

  const extras = unique(input.map((l) => String(l).trim()).filter(Boolean));
  if (extras.length > MAX_EXTRA) throw new HttpError(400, `Use at most ${MAX_EXTRA} extra labels.`);

  for (const label of extras) {
    if (!LABEL_RE.test(label)) {
      throw new HttpError(400, `"${label}" is not valid. Use letters and numbers only (max 36).`);
    }
    if (ALL_ROLES.includes(label.toLowerCase())) {
      throw new HttpError(400, `"${label}" is a role. Choose it in the Role field.`);
    }
  }
  return extras;
}

export default async ({ req, res, log, error: logError }) => {
  const fail = (status, message) => res.json({ ok: false, message, error: message }, status);
  let callerVerified = false;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');

    const callerId = req.headers['x-appwrite-user-id'];
    const key = req.headers['x-appwrite-key'];
    if (!callerId) throw new HttpError(401, 'You must be signed in.');
    if (!key) {
      throw new HttpError(500, 'Function has no API key. Enable the scopes in Function > Settings > Scopes.');
    }

    const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
    if (!endpoint || !projectId) throw new HttpError(500, 'Function environment is incomplete.');

    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(key);
    const users = new Users(client);
    const tables = new TablesDB(client);

    // 1. Caller must be an enabled account with the admin label.
    const caller = await orNull(users.get({ userId: callerId }));
    if (!caller) throw new HttpError(401, 'Your account was not found.');
    if (!caller.status || !(caller.labels || []).includes('admin')) {
      throw new HttpError(403, 'Only admins can manage labels.');
    }
    callerVerified = true;

    // 2. Read + validate the request (cheap checks first, before any lookups).
    const body = readBody(req);

    const action = ACTIONS[String(body.action ?? 'set').toLowerCase()];
    if (!action) throw new HttpError(400, 'Unknown action. Use "get" or "set".');

    const { userId, role } = body;
    if (typeof userId !== 'string' || !userId) throw new HttpError(400, 'userId is required.');
    if (!ID_RE.test(userId)) throw new HttpError(400, 'userId is not a valid Appwrite id.');

    let extras = [];
    if (action === 'set') {
      if (userId === callerId) throw new HttpError(403, 'You cannot change your own access.');
      if (!ALL_ROLES.includes(role)) throw new HttpError(400, 'Invalid role.');
      extras = cleanExtras(body.labels);
    }

    // 3. Load the target account.
    const target = await orNull(users.get({ userId }));
    if (!target) throw new HttpError(404, 'That user does not exist in Appwrite Auth.');
    const currentLabels = target.labels || [];

    // ---- get ---------------------------------------------------------------
    if (action === 'get') {
      // The table role is a nice-to-have here; never block reading labels on it.
      const row = await orNull(
        tables.getRow({ databaseId: DATABASE_ID, tableId: TABLE_ID, rowId: userId }),
      ).catch((err) => {
        logError(`get: could not read users row: ${err?.message}`);
        return null;
      });
      return res.json({ ok: true, userId, labels: currentLabels, role: row?.role ?? null });
    }

    // ---- set ---------------------------------------------------------------
    const row = await orNull(
      tables.getRow({ databaseId: DATABASE_ID, tableId: TABLE_ID, rowId: userId }),
    );
    if (!row) throw new HttpError(404, 'This user has no profile row in the users table.');

    // staff roles are real labels; customer / loyal / new are table-only
    const nextLabels = unique([...(STAFF.includes(role) ? [role] : []), ...extras]);

    // Never remove the last admin.
    const hadAdmin = currentLabels.includes('admin') || row.role === 'admin';
    if (hadAdmin && !nextLabels.includes('admin')) {
      const admins = await tables.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [Query.equal('role', 'admin'), Query.limit(5)],
      });
      if (!admins.rows.some((r) => r.$id !== userId)) {
        throw new HttpError(409, 'This is the last admin. Make someone else an admin first.');
      }
    }

    // Write Auth labels first, then the table mirror; roll back on failure.
    await users.updateLabels({ userId, labels: nextLabels });
    try {
      const profile = await tables.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: userId,
        data: { role, labels: nextLabels },
      });
      log(`labels updated for ${userId} by ${callerId}: role=${role} labels=[${nextLabels.join(',')}]`);
      return res.json({ ok: true, userId, role, labels: nextLabels, profile });
    } catch (tableError) {
      logError(`Table write failed for ${userId}: ${tableError?.message}`);
      try {
        await users.updateLabels({ userId, labels: currentLabels });
      } catch (rollbackError) {
        logError(`ROLLBACK FAILED for ${userId}: ${rollbackError?.message}. Auth labels now: [${nextLabels.join(',')}]`);
        throw new HttpError(
          500,
          'The users table could not be updated and the labels could not be rolled back. Open this user again and re-save to fix it.',
        );
      }
      throw new HttpError(
        500,
        `Could not update the users table (${tableError?.message || 'unknown error'}). Nothing was changed.`,
      );
    }
  } catch (err) {
    if (err instanceof HttpError) return fail(err.status, err.message);

    logError(`${err?.code ?? ''} ${err?.message ?? err}`);
    // Only admins get the underlying Appwrite message (e.g. a missing scope).
    const detail = callerVerified && err?.message ? ` (${err.message})` : '';
    return fail(500, `Something went wrong${detail}.`);
  }
};
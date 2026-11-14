import { Client, Users, TablesDB, Query } from 'node-appwrite';

// manage-user-labels
// ---------------------------------------------------------------------------
// Admin-only. Sets Appwrite Auth labels AND mirrors role + labels into the
// ronakbyali_users row, in one call. If the table write fails the labels are
// rolled back, so Auth and the table never disagree.
//
// POST body:
//   { action: 'get', userId }                       -> live labels from Auth
//   { action: 'set', userId, role, labels: [...] }  -> `labels` = EXTRA labels only
//                                                      (admin/support/manager come from `role`)
// Always answers with JSON { ok: true|false, ... }.

const DATABASE_ID = process.env.DATABASE_ID || '6ae9c630001237f0900e';
const TABLE_ID = process.env.USERS_TABLE_ID || 'ronakbyali_users';

const STAFF = ['admin', 'support', 'manager'];
const ALL_ROLES = [...STAFF, 'customer', 'loyal', 'new'];
const LABEL_RE = /^[a-zA-Z0-9]{1,36}$/; // Appwrite: letters + digits, max 36
const MAX_EXTRA = 10;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const unique = (list) => [...new Set(list)];

export default async ({ req, res, error: logError }) => {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');

    const callerId = req.headers['x-appwrite-user-id'];
    const key = req.headers['x-appwrite-key'];
    if (!callerId) throw new HttpError(401, 'You must be signed in.');
    if (!key) throw new HttpError(500, 'Function has no API key. Enable the scopes in Function > Settings > Scopes.');

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(key);
    const users = new Users(client);
    const tables = new TablesDB(client);

    // 1. Caller must be an enabled account with the admin label.
    const caller = await users.get({ userId: callerId });
    if (!caller.status || !(caller.labels || []).includes('admin')) {
      throw new HttpError(403, 'Only admins can manage labels.');
    }

    // 2. Read the request.
    let body = {};
    try {
      body = typeof req.bodyJson === 'object' && req.bodyJson ? req.bodyJson : JSON.parse(req.bodyText || '{}');
    } catch {
      throw new HttpError(400, 'Invalid JSON body.');
    }
    const { action = 'set', userId, role } = body;
    if (typeof userId !== 'string' || !userId) throw new HttpError(400, 'userId is required.');

    const target = await users.get({ userId }).catch(() => null);
    if (!target) throw new HttpError(404, 'That user does not exist in Appwrite Auth.');
    const currentLabels = target.labels || [];

    if (action === 'get') {
      return res.json({ ok: true, userId, labels: currentLabels });
    }
    if (action !== 'set') throw new HttpError(400, 'Unknown action.');

    // 3. Validate.
    if (userId === callerId) throw new HttpError(403, 'You cannot change your own access.');
    if (!ALL_ROLES.includes(role)) throw new HttpError(400, 'Invalid role.');

    const extras = unique(Array.isArray(body.labels) ? body.labels.map(String) : []);
    if (extras.length > MAX_EXTRA) throw new HttpError(400, `Use at most ${MAX_EXTRA} extra labels.`);
    for (const label of extras) {
      if (!LABEL_RE.test(label)) throw new HttpError(400, `"${label}" is not valid. Use letters and numbers only (max 36).`);
      if (ALL_ROLES.includes(label.toLowerCase())) throw new HttpError(400, `"${label}" is a role. Choose it in the Role field.`);
    }

    const row = await tables
      .getRow({ databaseId: DATABASE_ID, tableId: TABLE_ID, rowId: userId })
      .catch(() => null);
    if (!row) throw new HttpError(404, 'This user has no profile row in the users table.');

    // staff roles are real labels; customer / loyal / new are table-only
    const nextLabels = unique([...(STAFF.includes(role) ? [role] : []), ...extras]);

    // 4. Never remove the last admin.
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

    // 5. Write Auth labels, then the table mirror; roll back on failure.
    await users.updateLabels({ userId, labels: nextLabels });
    try {
      const profile = await tables.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: userId,
        data: { role, labels: nextLabels },
      });
      return res.json({ ok: true, userId, role, labels: nextLabels, profile });
    } catch (tableError) {
      await users.updateLabels({ userId, labels: currentLabels }).catch(() => {});
      logError(`Table write failed, labels rolled back: ${tableError.message}`);
      throw new HttpError(500, 'Could not update the users table (is the "labels" column created?). Nothing was changed.');
    }
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (!(err instanceof HttpError)) logError(err.message);
    return res.json({ ok: false, message: err instanceof HttpError ? err.message : 'Something went wrong.' }, status);
  }
};

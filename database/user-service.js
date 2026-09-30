import { createHash, pbkdf2, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db.js';

const deriveBits = promisify(pbkdf2);
const PASSWORD_ITERATIONS = 600_000;
const PASSWORD_BYTES = 32;
const SESSION_DAYS = 30;
const ROLE_VALUES = new Set(['member', 'admin', 'super_admin']);
const DUMMY_SALT = Buffer.alloc(16, 41);
const DUMMY_HASH = pbkdf2Sync('not-a-real-password', DUMMY_SALT, PASSWORD_ITERATIONS, PASSWORD_BYTES, 'sha256');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.display_name,
    email: row.email,
    role: row.role,
    profile: row.profile_data || {},
    profilePhoto: row.profile_photo || null,
    createdAt: row.created_at,
    disabled: Boolean(row.disabled_at),
  };
}

function safeTokenMatch(supplied, expected) {
  const actualBytes = Buffer.from(String(supplied || ''));
  const expectedBytes = Buffer.from(String(expected || ''));
  return actualBytes.length === expectedBytes.length && actualBytes.length > 0 && timingSafeEqual(actualBytes, expectedBytes);
}

function validateCredentials(input) {
  const { name, email, password } = input;
  const normalizedEmail = normalizeEmail(email);
  const displayName = String(name || '').trim();
  const rawPassword = String(password || '');
  if (displayName.length < 1 || displayName.length > 120) throw Object.assign(new Error('Nama harus berisi 1 sampai 120 karakter.'), { status: 400 });
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw Object.assign(new Error('Format email tidak valid.'), { status: 400 });
  if (rawPassword.length < 12 || rawPassword.length > 256) throw Object.assign(new Error('Kata sandi harus berisi 12 sampai 256 karakter.'), { status: 400 });
  const profile = input.profile && typeof input.profile === 'object' ? input.profile : {};
  const profileValues = {
    phone: String(profile.phone || '').trim(),
    organization: String(profile.organization || '').trim(),
    position: String(profile.position || '').trim(),
    province: String(profile.province || '').trim(),
    city: String(profile.city || '').trim(),
    interest: String(profile.interest || '').trim(),
    linkedin: String(profile.linkedin || '').trim(),
    bio: String(profile.bio || '').trim(),
  };
  if (Object.values(profileValues).some(value => value.length > 500)) throw Object.assign(new Error('Data profil melebihi batas karakter.'), { status: 400 });
  const profilePhoto = String(input.profilePhoto || '');
  if (profilePhoto) {
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(profilePhoto);
    const image = match ? Buffer.from(match[2], 'base64') : null;
    const validSignature = image && (match[1] === 'jpeg' ? image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff : match[1] === 'png' ? image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP');
    if (!validSignature || image.length > 2 * 1024 * 1024) throw Object.assign(new Error('Foto profil harus JPG, PNG, atau WebP dengan ukuran maksimum 2 MB.'), { status: 400 });
  }
  return { displayName, email: normalizedEmail, password: rawPassword, profile: profileValues, profilePhoto: profilePhoto || null };
}

async function createPasswordRecord(password) {
  const salt = randomBytes(16);
  const hash = await deriveBits(password, salt, PASSWORD_ITERATIONS, PASSWORD_BYTES, 'sha256');
  return {
    passwordHash: hash.toString('base64'),
    passwordSalt: salt.toString('base64'),
    passwordIterations: PASSWORD_ITERATIONS,
  };
}

async function verifyPassword(password, user) {
  const salt = user ? Buffer.from(user.password_salt, 'base64') : DUMMY_SALT;
  const expected = user ? Buffer.from(user.password_hash, 'base64') : DUMMY_HASH;
  const iterations = user ? user.password_iterations : PASSWORD_ITERATIONS;
  const actual = await deriveBits(password, salt, iterations, PASSWORD_BYTES, 'sha256');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function audit(client, actorUserId, targetUserId, action, details = {}) {
  return client.query(
    `INSERT INTO app_user_audit_log (actor_user_id, target_user_id, action, details)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [actorUserId, targetUserId, action, JSON.stringify(details)],
  );
}

function normalizePgError(error) {
  if (error.code === '23505') return Object.assign(new Error('Email sudah terdaftar.'), { status: 409 });
  return error;
}

export async function registrationStatus() {
  const { rows } = await pool.query("SELECT EXISTS (SELECT 1 FROM app_users WHERE role = 'super_admin' AND disabled_at IS NULL) AS has_super_admin");
  return { bootstrapRequired: !rows[0].has_super_admin };
}

export async function registerUser(input) {
  const values = validateCredentials(input);
  const passwordRecord = await createPasswordRecord(values.password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(19820310, 1)');
    const { rows: admins } = await client.query("SELECT id FROM app_users WHERE role = 'super_admin' AND disabled_at IS NULL LIMIT 1");
    let role = 'member';
    let action = 'register';
    if (!admins.length) {
      if (!safeTokenMatch(input.bootstrapToken, process.env.BOOTSTRAP_ADMIN_TOKEN)) {
        throw Object.assign(new Error('Database belum memiliki Super Admin. Siapkan BOOTSTRAP_ADMIN_TOKEN untuk membuat akun pertama.'), { status: 403, code: 'bootstrap_required' });
      }
      role = 'super_admin';
      action = 'bootstrap';
    }
    const { rows } = await client.query(
      `INSERT INTO app_users (display_name, email, password_hash, password_salt, password_iterations, role, profile_data, profile_photo)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       RETURNING id, display_name, email, role, created_at, disabled_at, profile_data, profile_photo`,
      [values.displayName, values.email, passwordRecord.passwordHash, passwordRecord.passwordSalt, passwordRecord.passwordIterations, role, JSON.stringify(values.profile), values.profilePhoto],
    );
    await audit(client, rows[0].id, rows[0].id, action, { email: values.email, role });
    await client.query('COMMIT');
    const token = await createSession(rows[0].id);
    return { user: publicUser(rows[0]), token };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw normalizePgError(error);
  } finally {
    client.release();
  }
}

export async function loginUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const { rows } = await pool.query(
    `SELECT id, display_name, email, role, created_at, disabled_at, profile_data, profile_photo, password_hash, password_salt, password_iterations
     FROM app_users WHERE lower(email) = $1 LIMIT 1`,
    [normalizedEmail],
  );
  const user = rows[0];
  const validPassword = await verifyPassword(String(password || ''), user);
  if (!user || !validPassword || user.disabled_at) throw Object.assign(new Error('Email atau kata sandi tidak sesuai.'), { status: 401 });
  const token = await createSession(user.id);
  await pool.query("INSERT INTO app_user_audit_log (actor_user_id, target_user_id, action) VALUES ($1, $1, 'login')", [user.id]);
  return { user: publicUser(user), token };
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await pool.query('DELETE FROM app_user_sessions WHERE expires_at <= now()');
  await pool.query('INSERT INTO app_user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [tokenHash, userId, expiresAt]);
  return token;
}

export async function userForSession(token) {
  if (!token) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { rows } = await pool.query(
    `SELECT u.id, u.display_name, u.email, u.role, u.created_at, u.disabled_at, u.profile_data, u.profile_photo
     FROM app_user_sessions s JOIN app_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.disabled_at IS NULL LIMIT 1`,
    [tokenHash],
  );
  if (!rows[0]) return null;
  await pool.query('UPDATE app_user_sessions SET last_seen_at = now() WHERE token_hash = $1', [tokenHash]);
  return publicUser(rows[0]);
}

export async function revokeSession(token) {
  if (!token) return;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await pool.query('DELETE FROM app_user_sessions WHERE token_hash = $1', [tokenHash]);
}

export async function listUsers() {
  const { rows } = await pool.query(
    `SELECT id, display_name, email, role, created_at, disabled_at, profile_data, profile_photo
     FROM app_users ORDER BY created_at ASC`,
  );
  return rows.map(publicUser);
}

export async function createManagedUser(input, actor) {
  const values = validateCredentials(input);
  const role = String(input.role || 'member');
  if (!ROLE_VALUES.has(role)) throw Object.assign(new Error('Role tidak valid.'), { status: 400 });
  const passwordRecord = await createPasswordRecord(values.password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(19820310, 1)');
    const { rows } = await client.query(
      `INSERT INTO app_users (display_name, email, password_hash, password_salt, password_iterations, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, display_name, email, role, created_at, disabled_at`,
      [values.displayName, values.email, passwordRecord.passwordHash, passwordRecord.passwordSalt, passwordRecord.passwordIterations, role],
    );
    await audit(client, actor.id, rows[0].id, 'create', { email: values.email, role });
    await client.query('COMMIT');
    return publicUser(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw normalizePgError(error);
  } finally {
    client.release();
  }
}

export async function updateUserRole(userId, role, actor) {
  if (!ROLE_VALUES.has(role)) throw Object.assign(new Error('Role tidak valid.'), { status: 400 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(19820310, 1)');
    const { rows } = await client.query('SELECT id, email, role FROM app_users WHERE id = $1 AND disabled_at IS NULL FOR UPDATE', [userId]);
    const target = rows[0];
    if (!target) throw Object.assign(new Error('Akun tidak ditemukan.'), { status: 404 });
    if (target.id === actor.id) throw Object.assign(new Error('Role akun yang sedang dipakai tidak dapat diubah.'), { status: 400 });
    if (target.role === 'super_admin' && role !== 'super_admin') {
      const { rows: admins } = await client.query("SELECT count(*)::int AS count FROM app_users WHERE role = 'super_admin' AND disabled_at IS NULL");
      if (admins[0].count <= 1) throw Object.assign(new Error('Pertahankan minimal satu Super Admin.'), { status: 409 });
    }
    const updated = await client.query(
      'UPDATE app_users SET role = $1, updated_at = now() WHERE id = $2 RETURNING id, display_name, email, role, created_at, disabled_at',
      [role, userId],
    );
    await audit(client, actor.id, userId, 'role_change', { email: target.email, oldRole: target.role, newRole: role });
    await client.query('COMMIT');
    return publicUser(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteUser(userId, actor) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(19820310, 1)');
    const { rows } = await client.query('SELECT id, email, role FROM app_users WHERE id = $1 AND disabled_at IS NULL FOR UPDATE', [userId]);
    const target = rows[0];
    if (!target) throw Object.assign(new Error('Akun tidak ditemukan.'), { status: 404 });
    if (target.id === actor.id) throw Object.assign(new Error('Akun yang sedang dipakai tidak dapat dihapus.'), { status: 400 });
    if (target.role === 'super_admin') {
      const { rows: admins } = await client.query("SELECT count(*)::int AS count FROM app_users WHERE role = 'super_admin' AND disabled_at IS NULL");
      if (admins[0].count <= 1) throw Object.assign(new Error('Pertahankan minimal satu Super Admin.'), { status: 409 });
    }
    await audit(client, actor.id, userId, 'delete', { email: target.email, role: target.role });
    await client.query('DELETE FROM app_users WHERE id = $1', [userId]);
    await client.query('COMMIT');
    return { deleted: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

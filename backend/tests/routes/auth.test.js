import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

vi.mock('../../src/models/User.js', () => {
  const UserMock = vi.fn();
  UserMock.findOne = vi.fn();
  UserMock.findById = vi.fn();
  UserMock.updateOne = vi.fn().mockResolvedValue({});
  return { User: UserMock };
});

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_pw'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../src/utils/email.js', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    audit: vi.fn(),
    withReq: vi.fn().mockReturnValue({}),
  },
}));

vi.mock('../../src/utils/auth.js', () => ({
  COOKIE_NAME: 'quorum_token',
  signToken: vi.fn().mockReturnValue('fake-token'),
  setTokenCookie: vi.fn(),
  clearTokenCookie: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock('../../src/middleware/requireServiceAuth.js', () => ({
  requireServiceAuth: vi.fn(),
}));

import { User } from '../../src/models/User.js';
import bcrypt from 'bcrypt';
import { verifyToken, setTokenCookie, clearTokenCookie } from '../../src/utils/auth.js';
import { logger } from '../../src/utils/logger.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../src/utils/email.js';
import authRouter from '../../src/routes/auth.js';

// Returns a Promise with a `.select()` shim so both `await findOne(...)` and
// `await findOne(...).select(...)` resolve correctly.
function makeQuery(result) {
  const p = Promise.resolve(result);
  p.select = vi.fn().mockResolvedValue(result);
  return p;
}

function makeUser(overrides = {}) {
  return {
    _id: 'user123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed_pw',
    tokenVersion: 0,
    loginFailures: 0,
    loginLockedUntil: null,
    emailVerified: false,
    toPublicJSON: vi.fn().mockReturnValue({ _id: 'user123', email: 'test@example.com', username: 'testuser' }),
    ...overrides,
  };
}

let app;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/auth', authRouter);
});

beforeEach(() => {
  vi.resetAllMocks();
  bcrypt.hash.mockResolvedValue('hashed_pw');
  bcrypt.compare.mockResolvedValue(true);
  logger.withReq.mockReturnValue({});
  setTokenCookie.mockImplementation(() => {});
  clearTokenCookie.mockImplementation(() => {});
  verifyToken.mockReturnValue({ sub: 'user123', tokenVersion: 0 });
  sendVerificationEmail.mockResolvedValue(undefined);
  sendPasswordResetEmail.mockResolvedValue(undefined);
  User.findOne.mockImplementation(() => makeQuery(null));
  User.findById.mockImplementation(() => makeQuery(null));
  User.updateOne.mockResolvedValue({});
  User.mockImplementation(function(data) {
    this._id = 'new-user-id';
    Object.assign(this, data);
    this.save = vi.fn().mockResolvedValue(undefined);
    this.toPublicJSON = vi.fn().mockReturnValue({ _id: 'new-user-id', email: data.email, username: data.username });
  });
});

describe('POST /auth/register', () => {
  it('201 + user + sets cookie on valid body', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'new@example.com',
      username: 'newuser',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(setTokenCookie).toHaveBeenCalled();
  });

  it('400 on duplicate email or username', async () => {
    User.findOne.mockImplementation(() => makeQuery(makeUser()));

    const res = await request(app).post('/auth/register').send({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 on invalid email format', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'not-an-email',
      username: 'testuser',
      password: 'password123',
    });

    expect(res.status).toBe(400);
  });

  it('400 on password shorter than 8 chars', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'test@example.com',
      username: 'testuser',
      password: 'short',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('200 + user + sets cookie on valid credentials', async () => {
    User.findOne.mockImplementation(() => makeQuery(makeUser()));
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app).post('/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(setTokenCookie).toHaveBeenCalled();
  });

  it('401 on wrong password', async () => {
    User.findOne.mockImplementation(() => makeQuery(makeUser()));
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app).post('/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
  });

  it('401 on nonexistent email without leaking account presence', async () => {
    User.findOne.mockImplementation(() => makeQuery(null));
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app).post('/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('429 on locked account', async () => {
    User.findOne.mockImplementation(() =>
      makeQuery(makeUser({ loginLockedUntil: new Date(Date.now() + 60_000) }))
    );
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app).post('/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(429);
  });
});

describe('POST /auth/logout', () => {
  it('200 + clears cookie', async () => {
    const res = await request(app).post('/auth/logout');

    expect(res.status).toBe(200);
    expect(clearTokenCookie).toHaveBeenCalled();
  });
});

describe('GET /auth/me', () => {
  it('200 + user on valid JWT cookie', async () => {
    const user = makeUser();
    verifyToken.mockReturnValue({ sub: 'user123', tokenVersion: 0 });
    User.findById.mockImplementation(() => makeQuery(user));

    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', 'quorum_token=fake-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
  });

  it('401 on missing token', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/forgot-password', () => {
  it('200 + generic message for existing email', async () => {
    User.findOne.mockImplementation(() => makeQuery(makeUser()));

    const res = await request(app).post('/auth/forgot-password').send({
      email: 'test@example.com',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('200 + same generic message for nonexistent email (no leak)', async () => {
    const res = await request(app).post('/auth/forgot-password').send({
      email: 'nobody@example.com',
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('If an account with that email exists, a reset link has been sent.');
  });

  it('400 on invalid email format', async () => {
    const res = await request(app).post('/auth/forgot-password').send({
      email: 'not-an-email',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/reset-password', () => {
  it('200 on valid hashed token in DB', async () => {
    User.findOne.mockImplementation(() =>
      makeQuery(makeUser({ resetPasswordToken: 'hashed', resetPasswordExpires: new Date(Date.now() + 3_600_000) }))
    );

    const res = await request(app).post('/auth/reset-password').send({
      token: 'valid-raw-token',
      password: 'newpassword123',
    });

    expect(res.status).toBe(200);
  });

  it('400 on expired token', async () => {
    const res = await request(app).post('/auth/reset-password').send({
      token: 'expired-token',
      password: 'newpassword123',
    });

    expect(res.status).toBe(400);
  });

  it('400 on token not found in DB', async () => {
    const res = await request(app).post('/auth/reset-password').send({
      token: 'unknown-token',
      password: 'newpassword123',
    });

    expect(res.status).toBe(400);
  });

  it('400 on password shorter than 8 chars', async () => {
    const res = await request(app).post('/auth/reset-password').send({
      token: 'valid-raw-token',
      password: 'short',
    });

    expect(res.status).toBe(400);
  });
});

describe('GET /auth/verify-email', () => {
  it('200 on valid token', async () => {
    User.findOne.mockImplementation(() =>
      makeQuery(makeUser({ emailVerificationToken: 'hashed', emailVerificationExpires: new Date(Date.now() + 3_600_000) }))
    );

    const res = await request(app).get('/auth/verify-email?token=valid-token');

    expect(res.status).toBe(200);
  });

  it('400 on missing token', async () => {
    const res = await request(app).get('/auth/verify-email');

    expect(res.status).toBe(400);
  });
});

import { test, expect, vi, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// Mock server-only module first to prevent import errors in tests
vi.mock("server-only", () => ({}));

// Mock next/headers cookie module
const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock jose SignJWT
vi.mock("jose", () => ({
  SignJWT: class MockSignJWT {
    constructor(payload: unknown) {
      this.payload = payload;
    }
    payload: unknown;
    setProtectedHeader() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    async sign(secret: Uint8Array) {
      // Return a simple mock token containing the payload
      return `mock-jwt-token-${JSON.stringify(this.payload)}`;
    }
  },
  jwtVerify: vi.fn(async (token: string) => ({
    payload: {
      userId: "user-123",
      email: "user@example.com",
      expiresAt: new Date("2025-07-21T12:34:56.000Z"),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    },
  })),
}));

// Import auth functions after mocks are set up
import { createSession, getSession, deleteSession, verifySession } from "../auth";

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createSession tests
// ---------------------------------------------------------------------------

test("createSession: creates a JWT token with correct payload", async () => {
  await createSession("user-123", "user@example.com");

  // Verify that the cookie store's set method was called
  expect(mockCookieStore.set).toHaveBeenCalled();

  const call = mockCookieStore.set.mock.calls[0];
  const tokenName = call[0];
  const tokenValue = call[1];

  expect(tokenName).toBe("auth-token");
  // Token should contain the user data in the mock format
  expect(tokenValue).toContain("user-123");
  expect(tokenValue).toContain("user@example.com");
});

test("createSession: sets cookie with httpOnly=true", async () => {
  await createSession("user-123", "user@example.com");

  const call = mockCookieStore.set.mock.calls[0];
  const options = call[2];

  expect(options.httpOnly).toBe(true);
});

test("createSession: sets cookie with sameSite=lax", async () => {
  await createSession("user-123", "user@example.com");

  const call = mockCookieStore.set.mock.calls[0];
  const options = call[2];

  expect(options.sameSite).toBe("lax");
});

test("createSession: sets cookie with path=/", async () => {
  await createSession("user-123", "user@example.com");

  const call = mockCookieStore.set.mock.calls[0];
  const options = call[2];

  expect(options.path).toBe("/");
});

test("createSession: sets expiration to 7 days from now", async () => {
  const beforeTime = Date.now();

  await createSession("user-123", "user@example.com");

  const afterTime = Date.now();
  const call = mockCookieStore.set.mock.calls[0];
  const options = call[2];
  const expiresAt = options.expires as Date;

  // Calculate expected 7-day expiration window
  const expectedMinExpiry = beforeTime + 7 * 24 * 60 * 60 * 1000 - 1000; // -1s tolerance
  const expectedMaxExpiry = afterTime + 7 * 24 * 60 * 60 * 1000 + 1000; // +1s tolerance

  expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
  expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
});

test("createSession: sets secure=true in production", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  await createSession("user-123", "user@example.com");

  const call = mockCookieStore.set.mock.calls[0];
  const options = call[2];

  expect(options.secure).toBe(true);

  process.env.NODE_ENV = originalNodeEnv;
});

test("createSession: sets secure=false in development", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";

  await createSession("user-123", "user@example.com");

  const call = mockCookieStore.set.mock.calls[0];
  const options = call[2];

  expect(options.secure).toBe(false);

  process.env.NODE_ENV = originalNodeEnv;
});

test("createSession: includes user email in session payload", async () => {
  await createSession("user-456", "newuser@example.com");

  const call = mockCookieStore.set.mock.calls[0];
  const tokenValue = call[1];

  expect(tokenValue).toContain("newuser@example.com");
  expect(tokenValue).toContain("user-456");
});

// ---------------------------------------------------------------------------
// getSession tests
// ---------------------------------------------------------------------------

test("getSession: returns session payload when valid token exists", async () => {
  mockCookieStore.get.mockReturnValueOnce({
    value: "valid-token",
  });

  const session = await getSession();

  expect(session).toBeDefined();
  expect(session?.userId).toBe("user-123");
  expect(session?.email).toBe("user@example.com");
});

test("getSession: returns null when no token in cookie", async () => {
  mockCookieStore.get.mockReturnValueOnce(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession: calls cookies() to get the cookie store", async () => {
  const { cookies } = await import("next/headers");

  mockCookieStore.get.mockReturnValueOnce({
    value: "valid-token",
  });

  await getSession();

  expect(cookies).toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// deleteSession tests
// ---------------------------------------------------------------------------

test("deleteSession: calls delete on the cookie store", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

test("deleteSession: removes the auth token cookie", async () => {
  await deleteSession();

  // Verify delete was called exactly once
  expect(mockCookieStore.delete).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------------------
// verifySession tests
// ---------------------------------------------------------------------------

test("verifySession: returns session payload for valid token in request", async () => {
  const mockRequest = {
    cookies: {
      get: vi.fn().mockReturnValue({
        value: "valid-token",
      }),
    },
  } as unknown as NextRequest;

  const { jwtVerify } = await import("jose");

  const session = await verifySession(mockRequest);

  expect(session).toBeDefined();
  expect(session?.userId).toBe("user-123");
  expect(session?.email).toBe("user@example.com");
  // Verify jwtVerify was called with the token and a secret key
  expect(jwtVerify).toHaveBeenCalled();
  const [token, secret] = (jwtVerify as any).mock.calls[0];
  expect(token).toBe("valid-token");
  expect(secret).toBeDefined(); // Should be the JWT_SECRET Uint8Array
});

test("verifySession: returns null when no token in request cookies", async () => {
  const mockRequest = {
    cookies: {
      get: vi.fn().mockReturnValue(undefined),
    },
  } as unknown as NextRequest;

  const session = await verifySession(mockRequest);

  expect(session).toBeNull();
});

test("verifySession: returns null when JWT verification fails", async () => {
  const { jwtVerify } = await import("jose");
  vi.mocked(jwtVerify).mockRejectedValueOnce(new Error("Invalid signature"));

  const mockRequest = {
    cookies: {
      get: vi.fn().mockReturnValue({
        value: "invalid-token",
      }),
    },
  } as unknown as NextRequest;

  const session = await verifySession(mockRequest);

  expect(session).toBeNull();
});

test("verifySession: extracts token from request cookies with auth-token key", async () => {
  const mockRequest = {
    cookies: {
      get: vi.fn().mockReturnValue({
        value: "valid-token",
      }),
    },
  } as unknown as NextRequest;

  await verifySession(mockRequest);

  expect(mockRequest.cookies.get).toHaveBeenCalledWith("auth-token");
});

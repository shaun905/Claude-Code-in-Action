import { test, expect, vi, beforeEach, afterEach, describe } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "../use-auth";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock server actions
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: async (email: string, password: string) => mockSignIn(email, password),
  signUp: async (email: string, password: string) => mockSignUp(email, password),
}));

// Mock anon-work-tracker
const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

// Mock project actions
const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: async () => mockGetProjects(),
}));
vi.mock("@/actions/create-project", () => ({
  createProject: async (data: unknown) => mockCreateProject(data),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAuth", () => {
  describe("signIn", () => {
    test("should set isLoading to true during signIn", async () => {
      mockSignIn.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signIn("user@example.com", "password");
      });

      // isLoading should be true immediately after call
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("should return the result from signInAction", async () => {
      const expectedResult = { success: true };
      mockSignIn.mockResolvedValue(expectedResult);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "project-123" });

      const { result } = renderHook(() => useAuth());

      const signInResult = await act(async () => {
        return result.current.signIn("user@example.com", "password");
      });

      expect(signInResult).toEqual(expectedResult);
    });

    test("should call signInAction with email and password", async () => {
      mockSignIn.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "mypassword");
      });

      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "mypassword");
    });

    test("should not call handlePostSignIn when signIn fails", async () => {
      mockSignIn.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("should call handlePostSignIn when signIn succeeds", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalled();
    });

    test("should reset isLoading to false even when signInAction throws", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      try {
        await act(async () => {
          await result.current.signIn("user@example.com", "password");
        });
      } catch {
        // Error is expected
      }

      expect(result.current.isLoading).toBe(false);
    });

    test("should return error result from failed signIn", async () => {
      const errorResult = { success: false, error: "Invalid credentials" };
      mockSignIn.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      const signInResult = await act(async () => {
        return result.current.signIn("user@example.com", "wrong");
      });

      expect(signInResult).toEqual(errorResult);
    });
  });

  describe("signUp", () => {
    test("should set isLoading to true during signUp", async () => {
      mockSignUp.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signUp("newuser@example.com", "password");
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("should return the result from signUpAction", async () => {
      const expectedResult = { success: true };
      mockSignUp.mockResolvedValue(expectedResult);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "project-456" });

      const { result } = renderHook(() => useAuth());

      const signUpResult = await act(async () => {
        return result.current.signUp("newuser@example.com", "password");
      });

      expect(signUpResult).toEqual(expectedResult);
    });

    test("should call signUpAction with email and password", async () => {
      mockSignUp.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "mypassword");
      });

      expect(mockSignUp).toHaveBeenCalledWith("newuser@example.com", "mypassword");
    });

    test("should not call handlePostSignIn when signUp fails", async () => {
      mockSignUp.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password");
      });

      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("should call handlePostSignIn when signUp succeeds", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password");
      });

      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalled();
    });

    test("should reset isLoading to false even when signUpAction throws", async () => {
      mockSignUp.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      try {
        await act(async () => {
          await result.current.signUp("newuser@example.com", "password");
        });
      } catch {
        // Error is expected
      }

      expect(result.current.isLoading).toBe(false);
    });

    test("should return error result from failed signUp", async () => {
      const errorResult = { success: false, error: "Email already exists" };
      mockSignUp.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      const signUpResult = await act(async () => {
        return result.current.signUp("existing@example.com", "password");
      });

      expect(signUpResult).toEqual(errorResult);
    });
  });

  describe("handlePostSignIn - with anonymous work", () => {
    test("should create project from anonymous work data", async () => {
      const anonWorkData = {
        messages: [{ role: "user", content: "create a button" }],
        fileSystemData: { "button.jsx": {} },
      };
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWorkData);
      mockCreateProject.mockResolvedValue({ id: "anonproject-123" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from /),
        messages: anonWorkData.messages,
        data: anonWorkData.fileSystemData,
      });
    });

    test("should clear anonymous work data after creating project", async () => {
      const anonWorkData = {
        messages: [{ role: "user", content: "create a form" }],
        fileSystemData: { "form.jsx": {} },
      };
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWorkData);
      mockCreateProject.mockResolvedValue({ id: "anonproject-456" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockClearAnonWork).toHaveBeenCalled();
    });

    test("should navigate to anonymous work project after creation", async () => {
      const anonWorkData = {
        messages: [{ role: "user", content: "test" }],
        fileSystemData: {},
      };
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWorkData);
      mockCreateProject.mockResolvedValue({ id: "anonproject-789" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/anonproject-789");
    });

    test("should not fetch projects if anonymous work exists", async () => {
      const anonWorkData = {
        messages: [{ role: "user", content: "test" }],
        fileSystemData: {},
      };
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWorkData);
      mockCreateProject.mockResolvedValue({ id: "anonproject-123" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    test("should not create new project if anonymous work exists", async () => {
      const anonWorkData = {
        messages: [{ role: "user", content: "test" }],
        fileSystemData: {},
      };
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWorkData);
      mockCreateProject.mockResolvedValue({ id: "anonproject-123" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      // createProject should be called once for the anonymous work
      expect(mockCreateProject).toHaveBeenCalledTimes(1);
    });

    test("should ignore empty anonymous work messages array", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      mockGetProjects.mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
    });

    test("should ignore null anonymous work data", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn - with existing projects", () => {
    test("should navigate to first existing project", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1" },
        { id: "project-2" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });

    test("should not create new project if projects already exist", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "existing-project" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    test("should get projects when no anonymous work", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockGetProjects).toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn - creating new project", () => {
    test("should create new project when no projects exist", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-project-123" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
    });

    test("should navigate to newly created project", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-project-456" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/new-project-456");
    });

    test("should generate random project name", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-project-123" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      const callArgs = mockCreateProject.mock.calls[0][0];
      expect(callArgs.name).toMatch(/^New Design #/);
      // Extract the number
      const numberMatch = callArgs.name.match(/#(\d+)$/);
      expect(numberMatch).toBeTruthy();
      const number = parseInt(numberMatch![1], 10);
      expect(number).toBeGreaterThanOrEqual(0);
      expect(number).toBeLessThan(100000);
    });

    test("should create project with empty messages and data", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-project-123" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
          data: {},
        })
      );
    });
  });

  describe("hook return value", () => {
    test("should return signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current).toHaveProperty("signIn");
      expect(result.current).toHaveProperty("signUp");
      expect(result.current).toHaveProperty("isLoading");
    });

    test("should initialize isLoading as false", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
    });

    test("signIn should be a function", () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.signIn).toBe("function");
    });

    test("signUp should be a function", () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("multiple sequential calls", () => {
    test("should handle multiple signIn calls sequentially", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user1@example.com", "password");
        await result.current.signIn("user2@example.com", "password");
      });

      expect(mockSignIn).toHaveBeenCalledTimes(2);
      expect(mockSignIn).toHaveBeenNthCalledWith(1, "user1@example.com", "password");
      expect(mockSignIn).toHaveBeenNthCalledWith(2, "user2@example.com", "password");
    });

    test("should handle signUp followed by signIn", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password");
        await result.current.signIn("newuser@example.com", "password");
      });

      expect(mockSignUp).toHaveBeenCalledTimes(1);
      expect(mockSignIn).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledTimes(2);
    });
  });

  describe("error scenarios", () => {
    test("should handle signInAction throwing an error", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      try {
        await act(async () => {
          await result.current.signIn("user@example.com", "password");
        });
        // If we get here, the test should fail
        expect.fail("signIn should have thrown");
      } catch (error: any) {
        expect(error.message).toContain("Network error");
      }

      expect(result.current.isLoading).toBe(false);
    });

    test("should handle signUpAction throwing an error", async () => {
      mockSignUp.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      try {
        await act(async () => {
          await result.current.signUp("user@example.com", "password");
        });
        expect.fail("signUp should have thrown");
      } catch (error: any) {
        expect(error.message).toContain("Server error");
      }

      expect(result.current.isLoading).toBe(false);
    });

    test("should handle createProject throwing an error during post-sign-in", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAuth());

      try {
        await act(async () => {
          await result.current.signIn("user@example.com", "password");
        });
        expect.fail("signIn should have thrown");
      } catch (error: any) {
        expect(error.message).toContain("Database error");
      }

      expect(result.current.isLoading).toBe(false);
    });

    test("should handle getProjects throwing an error", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockRejectedValue(new Error("Failed to fetch projects"));

      const { result } = renderHook(() => useAuth());

      try {
        await act(async () => {
          await result.current.signIn("user@example.com", "password");
        });
        expect.fail("signIn should have thrown");
      } catch (error: any) {
        expect(error.message).toContain("Failed to fetch projects");
      }

      expect(result.current.isLoading).toBe(false);
    });

    test("should reset isLoading even when router.push fails", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "project-1" }]);
      mockPush.mockImplementation(() => {
        throw new Error("Navigation error");
      });

      const { result } = renderHook(() => useAuth());

      try {
        await act(async () => {
          await result.current.signIn("user@example.com", "password");
        });
      } catch {
        // Error is expected
      }

      expect(result.current.isLoading).toBe(false);
    });
  });
});

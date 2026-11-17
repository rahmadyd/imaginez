// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadOverlay, loadSeedOverlay, loadSeedTemplate } from "../../src/features/compositor/load";

describe("loadOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("memuat overlay dari URL", async () => {
    // Mock fetch untuk mengembalikan blob gambar
    const mockBlob = new Blob(["test"], { type: "image/png" });
    const mockResponse = {
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    // Mock createImageBitmap
    const mockImageBitmap = { width: 100, height: 100, close: vi.fn() };
    global.createImageBitmap = vi.fn().mockResolvedValue(mockImageBitmap);

    const result = await loadOverlay("/test.png");

    expect(fetch).toHaveBeenCalledWith("/test.png");
    expect(createImageBitmap).toHaveBeenCalledWith(mockBlob);
    expect(result).toBe(mockImageBitmap);
  });

  it("melempar error jika fetch gagal", async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: "Not Found",
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(loadOverlay("/test.png")).rejects.toThrow(
      "Gagal memuat overlay: 404 Not Found"
    );
  });
});

describe("loadSeedOverlay", () => {
  it("memuat overlay seed dengan URL yang benar", async () => {
    // Mock fetch dan createImageBitmap
    const mockBlob = new Blob(["test"], { type: "image/png" });
    const mockResponse = {
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const mockImageBitmap = { width: 100, height: 100, close: vi.fn() };
    global.createImageBitmap = vi.fn().mockResolvedValue(mockImageBitmap);

    const result = await loadSeedOverlay("strip-1x6");

    expect(fetch).toHaveBeenCalledWith("/seed/strip-1x6.png");
    expect(result).toBe(mockImageBitmap);
  });
});

describe("loadSeedTemplate", () => {
  it("memuat template dan overlay dari seed", async () => {
    const mockTemplate = {
      id: "strip-1x6",
      name: "Test Template",
      canvas: { w: 1200, h: 3600 },
      slots: [],
    };

    const mockBlob = new Blob(["test"], { type: "image/png" });
    const mockImageBitmap = { width: 1200, height: 3600, close: vi.fn() };

    // Mock fetch untuk template JSON
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockTemplate),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      });

    global.createImageBitmap = vi.fn().mockResolvedValue(mockImageBitmap);

    const result = await loadSeedTemplate("strip-1x6");

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, "/seed/strip-1x6.json");
    expect(fetch).toHaveBeenNthCalledWith(2, "/seed/strip-1x6.png");
    expect(result.template).toEqual(mockTemplate);
    expect(result.overlay).toBe(mockImageBitmap);
  });

  it("melempar error jika template tidak ditemukan", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(loadSeedTemplate("unknown")).rejects.toThrow(
      "Gagal memuat template: unknown"
    );
  });
});
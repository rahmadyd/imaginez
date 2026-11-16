// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureFrame, slotAspect } from "../../src/features/camera/capture";

// Mock createImageBitmap karena jsdom tidak mendukung
const mockCreateImageBitmap = vi.fn();
Object.defineProperty(global, "createImageBitmap", {
  configurable: true,
  value: mockCreateImageBitmap,
});

// Helper untuk membuat mock video element
function createMockVideo(width: number, height: number): HTMLVideoElement {
  const video = document.createElement("video");
  Object.defineProperty(video, "videoWidth", { value: width, configurable: true });
  Object.defineProperty(video, "videoHeight", { value: height, configurable: true });
  return video;
}

// Mock canvas context
let mockContexts: CanvasRenderingContext2D[] = [];
function createMockCanvasContext(): CanvasRenderingContext2D {
  const ctx = {
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  mockContexts.push(ctx);
  return ctx;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockContexts = [];

  // Mock HTMLCanvasElement.prototype.getContext
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(() => createMockCanvasContext()),
  });

  // Mock HTMLCanvasElement properties
  type CanvasWithInternals = HTMLCanvasElement & {
    _width: number;
    _height: number;
  };

  Object.defineProperty(HTMLCanvasElement.prototype, "width", {
    configurable: true,
    get(this: CanvasWithInternals) {
      return this._width || 0;
    },
    set(this: CanvasWithInternals, value: number) {
      this._width = value;
    },
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "height", {
    configurable: true,
    get(this: CanvasWithInternals) {
      return this._height || 0;
    },
    set(this: CanvasWithInternals, value: number) {
      this._height = value;
    },
  });

  // Mock ImageBitmap untuk createImageBitmap
  mockCreateImageBitmap.mockResolvedValue({
    close: vi.fn(),
  } as unknown as ImageBitmap);
});

describe("captureFrame", () => {
  it("melempar error jika video belum memiliki dimensi", async () => {
    const video = createMockVideo(0, 0);

    await expect(captureFrame(video, 16 / 9)).rejects.toThrow(
      "Video belum memiliki dimensi yang valid"
    );
  });

  it("melakukan crop horizontal untuk video 16:9 ke target 2:1", async () => {
    // Video 1920x1080 (16:9), target 2:1 (lebih sempit)
    const video = createMockVideo(1920, 1080);

    // cropHeight = videoHeight = 1080
    // cropWidth = cropHeight * targetAspect = 1080 * 2 = 2160
    // tapi 2160 > 1920, jadi cropWidth dibatasi 1920
    // cropX = (1920 - 1920) / 2 = 0
    // Hasil akhir: 1920x960 (setelah center-crop horizontal)

    await captureFrame(video, 2); // 2:1

    // Periksa bahwa canvas pertama dibuat dengan dimensi crop
    expect(mockContexts[0].drawImage).toHaveBeenCalledWith(
      video,
      0, 60, 1920, 960, // crop vertikal: potong 60px atas dan bawah
      0, 0, 1920, 960
    );
  });

  it("melakukan crop vertikal untuk video 4:3 ke target 16:9", async () => {
    // Video 1200x900 (4:3), target 16/9 ≈ 1.777 (lebih lebar)
    const video = createMockVideo(1200, 900);

    // cropWidth = videoWidth = 1200
    // cropHeight = cropWidth / targetAspect = 1200 / (16/9) = 675
    // cropY = (900 - 675) / 2 = 112.5

    await captureFrame(video, 16 / 9);

    expect(mockContexts[0].drawImage).toHaveBeenCalledWith(
      video,
      0, 112.5, 1200, 675,
      0, 0, 1200, 675
    );
  });

  it("melakukan crop vertikal untuk video portrait (9:16) ke target landscape (4:3)", async () => {
    // Video portrait 1080x1920 (9:16), target 4:3 (landscape)
    const video = createMockVideo(1080, 1920);

    // Video portrait tinggi, target landscape lebar
    // cropWidth = videoWidth = 1080
    // cropHeight = cropWidth / (4/3) = 1080 / 1.333... = 810
    // cropY = (1920 - 810) / 2 = 555

    await captureFrame(video, 4 / 3);

    expect(mockContexts[0].drawImage).toHaveBeenCalledWith(
      video,
      0, 555, 1080, 810,
      0, 0, 1080, 810
    );
  });

  it("membatasi ukuran dengan maxSide", async () => {
    const video = createMockVideo(3840, 2160); // 4K video
    const maxSide = 1920;

    // cropWidth = 3840, cropHeight = 2160 (video 16:9, target 16:9)
    // scale = 1920 / 3840 = 0.5
    // resultWidth = 1920, resultHeight = 1080

    await captureFrame(video, 16 / 9, maxSide);

    // Seharusnya ada dua canvas: crop dan scale
    expect(mockContexts).toHaveLength(2);
    // Canvas pertama untuk crop
    // Canvas kedua untuk scale
    expect(mockContexts[1].drawImage).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      0, 0, 1920, 1080
    );
  });

  it("tidak membuat canvas kedua jika tidak perlu scaling", async () => {
    const video = createMockVideo(1920, 1080);
    const maxSide = 1920;

    await captureFrame(video, 16 / 9, maxSide);

    // Hanya satu canvas untuk crop, tidak ada untuk scale
    expect(mockContexts).toHaveLength(1);
    expect(mockCreateImageBitmap).toHaveBeenCalledWith(expect.any(HTMLCanvasElement));
  });

  it("mempertahankan rasio setelah scaling", async () => {
    const video = createMockVideo(2560, 1440); // 1440p 16:9
    const maxSide = 800;

    // cropWidth = 2560, cropHeight = 1440 (video dan target sama 16:9)
    // scale = 800 / 2560 = 0.3125
    // resultWidth = 800, resultHeight = 450 (800/450 = 1.777...)

    await captureFrame(video, 16 / 9, maxSide);

    expect(mockContexts[1].drawImage).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      0, 0, 800, 450
    );
  });

  it("menangani rasio slot landscape (width > height)", async () => {
    const video = createMockVideo(1920, 1080);
    // Slot 800x400 = 2:1
    await captureFrame(video, 800 / 400);

    expect(mockContexts[0].drawImage).toHaveBeenCalledWith(
      video,
      0, 60, 1920, 960, // crop vertikal untuk 2:1
      0, 0, 1920, 960
    );
  });

  it("menangani rasio slot portrait (height > width)", async () => {
    const video = createMockVideo(1920, 1080);
    // Slot 400x800 = 0.5:1 = 1:2
    await captureFrame(video, 400 / 800); // 0.5

    expect(mockContexts[0].drawImage).toHaveBeenCalledWith(
      video,
      690, 0, 540, 1080, // crop horizontal untuk 1:2
      0, 0, 540, 1080
    );
  });
});

describe("slotAspect", () => {
  it("menghitung rasio landscape untuk slot 800x400", () => {
    expect(slotAspect(800, 400)).toBe(2); // 800/400 = 2
  });

  it("menghitung rasio portrait untuk slot 400x800", () => {
    expect(slotAspect(400, 800)).toBe(0.5); // 400/800 = 0.5
  });

  it("menghitung rasio untuk slot persegi", () => {
    expect(slotAspect(500, 500)).toBe(1);
  });

  it("melempar error jika tinggi nol", () => {
    expect(() => slotAspect(500, 0)).toThrow("Tinggi slot tidak boleh nol");
  });
});


describe("readImageFile", () => {
  it("fungsi readImageFile didefinisikan", async () => {
    // Test sederhana untuk memverifikasi fungsi ada
    const { readImageFile } = await import("../../src/features/camera/capture");
    expect(typeof readImageFile).toBe("function");
  });

  // Note: Test lengkap untuk readImageFile memerlukan mocking yang kompleks
  // (FileReader, Image, canvas context). Karena fungsi ini hanya wrapper
  // untuk operasi browser yang sudah di-test di captureFrame,
  // kita bisa verifikasi dengan test e2e nanti di T3.8.
  // AC T1.3: "tidak ada request jaringan saat memilih file (dibuktikan di e2e nanti)"
});
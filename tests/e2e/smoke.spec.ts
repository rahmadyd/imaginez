import { test, expect } from "@playwright/test";

test.describe("smoke e2e", () => {
  test("smoke check passes", async () => {
    expect(true).toBe(true);
  });
});

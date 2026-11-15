import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/rahmadyd/.gemini/antigravity/brain/2c2a07c2-5738-4736-858b-f72a5491d012";
const DOCS_DIR = "D:/web_project_internal/photobooth/docs/screenshots";

async function main() {
  const browser = await chromium.launch();

  // Mobile 390px
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await mobilePage.evaluate(() => document.fonts.ready);
  const mobilePath = path.join(DOCS_DIR, "t02-mobile-390px.png");
  await mobilePage.screenshot({ path: mobilePath, fullPage: true });
  fs.copyFileSync(mobilePath, path.join(ARTIFACT_DIR, "t02-mobile-390px.png"));

  // Desktop 1280px
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await desktopPage.evaluate(() => document.fonts.ready);
  const desktopPath = path.join(DOCS_DIR, "t02-desktop-1280px.png");
  await desktopPage.screenshot({ path: desktopPath, fullPage: true });
  fs.copyFileSync(desktopPath, path.join(ARTIFACT_DIR, "t02-desktop-1280px.png"));

  await browser.close();
  console.log("Screenshots captured successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

const puppeteer = require("puppeteer");

const TEAM_URL = "https://play.toornament.com/en_US/tournaments/2399602823406704639/participants/2432668369832374271/";

async function debug() {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();

  console.log("Loading team page...");
  await page.goto(TEAM_URL, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 3000));

  // Click "About" tab
  await page.evaluate(() => {
    const links = [...document.querySelectorAll("a")];
    const about = links.find((a) => a.textContent.trim() === "About");
    if (about) about.click();
  });
  console.log("Clicked About tab");
  await new Promise((r) => setTimeout(r, 4000));

  // Dump full page text after clicking About
  const aboutText = await page.evaluate(() => document.body.innerText);
  console.log("\n=== ABOUT PAGE TEXT ===");
  console.log(aboutText);

  // Dump inner HTML of the main content area
  const html = await page.evaluate(() => {
    // Look for the content that changed after clicking About
    const containers = document.querySelectorAll("[class*='content'], [class*='about'], [class*='lineup'], [class*='roster'], [class*='custom']");
    let result = "";
    containers.forEach((c) => {
      if (c.innerHTML.length > 100 && c.innerHTML.length < 50000) {
        result += `\n--- ${c.tagName}.${c.className} ---\n${c.innerHTML.substring(0, 3000)}\n`;
      }
    });
    return result || "No content containers found";
  });
  console.log("\n=== HTML CONTAINERS ===");
  console.log(html);

  console.log("\n\nDone! Press Ctrl+C to close.");
  await new Promise(() => {});
}

debug().catch(console.error);

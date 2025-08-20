import { expect, test } from "@playwright/test";

test("comprehensive e2e test", async ({ page }) => {
  console.log("Navigating to the homepage...");
  await page.goto("http://localhost:3001");

  console.log("Searching for an artist...");
  await page.fill(
    'input[placeholder="Search artists, shows, venues..."]',
    "The Strokes",
  );
  await page.press(
    'input[placeholder="Search artists, shows, venues..."]',
    "Enter",
  );

  console.log("Clicking on the first search result...");
  await page.click(".list-group-item:first-child");

  console.log("Waiting for the artist page to load...");
  await page.waitForSelector("h1");

  console.log("Verifying that the artist name is correct...");
  const artistName = await page.textContent("h1");
  expect(artistName).toBe("The Strokes");

  console.log("Verifying that the import progress bar is displayed...");
  await page.waitForSelector(".progress-bar");

  console.log("Waiting for the import to complete...");
  await page.waitForSelector(".progress-bar-success", { timeout: 120000 });

  console.log("Verifying that the upcoming shows are displayed...");
  await page.waitForSelector(".show-list-item");

  console.log("Test passed!");
});

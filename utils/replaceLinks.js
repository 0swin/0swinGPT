const https = require("https");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");

async function extractLinkContent(link) {
  try {
    const options = {
      rejectUnauthorized: false,
    };
    const response = await new Promise((resolve, reject) => {
      https.get(link, options, resolve).on("error", reject);
    });
    const html = await new Promise((resolve) => {
      let data = "";
      response.on("data", (chunk) => {
        data += chunk;
      });
      response.on("end", () => {
        resolve(data);
      });
    });

    // Try parsing the HTML using Readability
    const doc = new JSDOM(html, { url: link });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    // If Readability fails, use Html To Text to extract the text content
    if (!article) {
      return `${link} - Sorry, I couldn't extract the content for this page.`;
    }
    // Clean up the parsed text
    const maxCleanedArticleLength = 3000;
    const cleanedText = article.textContent
      .trim()
      .substring(0, maxCleanedArticleLength)
      .replace(/\n\s+/g, "\n") // Remove leading spaces on each line
      .replace(/\n{3,}/g, "\n\n"); // Keep only one newline when there are multiple in a row
    return `${link} - ${cleanedText}`;
  } catch (err) {
    console.error(`Error processing link: ${link}`, err);
    return `${link} - Error processing link: ${err.message}`;
  }
}

module.exports = { extractLinkContent };

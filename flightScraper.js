import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { writeFileSync } from 'fs';

// Usage: node flightScraper.js <origin> <destination> <date>
// Example: node flightScraper.js DEL BOM 2025-05-01

async function scrapeFlights(origin, destination, date) {
  // Try multiple sites in order
  // Only use ixigo, since it works reliably
  const sites = [
    scrapeIxigo
  ];
  for (const siteFn of sites) {
    try {
      const success = await siteFn(origin, destination, date);
      if (success) return;
    } catch (e) {
      console.log(`Site failed: ${siteFn.name} - ${e.message}`);
    }
  }
  console.log('All sites failed or are blocking bots.');
}

// IXIGO SCRAPER
async function scrapeIxigo(origin, destination, date) {
  let options = new chrome.Options();
  options.addArguments('--disable-gpu', '--window-size=1280,800');
  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    console.log('Trying ixigo.com...');
    await driver.get('https://www.ixigo.com/flights');
    await driver.sleep(15000);
    // Fill origin
    let fromBox = await driver.findElement(By.css('input[placeholder*="From"]'));
    await fromBox.clear();
    await fromBox.sendKeys(origin);
    await driver.sleep(1500);
    await fromBox.sendKeys(Key.ARROW_DOWN, Key.ENTER);
    await driver.sleep(1500);
    // Fill destination
    let toBox = await driver.findElement(By.css('input[placeholder*="To"]'));
    await toBox.clear();
    await toBox.sendKeys(destination);
    await driver.sleep(1500);
    await toBox.sendKeys(Key.ARROW_DOWN, Key.ENTER);
    await driver.sleep(1500);
    // Fill date (ixigo uses input[placeholder="Depart"])
    let dateBox = await driver.findElement(By.css('input[placeholder="Depart"]'));
    await dateBox.click();
    await dateBox.clear();
    await dateBox.sendKeys(date);
    await driver.sleep(1500);
    // Click search
    let searchBtn = await driver.findElement(By.css('button.c-search-btn'));
    await searchBtn.click();
    await driver.sleep(15000);
    // Scrape results
    let flights = await driver.findElements(By.css('.result-card'));
    if (flights.length === 0) throw new Error('No flights found or blocked.');
    for (let flight of flights.slice(0, 5)) {
      let text = await flight.getText();
      console.log('--- Flight (ixigo) ---');
      console.log(text);
    }
    await driver.quit();
    return true;
  } catch (e) {
    await driver.quit();
    return false;
  }
}




// Parse CLI args
const [,, origin, destination, date] = process.argv;
if (!origin || !destination || !date) {
  console.log('Usage: node flightScraper.js <origin> <destination> <date>');
  process.exit(1);
}

scrapeFlights(origin, destination, date);

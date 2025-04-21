import inquirer from 'inquirer';
import axios from 'axios';

// Hardcoded Amadeus credentials (provided by user)
const AMADEUS_API_KEY = 'aG2WghGZGASXuFqOpDyaEhsXrmluxMCZ';
const AMADEUS_API_SECRET = 'SrWTeb5Y9O3eigHT';

async function getAmadeusCredentials() {
  return { apiKey: AMADEUS_API_KEY, apiSecret: AMADEUS_API_SECRET };
}

async function getAmadeusToken(apiKey, apiSecret) {
  try {
    const response = await axios.post('https://test.api.amadeus.com/v1/security/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: apiKey,
        client_secret: apiSecret
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data.access_token;
  } catch (e) {
    throw new Error('Failed to get Amadeus token: ' + (e.response?.data?.error_description || e.message));
  }
}

async function getFlightSearchParams() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'origin', message: 'From (IATA code, e.g. DEL):', validate: v => v.length === 3 || 'Enter a 3-letter IATA code.' },
    { type: 'input', name: 'destination', message: 'To (IATA code, e.g. BOM):', validate: v => v.length === 3 || 'Enter a 3-letter IATA code.' },
    { type: 'input', name: 'date', message: 'Departure date (YYYY-MM-DD):', validate: v => /^\d{4}-\d{2}-\d{2}$/.test(v) || 'Enter date as YYYY-MM-DD.' },
    { type: 'input', name: 'adults', message: 'Number of adults:', default: 1, validate: v => !isNaN(v) && v > 0 }
  ]);
  return answers;
}

async function searchFlights(token, params) {
  try {
    const url = 'https://test.api.amadeus.com/v2/shopping/flight-offers';
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.date,
        adults: params.adults,
        max: 10,
        currencyCode: 'INR',
      }
    });
    return response.data.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      throw new Error('Invalid or expired token. Please check your credentials.');
    }
    throw new Error('Failed to fetch flights: ' + (error.response?.data?.errors?.[0]?.detail || error.message));
  }
}

function showFlights(flights) {
  if (!flights || flights.length === 0) {
    console.log('\nNo flights found for your search.');
    return;
  }
  console.log(`\nFound ${flights.length} flights:`);
  flights.forEach((f, i) => {
    const itineraries = f.itineraries[0];
    const segments = itineraries.segments;
    const departure = segments[0].departure;
    const arrival = segments[segments.length - 1].arrival;
    const airline = segments[0].carrierCode;
    const flightNum = segments.map(s => s.number).join(', ');
    const price = f.price.total;
    console.log(`\n#${i + 1}`);
    console.log(` Airline: ${airline}`);
    console.log(` Flight Number: ${flightNum}`);
    console.log(` From: ${departure.iataCode}`);
    console.log(` To: ${arrival.iataCode}`);
    console.log(` Departure: ${departure.at}`);
    console.log(` Arrival: ${arrival.at}`);
    console.log(` Price: ₹${price}`);
  });
}

async function main() {
  console.log('Welcome to Amadeus Flight Search CLI (Live Data)');
  let credentials, token;
  while (!token) {
    try {
      credentials = await getAmadeusCredentials();
      token = await getAmadeusToken(credentials.apiKey, credentials.apiSecret);
    } catch (e) {
      console.log(e.message);
    }
  }
  while (true) {
    const params = await getFlightSearchParams();
    try {
      const flights = await searchFlights(token, params);
      showFlights(flights);
    } catch (e) {
      console.log(e.message);
    }
    const { again } = await inquirer.prompt([
      { type: 'confirm', name: 'again', message: 'Search again?', default: false }
    ]);
    if (!again) break;
  }
  console.log('Thank you for using Amadeus Flight Search CLI!');
}

main();

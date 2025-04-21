import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const clientId = process.env.AMADEUS_CLIENT_ID;
const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Missing Amadeus API credentials. Please set them in your .env file.');
  process.exit(1);
}

async function getAccessToken() {
  const res = await axios.post('https://test.api.amadeus.com/v1/security/oauth2/token',
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data.access_token;
}

async function searchFlights(origin, destination, date) {
  const token = await getAccessToken();
  const res = await axios.get('https://test.api.amadeus.com/v2/shopping/flight-offers', {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: date,
      adults: 1,
      nonStop: false,
      max: 10
    }
  });
  return res.data.data;
}

function printFlights(flights) {
  if (!flights || flights.length === 0) {
    console.log('No flights found.');
    return;
  }
  for (const offer of flights) {
    const itinerary = offer.itineraries[0];
    const segments = itinerary.segments;
    const dep = segments[0];
    const arr = segments[segments.length - 1];
    const price = offer.price.total;
    console.log('------------------------------');
    console.log(`From: ${dep.departure.iataCode}  To: ${arr.arrival.iataCode}`);
    console.log(`Dep: ${dep.departure.at}  Arr: ${arr.arrival.at}`);
    console.log(`Airline: ${dep.carrierCode}`);
    console.log(`Price: ${price} ${offer.price.currency}`);
    console.log('------------------------------');
  }
}

// CLI usage: node flightApi.js DEL BOM 2025-05-01
const [,, origin, destination, date] = process.argv;
if (!origin || !destination || !date) {
  console.log('Usage: node flightApi.js <origin> <destination> <date>');
  process.exit(1);
}

searchFlights(origin, destination, date)
  .then(printFlights)
  .catch(err => {
    if (err.response) {
      console.error('API error:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  });

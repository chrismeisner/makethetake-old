const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Airtable = require('airtable');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Airtable setup
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

app.use(express.static('public'));
app.use(express.json());

// Function to fetch existing takes from Airtable
const fetchExistingTakes = async () => {
  const records = await base('takes').select().all();
  return records.map(record => ({
	mobile: record.get('Mobile'),
	take: record.get('Take')
  }));
};

io.on('connection', async (socket) => {
  console.log('🟢 New client connected');

  // Fetch existing takes and send them to the client
  const existingTakes = await fetchExistingTakes();
  console.log('📨 Sending existing takes to the new client');
  socket.emit('existingTakes', existingTakes);

  socket.on('newSelection', (data) => {
	console.log(`📥 New selection received: ${data.mobile} selected ${data.take}`);
	base('takes').create([
	  {
		fields: {
		  'Mobile': data.mobile,
		  'Take': data.take
		}
	  }
	], (err, records) => {
	  if (err) {
		console.error('❌ Error saving new selection to Airtable:', err);
		return;
	  }
	  console.log('✅ New selection saved to Airtable and broadcasting update');
	  io.emit('updateFeed', data);
	});
  });

  socket.on('disconnect', () => {
	console.log('🔴 Client disconnected');
  });
});

server.listen(4000, () => console.log('🚀 Server is running on port 4000'));
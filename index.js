const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Airtable = require('airtable');
require('dotenv').config();

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
  console.log('New client connected');

  // Fetch existing takes and send them to the client
  socket.on('fetchExistingTakes', async () => {
	const existingTakes = await fetchExistingTakes();
	socket.emit('existingTakes', existingTakes);
  });

  socket.on('newSelection', (data) => {
	base('takes').create([
	  {
		fields: {
		  'Mobile': data.mobile,
		  'Take': data.take
		}
	  }
	], (err, records) => {
	  if (err) {
		console.error(err);
		return;
	  }
	  io.emit('updateFeed', data);
	});
  });

  socket.on('disconnect', () => {
	console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));

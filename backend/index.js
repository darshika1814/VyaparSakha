require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');

// Refuse to start without a signing secret: tokens would be forgeable.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random string of at least 32 characters.');
  process.exit(1);
}

const app = require('./app');

main().catch(err => console.log(err));
async function main() {
  await mongoose.connect(`${process.env.CLOUD_DATABASE}`);
  console.log('Database Connected');
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

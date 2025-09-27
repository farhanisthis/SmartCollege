const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcollege';

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  email: String,
  enrollment: String,
  role: String,
  section: String
});

const User = mongoose.model('User', userSchema);

async function verifyUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({ role: 'student' }).limit(10);
    console.log(`\nFound ${await User.countDocuments({ role: 'student' })} student users`);
    
    console.log('\nFirst 10 users:');
    users.forEach(user => {
      console.log(`- ${user.name} | ${user.username} | ${user.email} | ${user.section}`);
    });

    // Test login for first user
    const firstUser = users[0];
    if (firstUser) {
      console.log(`\nTesting user: ${firstUser.name}`);
      console.log(`Username: ${firstUser.username}`);
      console.log(`Password: ${firstUser.password}`);
      console.log(`Role: ${firstUser.role}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

verifyUsers();
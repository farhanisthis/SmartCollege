const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcollege';

// User Schema - exact match
const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "cr"], required: true },
  name: { type: String, required: true },
  class: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const UserModel = mongoose.model('User', UserSchema);

async function verifyUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Count users
    const totalUsers = await UserModel.countDocuments();
    const studentUsers = await UserModel.countDocuments({ role: 'student' });
    const crUsers = await UserModel.countDocuments({ role: 'cr' });

    console.log(`\n📊 Database Status:`);
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Student Users: ${studentUsers}`);
    console.log(`CR Users: ${crUsers}`);

    // Check specific user
    const testUser = await UserModel.findOne({ username: '00124402023' });
    console.log('\n🔍 Testing Mohammad Asad (00124402023):');
    
    if (testUser) {
      console.log('✅ User found in database');
      console.log(`  ID: ${testUser._id}`);
      console.log(`  Username: ${testUser.username}`);
      console.log(`  Name: ${testUser.name}`);
      console.log(`  Password: ${testUser.password}`);
      console.log(`  Role: ${testUser.role}`);
      console.log(`  Class: ${testUser.class}`);
    } else {
      console.log('❌ User NOT found in database');
    }

    // List first 5 students for verification
    console.log('\n👥 First 5 students in database:');
    const firstFive = await UserModel.find({ role: 'student' }).limit(5);
    firstFive.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} | ${user.name} | ${user.password}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

verifyUsers();
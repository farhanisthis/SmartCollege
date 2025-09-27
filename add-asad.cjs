const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcollege';

// User Schema - exact match to server schema
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

async function addAsadUser() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Check if user already exists
    const existingUser = await UserModel.findOne({ username: 'asad' });
    if (existingUser) {
      console.log('⚠️ User "asad" already exists');
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Class: ${existingUser.class}`);
    } else {
      // Create new user asad
      const newUser = new UserModel({
        _id: randomUUID(),
        username: 'asad',
        password: '123123',
        role: 'student',
        name: 'Asad',
        class: 'Computer Science - Semester 5',
        createdAt: new Date(),
      });

      await newUser.save();
      console.log('✅ Successfully added user "asad" as student');
      console.log(`   Username: ${newUser.username}`);
      console.log(`   Name: ${newUser.name}`);
      console.log(`   Role: ${newUser.role}`);
      console.log(`   Class: ${newUser.class}`);
      console.log(`   Password: ${newUser.password}`);
    }

    // Show total user count
    const totalUsers = await UserModel.countDocuments();
    const studentCount = await UserModel.countDocuments({ role: 'student' });
    const crCount = await UserModel.countDocuments({ role: 'cr' });
    
    console.log('\n📊 Database Summary:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Students: ${studentCount}`);
    console.log(`   CRs: ${crCount}`);

  } catch (error) {
    console.error('❌ Error adding user:', error.message);
    if (error.code === 11000) {
      console.error('💡 Duplicate username error - user "asad" already exists');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the function
addAsadUser();
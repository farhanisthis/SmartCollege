const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

// Use the SAME MongoDB URI as the server
const MONGODB_URI = 'mongodb+srv://farhanisthis:cb2dNEUcolcHNdnr@attendancetracker.26g51zn.mongodb.net/smartcollege?retryWrites=true&w=majority';

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

async function addAsadToAtlas() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas successfully');

    // Check current users in Atlas
    const userCount = await UserModel.countDocuments();
    console.log(`📊 Current users in Atlas: ${userCount}`);

    // List existing users
    const existingUsers = await UserModel.find({}).limit(10);
    console.log('\n👥 Current users in Atlas:');
    existingUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} | ${user.name} | ${user.role}`);
    });

    // Check if asad already exists
    const existingAsad = await UserModel.findOne({ username: 'asad' });
    if (existingAsad) {
      console.log('\n⚠️ User "asad" already exists in Atlas');
      console.log(`   Name: ${existingAsad.name}`);
      console.log(`   Role: ${existingAsad.role}`);
      console.log(`   Class: ${existingAsad.class}`);
    } else {
      // Create new user asad in Atlas
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
      console.log('\n✅ Successfully added user "asad" to MongoDB Atlas');
      console.log(`   Username: ${newUser.username}`);
      console.log(`   Name: ${newUser.name}`);
      console.log(`   Role: ${newUser.role}`);
      console.log(`   Class: ${newUser.class}`);
      console.log(`   Password: ${newUser.password}`);
    }

    // Show final count
    const finalCount = await UserModel.countDocuments();
    const studentCount = await UserModel.countDocuments({ role: 'student' });
    const crCount = await UserModel.countDocuments({ role: 'cr' });
    
    console.log('\n📊 Atlas Database Summary:');
    console.log(`   Total Users: ${finalCount}`);
    console.log(`   Students: ${studentCount}`);
    console.log(`   CRs: ${crCount}`);

  } catch (error) {
    console.error('❌ Error adding user to Atlas:', error.message);
    if (error.code === 11000) {
      console.error('💡 Duplicate username error - user "asad" already exists');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB Atlas');
  }
}

// Run the function
addAsadToAtlas();
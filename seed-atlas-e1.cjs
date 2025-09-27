const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

// Use the SAME MongoDB Atlas URI as the server
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

// All 55 E1 Students Data
const e1Students = [
  { name: "Mohammad Asad", email: "mohammadasad@example.com", rollNo: "00124402023", section: "E1" },
  { name: "Shiven Sharma", email: "shivensharma@example.com", rollNo: "00224402023", section: "E1" },
  { name: "TANYA SINHA", email: "tanyasinha@example.com", rollNo: "00424402023", section: "E1" },
  { name: "Madhav Wadhwa", email: "madhavwadhwa@example.com", rollNo: "00524402023", section: "E1" },
  { name: "POSHIKA PAL", email: "poshikapal@example.com", rollNo: "00624402023", section: "E1" },
  { name: "Ranveer Singh", email: "ranveersingh@example.com", rollNo: "00724402023", section: "E1" },
  { name: "Devang bisht", email: "devangbisht@example.com", rollNo: "00824402023", section: "E1" },
  { name: "Vaibhav Kumar", email: "vaibhavkumar@example.com", rollNo: "00924402023", section: "E1" },
  { name: "Kkavya Sahni", email: "kkavyasahni@example.com", rollNo: "01024402023", section: "E1" },
  { name: "DEEPALI JAIN", email: "deepalijain@example.com", rollNo: "01124402023", section: "E1" },
  { name: "HARSH MAGGO", email: "harshmaggo@example.com", rollNo: "01224402023", section: "E1" },
  { name: "Vibhuti Panwar", email: "vibhutipanwar@example.com", rollNo: "01324402023", section: "E1" },
  { name: "Aryan verma", email: "aryanverma@example.com", rollNo: "01424402023", section: "E1" },
  { name: "Jai Malik", email: "jaimalik@example.com", rollNo: "01524402023", section: "E1" },
  { name: "NIHARIKA SHARMA", email: "niharikasharma@example.com", rollNo: "01624402023", section: "E1" },
  { name: "Siddharth Shrestha", email: "siddharthshrestha@example.com", rollNo: "01724402023", section: "E1" },
  { name: "ARYAN THAKUR", email: "aryanthakur@example.com", rollNo: "01824402023", section: "E1" },
  { name: "Aditya Kant Pathak", email: "adityakantpathak@example.com", rollNo: "01924402023", section: "E1" },
  { name: "Gursaibh Singh", email: "gursaibhsingh@example.com", rollNo: "02024402023", section: "E1" },
  { name: "brahmjot singh", email: "brahmjotsingh@example.com", rollNo: "02124402023", section: "E1" },
  { name: "HARSHITA SALUJA", email: "harshitasaluja@example.com", rollNo: "02224402023", section: "E1" },
  { name: "Sanskriti Singhal", email: "sanskritisinghal@example.com", rollNo: "02324402023", section: "E1" },
  { name: "SANDEEP KUMAR", email: "sandeepkumar@example.com", rollNo: "02424402023", section: "E1" },
  { name: "Vishnu Narayan Khanna", email: "vishnunarayankhanna@example.com", rollNo: "02524402023", section: "E1" },
  { name: "VAJIPAYAJULA ADITYA", email: "vajipayajulaaditya@example.com", rollNo: "02624402023", section: "E1" },
  { name: "Akshita", email: "akshita@example.com", rollNo: "02724402023", section: "E1" },
  { name: "Mishti sehgal", email: "mishtisehgal@example.com", rollNo: "02824402023", section: "E1" },
  { name: "TWINKLE SHARMA", email: "twinklesharma@example.com", rollNo: "02924402023", section: "E1" },
  { name: "DHRUV SHARMA", email: "dhruvsharma@example.com", rollNo: "03024402023", section: "E1" },
  { name: "Saif Siddiqui", email: "saifsiddiqui@example.com", rollNo: "03124402023", section: "E1" },
  { name: "Aman kumar", email: "amankumar@example.com", rollNo: "03224402023", section: "E1" },
  { name: "Muskan sharma", email: "muskansharma@example.com", rollNo: "03324402023", section: "E1" },
  { name: "Vansh Khatri", email: "vanshkhatri@example.com", rollNo: "03424402023", section: "E1" },
  { name: "Pansul Saxena", email: "pansulsaxena@example.com", rollNo: "03524402023", section: "E1" },
  { name: "Niyati Mittal", email: "niyatimittal@example.com", rollNo: "03624402023", section: "E1" },
  { name: "Jiya Basra", email: "jiyabasra@example.com", rollNo: "03724402023", section: "E1" },
  { name: "Aditya S. Bhandari", email: "adityas.bhandari@example.com", rollNo: "03824402023", section: "E1" },
  { name: "Krish Aggarwal", email: "krishaggarwal@example.com", rollNo: "03924402023", section: "E1" },
  { name: "Mohit Kumar Rawat", email: "mohitkumarrawat@example.com", rollNo: "04024402023", section: "E1" },
  { name: "Sunveen Kaur", email: "sunveenkaur@example.com", rollNo: "04124402023", section: "E1" },
  { name: "Priyanshu Shekhar Singh", email: "priyanshushekharsingh@example.com", rollNo: "04224402023", section: "E1" },
  { name: "Manas Sharma", email: "manassharma@example.com", rollNo: "04324402023", section: "E1" },
  { name: "Muskan Thapa", email: "muskanthapa@example.com", rollNo: "04424402023", section: "E1" },
  { name: "SHIVAN TIWARI", email: "shivantiwari@example.com", rollNo: "04524402023", section: "E1" },
  { name: "Megha Chakraborty", email: "meghachakraborty@example.com", rollNo: "04624402023", section: "E1" },
  { name: "Aryan Bhardwaj", email: "aryanbhardwaj@example.com", rollNo: "04724402023", section: "E1" },
  { name: "Manish Nainwal", email: "manishnainwal@example.com", rollNo: "04824402023", section: "E1" },
  { name: "Nitin Kamia", email: "nitinkamia@example.com", rollNo: "04924402023", section: "E1" },
  { name: "Krishna goyal", email: "krishnagoyal@example.com", rollNo: "05024402023", section: "E1" },
  { name: "Ashish Luthra", email: "ashishluthra@example.com", rollNo: "05124402023", section: "E1" },
  { name: "Farhan Ali", email: "farhanandfarhanali@gmail.com", rollNo: "05524402023", section: "E1" },
  { name: "Jashandeep singh", email: "jashandeepsingh@example.com", rollNo: "05324402023", section: "E1" },
  { name: "Aditiya Bhardwaj", email: "aditiyabhardwaj@example.com", rollNo: "05424402023", section: "E1" },
  { name: "Shreeyansh Srivastava", email: "shreeyanshsrivastava@example.com", rollNo: "05624402023", section: "E1" },
  { name: "Priyanshu sharma", email: "priyanshusharma@example.com", rollNo: "05724402023", section: "E1" }
];

async function seedAtlasWithE1Students() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas successfully');

    // Step 1: Delete asad user
    console.log('\n🗑️ Deleting user "asad"...');
    const deleteResult = await UserModel.deleteOne({ username: 'asad' });
    if (deleteResult.deletedCount > 0) {
      console.log('✅ User "asad" deleted successfully');
    } else {
      console.log('⚠️ User "asad" not found (may already be deleted)');
    }

    // Step 2: Clear any existing E1 students (by roll number pattern)
    console.log('\n🧹 Cleaning existing E1 student roll numbers...');
    const rollNumbers = e1Students.map(student => student.rollNo);
    const cleanResult = await UserModel.deleteMany({ 
      username: { $in: rollNumbers } 
    });
    console.log(`✅ Removed ${cleanResult.deletedCount} existing E1 student entries`);

    // Step 3: Add all 55 E1 students
    console.log('\n📝 Adding all 55 E1 students to Atlas...');
    
    const studentsToCreate = e1Students.map(student => ({
      _id: randomUUID(),
      username: student.rollNo, // Use roll number as username for login
      password: '123123', // Standard password for all students
      role: 'student',
      name: student.name,
      class: 'Computer Science - E1 Section - 2023',
      createdAt: new Date()
    }));

    // Insert all students at once
    const createdStudents = await UserModel.insertMany(studentsToCreate);
    console.log(`✅ Successfully added ${createdStudents.length} E1 students to Atlas`);

    // Step 4: Show summary
    const totalUsers = await UserModel.countDocuments();
    const studentCount = await UserModel.countDocuments({ role: 'student' });
    const crCount = await UserModel.countDocuments({ role: 'cr' });
    
    console.log('\n📊 Final Atlas Database Summary:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Students: ${studentCount}`);
    console.log(`   CRs: ${crCount}`);

    console.log('\n👥 Sample E1 Students Added:');
    createdStudents.slice(0, 5).forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.name} (Login: ${student.username})`);
    });
    
    if (createdStudents.length > 5) {
      console.log(`   ... and ${createdStudents.length - 5} more E1 students`);
    }

    console.log('\n📋 Login Instructions for E1 Students:');
    console.log('   Username: Roll number (e.g., 00124402023)');
    console.log('   Password: 123123');

  } catch (error) {
    console.error('❌ Error processing Atlas database:', error.message);
    if (error.code === 11000) {
      console.error('💡 Duplicate key error - some students may already exist');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB Atlas');
  }
}

// Run the seeding function
console.log('🚀 Starting Atlas database update: Delete asad + Add 55 E1 students\n');
seedAtlasWithE1Students();
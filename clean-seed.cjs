const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcollege';

// User Schema - EXACT match to server/models/mongodb.ts
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

// E1 Students Data - All 55 students
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

async function seedE1Students() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Clear existing student users
    console.log('🧹 Cleaning existing student users...');
    await UserModel.deleteMany({ role: 'student' });
    console.log('✅ Existing student users cleaned');

    console.log('📝 Creating E1 students with correct schema...');
    
    // Create students with the exact schema format
    const createdStudents = [];
    for (const student of e1Students) {
      const newStudent = new UserModel({
        _id: randomUUID(), // Required _id field
        username: student.rollNo, // Use rollNo as username for login
        password: '123123', // Plain text password as per system
        role: 'student', // Required role field
        name: student.name, // Student's full name
        class: 'Computer Science - E1 Section - 2023', // Required class field
        createdAt: new Date()
      });
      
      const saved = await newStudent.save();
      createdStudents.push(saved);
      
      // Log every 10th student for progress
      if (createdStudents.length % 10 === 0) {
        console.log(`  ✓ Created ${createdStudents.length}/${e1Students.length} students`);
      }
    }

    console.log(`\n🎉 Successfully created ${createdStudents.length} E1 students!`);
    
    // Display summary
    console.log('\n📊 SEEDING SUMMARY:');
    console.log(`Total Students Added: ${createdStudents.length}`);
    console.log(`Class: Computer Science - E1 Section - 2023`);
    console.log(`Default Password: 123123`);
    console.log(`Role: student`);

    console.log('\n👥 Sample Created Users:');
    createdStudents.slice(0, 5).forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (Login: ${user.username})`);
    });
    
    if (createdStudents.length > 5) {
      console.log(`  ... and ${createdStudents.length - 5} more students`);
    }

    console.log('\n📋 Login Instructions:');
    console.log('Students can now login using:');
    console.log('  Username: Their roll number (e.g., 00124402023)');
    console.log('  Password: 123123');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    if (error.code === 11000) {
      console.error('💡 Duplicate key error - some students may already exist');
      console.error('   Try running the script again to clean and recreate all users');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
if (require.main === module) {
  console.log('🚀 Starting E1 student database seeding...\n');
  seedE1Students();
}

module.exports = { seedE1Students, e1Students };

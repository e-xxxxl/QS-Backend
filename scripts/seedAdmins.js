require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const admins = [
  {
    name: 'Super Admin',
    email: 'super@quickship.africa',
    password: 'SuperAdmin@123', // Strong password
    role: 'super_admin',
    permissions: {
      canManageUsers: true,
      canManageShipments: true,
      canManageContent: true,
      canViewAnalytics: true
    }
  }
];

const seedAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing admins (optional)
    // await Admin.deleteMany({});
    // console.log('Cleared existing admins');

    // Check each admin
    for (const adminData of admins) {
      const existingAdmin = await Admin.findOne({ email: adminData.email });
      
      if (existingAdmin) {
        console.log(`Admin ${adminData.email} already exists`);
      } else {
        await Admin.create(adminData);
        console.log(`✅ Created admin: ${adminData.email}`);
        console.log(`   Password: ${adminData.password}`);
      }
    }

    console.log('\n📋 Admin Credentials:');
    console.log('====================');
    admins.forEach(admin => {
      console.log(`\n${admin.name}:`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Password: ${admin.password}`);
      console.log(`  Role: ${admin.role}`);
    });
    
    console.log('\n⚠️  IMPORTANT: Change these passwords immediately after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admins:', error);
    process.exit(1);
  }
};

seedAdmins();
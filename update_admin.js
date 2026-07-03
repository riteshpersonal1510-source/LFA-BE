const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ritesh.work.1510@gmail.com';
const PASSWORD = 'Admin@123';

async function updateAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const hashedPassword = await bcryptjs.hash(PASSWORD, 10);
    
    const { Schema, model } = mongoose;
    const userSchema = new Schema({
      email: String,
      password: String,
      name: String,
      role: String,
      lastLoginAt: Date
    });
    
    const User = model('User', userSchema);
    
    const result = await User.findOneAndUpdate(
      { email: ADMIN_EMAIL },
      { password: hashedPassword },
      { new: true }
    );

    if (result) {
      console.log('Admin user password updated:', ADMIN_EMAIL);
      console.log('Password:', PASSWORD);
      console.log('Hash:', hashedPassword);
      console.log('\nUpdate your .env file with:');
      console.log(`ADMIN_PASSWORD_HASH=${hashedPassword}`);
    } else {
      console.log('Admin user not found, creating new one...');
      const newUser = await User.create({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        name: 'Admin',
        role: 'admin'
      });
      console.log('Admin user created:', ADMIN_EMAIL);
      console.log('Password:', PASSWORD);
      console.log('Hash:', hashedPassword);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

updateAdmin();

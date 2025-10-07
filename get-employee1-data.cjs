const mongoose = require('mongoose');

// User schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  full_name: String,
  role: String,
  status: String,
  is_approved_by_super_admin: Boolean
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function findEmployee1() {
  try {
    await mongoose.connect('mongodb://localhost:27017/est-timesheet-management');
    
    const user = await User.findOne({ email: 'employee1@company.com' });
    if (user) {
      console.log('Employee1 User ID:', user._id.toString());
      console.log('Employee1 Name:', user.full_name);
      console.log('Employee1 Role:', user.role);
      console.log('Employee1 Status:', user.status);
      console.log('Employee1 Approved:', user.is_approved_by_super_admin);
    } else {
      console.log('Employee1 not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

findEmployee1();
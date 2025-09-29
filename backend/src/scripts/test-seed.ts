import { connectToDatabase } from '../config/database';
import User from '../models/User';
import Project from '../models/Project';
import { PasswordSecurity } from '../utils/passwordSecurity';
import { logger } from '../config/logger';

/**
 * Test Data Seeding Script for Phase 1 Testing
 * Creates demo users and projects for testing the implemented features
 */

async function seedTestData() {
  try {
    logger.info('🌱 Starting test data seeding...');

    // Connect to database
    await connectToDatabase();
    logger.info('✅ Connected to database');

    // Clear existing data (optional - be careful in production!)
    // await User.deleteMany({});
    // await Project.deleteMany({});
    // logger.info('🧹 Cleared existing data');

    // Create demo users with different roles
    const demoUsers = [
      {
        email: 'admin@company.com',
        password: 'Admin123!',
        full_name: 'Admin User',
        role: 'super_admin',
        hourly_rate: 100,
        is_active: true,
        is_approved_by_super_admin: true,
        force_password_change: false
      },
      {
        email: 'manager@company.com',
        password: 'Manager123!',
        full_name: 'John Manager',
        role: 'manager',
        hourly_rate: 80,
        is_active: true,
        is_approved_by_super_admin: true,
        force_password_change: false
      },
      {
        email: 'lead@company.com',
        password: 'Lead123!',
        full_name: 'Sarah Lead',
        role: 'lead',
        hourly_rate: 70,
        is_active: true,
        is_approved_by_super_admin: true,
        force_password_change: false
      },
      {
        email: 'test@company.com',
        password: 'Test123!',
        full_name: 'Test Employee',
        role: 'employee',
        hourly_rate: 50,
        is_active: true,
        is_approved_by_super_admin: true,
        force_password_change: false
      }
    ];

    logger.info('👥 Creating demo users...');
    const createdUsers: any[] = [];

    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });

      if (existingUser) {
        logger.info(`📧 User ${userData.email} already exists, skipping...`);
        createdUsers.push(existingUser);
        continue;
      }

      // Hash password
      const hashedPassword = await PasswordSecurity.hashPassword(userData.password);

      // Create user
      const user = new User({
        ...userData,
        password_hash: hashedPassword,
        created_at: new Date(),
        updated_at: new Date()
      });

      await user.save();
      createdUsers.push(user);
      logger.info(`✅ Created user: ${userData.email} (${userData.role})`);
    }

    // Create demo projects
    const demoProjects = [
      {
        name: 'Website Redesign',
        description: 'Complete redesign of company website with modern UI/UX',
        client_name: 'Tech Solutions Inc',
        start_date: new Date(),
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        budget: 50000,
        is_billable: true,
        status: 'active',
        primary_manager_id: createdUsers.find(u => u.role === 'manager')?._id,
        created_by_user_id: createdUsers.find(u => u.role === 'super_admin')?._id
      },
      {
        name: 'Mobile App Development',
        description: 'iOS and Android mobile application development',
        client_name: 'StartupXYZ',
        start_date: new Date(),
        end_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
        budget: 75000,
        is_billable: true,
        status: 'active',
        primary_manager_id: createdUsers.find(u => u.role === 'manager')?._id,
        created_by_user_id: createdUsers.find(u => u.role === 'super_admin')?._id
      },
      {
        name: 'Internal Training System',
        description: 'Employee training and development platform',
        client_name: 'Internal Project',
        start_date: new Date(),
        budget: 25000,
        is_billable: false,
        status: 'active',
        primary_manager_id: createdUsers.find(u => u.role === 'lead')?._id,
        created_by_user_id: createdUsers.find(u => u.role === 'super_admin')?._id
      }
    ];

    logger.info('📋 Creating demo projects...');
    const createdProjects: any[] = [];

    for (const projectData of demoProjects) {
      // Check if project already exists
      const existingProject = await Project.findOne({ name: projectData.name });

      if (existingProject) {
        logger.info(`📋 Project ${projectData.name} already exists, skipping...`);
        createdProjects.push(existingProject);
        continue;
      }

      const project = new Project({
        ...projectData,
        created_at: new Date(),
        updated_at: new Date()
      });

      await project.save();
      createdProjects.push(project);
      logger.info(`✅ Created project: ${projectData.name}`);
    }

    // Print summary
    logger.info('\n📊 Seeding Summary:');
    logger.info(`👥 Users: ${createdUsers.length} total`);
    logger.info(`📋 Projects: ${createdProjects.length} total`);

    logger.info('\n🎯 Demo Credentials for Testing:');
    demoUsers.forEach(user => {
      logger.info(`📧 ${user.email} / ${user.password} (${user.role})`);
    });

    logger.info('\n✅ Test data seeding completed successfully!');

    // Close database connection
    process.exit(0);

  } catch (error) {
    logger.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

// Run the seeding script
seedTestData();
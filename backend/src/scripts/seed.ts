import 'module-alias/register';
import dotenv from 'dotenv';
import { connectDB } from '../config/database';
import { User, Client, Project, Task } from '../models';
import { PasswordSecurity } from '../utils/passwordSecurity';
import logger from '../config/logger';

dotenv.config();

const seedData = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();
    
    logger.info('🌱 Starting database seeding...');

    // Clear existing data (optional - remove in production)
    await (User.deleteMany as any)({}).exec();
    await (Client.deleteMany as any)({}).exec();
    await (Project.deleteMany as any)({}).exec();
    await (Task.deleteMany as any)({}).exec();
    
    logger.info('🧹 Cleared existing data');

    // Create users
    const hashedPassword = await PasswordSecurity.hashPassword('admin123');
    
    const users = await (User.create as any)([
      {
        email: 'admin@company.com',
        full_name: 'System Administrator',
        role: 'super_admin',
        hourly_rate: 100,
        is_active: true,
        is_approved_by_super_admin: true,
        password_hash: hashedPassword
      },
      {
        email: 'manager@company.com',
        full_name: 'Project Manager',
        role: 'manager',
        hourly_rate: 75,
        is_active: true,
        is_approved_by_super_admin: true,
        password_hash: hashedPassword
      },
      {
        email: 'employee1@company.com',
        full_name: 'John Developer',
        role: 'employee',
        hourly_rate: 50,
        is_active: true,
        is_approved_by_super_admin: true,
        password_hash: hashedPassword
      },
      {
        email: 'employee2@company.com',
        full_name: 'Jane Designer',
        role: 'employee',
        hourly_rate: 55,
        is_active: true,
        is_approved_by_super_admin: true,
        password_hash: hashedPassword
      }
    ]);

    logger.info(`👥 Created ${users.length} users`);

    // Create clients
    const clients = await (Client.create as any)([
      {
        name: 'Tech Solutions Inc',
        description: 'A technology consulting company',
        is_active: true,
        contact_email: 'contact@techsolutions.com'
      },
      {
        name: 'Digital Marketing Pro',
        description: 'Digital marketing and advertising agency',
        is_active: true,
        contact_email: 'hello@digitalmarketing.com'
      }
    ]);

    logger.info(`🏢 Created ${clients.length} clients`);

    // Create projects
    const projects = await (Project.create as any)([
      {
        name: 'Website Redesign',
        description: 'Complete website redesign and development',
        client_id: clients[0]._id,
        primary_manager_id: users[1]._id, // Assign manager as primary manager
        status: 'active',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-06-30'),
        budget: 50000,
        is_billable: true
      },
      {
        name: 'Mobile App Development',
        description: 'Cross-platform mobile application',
        client_id: clients[0]._id,
        primary_manager_id: users[1]._id, // Assign manager as primary manager
        status: 'active',
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-08-31'),
        budget: 75000,
        is_billable: true
      },
      {
        name: 'SEO Campaign',
        description: 'Search engine optimization campaign',
        client_id: clients[1]._id,
        primary_manager_id: users[1]._id, // Assign manager as primary manager
        status: 'active',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2024-12-31'),
        budget: 25000,
        is_billable: true
      }
    ]);

    logger.info(`📋 Created ${projects.length} projects`);

    // Create tasks
    const tasks = await (Task.create as any)([
      {
        name: 'Frontend Development',
        description: 'Develop responsive frontend components',
        project_id: projects[0]._id,
        created_by_user_id: users[1]._id, // Created by manager
        estimated_hours: 120,
        hourly_rate: 50,
        is_active: true
      },
      {
        name: 'Backend API Development',
        description: 'Create REST API endpoints',
        project_id: projects[0]._id,
        created_by_user_id: users[1]._id, // Created by manager
        estimated_hours: 80,
        hourly_rate: 60,
        is_active: true
      },
      {
        name: 'UI/UX Design',
        description: 'Design user interface mockups',
        project_id: projects[1]._id,
        created_by_user_id: users[1]._id, // Created by manager
        estimated_hours: 60,
        hourly_rate: 55,
        is_active: true
      },
      {
        name: 'Database Design',
        description: 'Design and optimize database schema',
        project_id: projects[1]._id,
        created_by_user_id: users[1]._id, // Created by manager
        estimated_hours: 40,
        hourly_rate: 65,
        is_active: true
      },
      {
        name: 'Content Optimization',
        description: 'SEO content optimization',
        project_id: projects[2]._id,
        created_by_user_id: users[1]._id, // Created by manager
        estimated_hours: 100,
        hourly_rate: 45,
        is_active: true
      }
    ]);

    logger.info(`📝 Created ${tasks.length} tasks`);

    logger.info('✅ Database seeding completed successfully!');
    logger.info('\n📊 Summary:');
    logger.info(`   Users: ${users.length}`);
    logger.info(`   Clients: ${clients.length}`);
    logger.info(`   Projects: ${projects.length}`);
    logger.info(`   Tasks: ${tasks.length}`);
    logger.info('\n🔑 Login Credentials:');
    logger.info('   Email: admin@company.com');
    logger.info('   Password: admin123');
    logger.info('\n   Email: manager@company.com');
    logger.info('   Password: admin123');
    logger.info('\n   Email: employee1@company.com');
    logger.info('   Password: admin123');

  } catch (error) {
    logger.error('❌ Error seeding database:', error);
  } finally {
    process.exit(0);
  }
};

// Run the seed function
seedData();
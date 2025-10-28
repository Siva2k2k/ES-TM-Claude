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

    const manager = await (User.find as any)({ role: 'manager' }).exec();

    const clients = await (Client.create as any)([
          {
            name: 'Internal',
            description: 'Internal company projects and training',
            is_active: true,
            contact_email: 'internal@company.com'
          }
        ]);
    
        logger.info(`🏢 Created ${clients.length} clients`);

        const projects = await (Project.create as any)([
              {
                name: 'Training Program',
                description: 'Company-wide training and professional development program',
                client_id: clients[0]._id, // Internal client
                primary_manager_id: manager[0]._id, // Assign to first manager
                project_type: 'training',
                status: 'active',
                start_date: new Date('2024-01-01'),
                // No end date - training is ongoing
                is_billable: false
              }
            ]);
        
            logger.info(`📋 Created ${projects.length} projects`);

            const tasks = await (Task.create as any)([
                  // Training Project Default Tasks
                  {
                    name: 'General Training',
                    description: 'General training activities and learning',
                    project_id: projects[0]._id, // Training Program project
                    created_by_user_id: manager[0]._id, // Created by manager
                    estimated_hours: 0, // No estimation for training
                    hourly_rate: 0, // Non-billable
                    is_active: true,
                    is_billable: false
                  }
                ]);
            
                logger.info(`📝 Created ${tasks.length} tasks`);


    } catch (error) {
        logger.error('❌ Error seeding database:', error);
      } finally {
        process.exit(0);
      }
    };

seedData();
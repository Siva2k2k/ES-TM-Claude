const { MongoClient } = require('mongodb');

async function createTestNotification() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('timesheet_service');
    const notificationsCollection = db.collection('notifications');
    
    // Create a test notification for employee1@company.com
    const testNotification = {
      recipient_id: '68df77ec2ba674aa3c8cd2bd', // employee1@company.com user ID
      sender_id: null, // System notification
      title: 'Welcome to the Notification System!',
      message: 'This is a test notification to verify that the notification system is working correctly. You should see this in your notification bell.',
      type: 'info',
      priority: 'medium',
      read: false,
      clicked: false,
      action_url: null,
      meta_data: {
        source: 'system_test',
        test: true
      },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await notificationsCollection.insertOne(testNotification);
    console.log('Test notification created with ID:', result.insertedId);
    
    // Create another notification for timesheet approval
    const timesheetNotification = {
      recipient_id: '68df77ec2ba674aa3c8cd2bd',
      sender_id: null,
      title: 'Timesheet Approved',
      message: 'Your timesheet for this week has been approved by your manager.',
      type: 'success', 
      priority: 'high',
      read: false,
      clicked: false,
      action_url: 'timesheet|timesheet-list',
      meta_data: {
        timesheet_id: 'test_timesheet_123',
        week: 'current'
      },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result2 = await notificationsCollection.insertOne(timesheetNotification);
    console.log('Timesheet notification created with ID:', result2.insertedId);
    
    // Create a task assignment notification
    const taskNotification = {
      recipient_id: '68df77ec2ba674aa3c8cd2bd',
      sender_id: null,
      title: 'New Task Assigned',
      message: 'You have been assigned to work on "Frontend Bug Fixes" project. Please check your task list.',
      type: 'warning',
      priority: 'high', 
      read: false,
      clicked: false,
      action_url: 'projects|project-tasks',
      meta_data: {
        project_id: 'test_project_456',
        task_name: 'Frontend Bug Fixes'
      },
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result3 = await notificationsCollection.insertOne(taskNotification);
    console.log('Task notification created with ID:', result3.insertedId);
    
    console.log('All test notifications created successfully!');
    
  } catch (error) {
    console.error('Error creating test notifications:', error);
  } finally {
    await client.close();
  }
}

createTestNotification();
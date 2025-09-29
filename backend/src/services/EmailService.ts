import nodemailer from 'nodemailer';
import { logger } from '@/config/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface WelcomeEmailData {
  fullName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  expirationTime: string;
}

export interface PasswordResetData {
  fullName: string;
  email: string;
  resetUrl: string;
  expirationTime: string;
}

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  /**
   * Send a generic email
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        logger.warn('Email service not configured - skipping email send');
        return false;
      }

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Timesheet System'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send welcome email with temporary credentials
   */
  static async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const subject = 'Welcome to Timesheet Management System - Your Account Details';
    const html = this.getWelcomeEmailTemplate(data);
    const text = this.getWelcomeEmailText(data);

    return await this.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(data: PasswordResetData): Promise<boolean> {
    const subject = 'Password Reset Request - Timesheet Management System';
    const html = this.getPasswordResetTemplate(data);
    const text = this.getPasswordResetText(data);

    return await this.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send project assignment notification
   */
  static async sendProjectAssignmentEmail(
    userEmail: string,
    userName: string,
    projectName: string,
    assignedBy: string
  ): Promise<boolean> {
    const subject = `You've been assigned to project: ${projectName}`;
    const html = this.getProjectAssignmentTemplate(userName, projectName, assignedBy);
    const text = `Hi ${userName},\n\nYou have been assigned to the project "${projectName}" by ${assignedBy}.\n\nPlease log in to your timesheet system to view your new project assignments.`;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send timesheet approval notification
   */
  static async sendTimesheetApprovalEmail(
    userEmail: string,
    userName: string,
    weekStartDate: string,
    action: 'approved' | 'rejected',
    approver: string,
    comments?: string
  ): Promise<boolean> {
    const subject = `Timesheet ${action} for week of ${weekStartDate}`;
    const html = this.getTimesheetApprovalTemplate(userName, weekStartDate, action, approver, comments);
    const text = `Hi ${userName},\n\nYour timesheet for the week of ${weekStartDate} has been ${action} by ${approver}.${comments ? `\n\nComments: ${comments}` : ''}`;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Welcome email HTML template
   */
  private static getWelcomeEmailTemplate(data: WelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Timesheet Management System</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #3B82F6; font-size: 24px; font-weight: bold; }
          .content { line-height: 1.6; color: #374151; }
          .credentials { background: #F3F4F6; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .credential-item { margin: 10px 0; }
          .credential-label { font-weight: bold; color: #1F2937; }
          .credential-value { font-family: monospace; background: #E5E7EB; padding: 4px 8px; border-radius: 4px; }
          .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 6px; margin: 20px 0; color: #92400E; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 14px; color: #6B7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Timesheet Management System</div>
          </div>

          <div class="content">
            <h2>Welcome, ${data.fullName}!</h2>
            <p>Your account has been created in our Timesheet Management System. Below are your login credentials:</p>

            <div class="credentials">
              <div class="credential-item">
                <span class="credential-label">Email:</span>
                <span class="credential-value">${data.email}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Temporary Password:</span>
                <span class="credential-value">${data.temporaryPassword}</span>
              </div>
            </div>

            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong><br>
              • This is a temporary password that expires on ${data.expirationTime}<br>
              • You must change your password upon first login<br>
              • Do not share these credentials with anyone<br>
              • If you didn't expect this email, please contact your administrator
            </div>

            <p>
              <a href="${data.loginUrl}" class="button">Login to Your Account</a>
            </p>

            <h3>Getting Started:</h3>
            <ol>
              <li>Click the login button above or visit the login page</li>
              <li>Enter your email and temporary password</li>
              <li>You'll be prompted to create a new secure password</li>
              <li>Complete your profile setup</li>
              <li>Start using the timesheet system</li>
            </ol>

            <p>If you have any questions or need assistance, please contact your system administrator.</p>
          </div>

          <div class="footer">
            <p>This email was sent from the Timesheet Management System. Please do not reply to this email.</p>
            <p>For security reasons, this email contains sensitive information. Please delete it after setting up your account.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Welcome email plain text version
   */
  private static getWelcomeEmailText(data: WelcomeEmailData): string {
    return `
Welcome to Timesheet Management System

Hi ${data.fullName},

Your account has been created in our Timesheet Management System.

Login Credentials:
Email: ${data.email}
Temporary Password: ${data.temporaryPassword}

IMPORTANT SECURITY NOTICE:
- This is a temporary password that expires on ${data.expirationTime}
- You must change your password upon first login
- Do not share these credentials with anyone
- If you didn't expect this email, please contact your administrator

Login URL: ${data.loginUrl}

Getting Started:
1. Visit the login page using the URL above
2. Enter your email and temporary password
3. You'll be prompted to create a new secure password
4. Complete your profile setup
5. Start using the timesheet system

If you have any questions or need assistance, please contact your system administrator.

For security reasons, please delete this email after setting up your account.
    `;
  }

  /**
   * Password reset email HTML template
   */
  private static getPasswordResetTemplate(data: PasswordResetData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #3B82F6; font-size: 24px; font-weight: bold; }
          .content { line-height: 1.6; color: #374151; }
          .button { display: inline-block; background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .warning { background: #FEF2F2; border: 1px solid #DC2626; padding: 15px; border-radius: 6px; margin: 20px 0; color: #991B1B; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 14px; color: #6B7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Timesheet Management System</div>
          </div>

          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hi ${data.fullName},</p>
            <p>We received a request to reset your password for your Timesheet Management System account.</p>

            <p>
              <a href="${data.resetUrl}" class="button">Reset Your Password</a>
            </p>

            <div class="warning">
              <strong>⚠️ Security Information:</strong><br>
              • This reset link expires on ${data.expirationTime}<br>
              • If you didn't request this reset, please ignore this email<br>
              • Your current password remains unchanged until you complete the reset<br>
              • Do not share this reset link with anyone
            </div>

            <p>If the button above doesn't work, you can copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; background: #F3F4F6; padding: 10px; border-radius: 4px; font-family: monospace;">${data.resetUrl}</p>

            <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
          </div>

          <div class="footer">
            <p>This email was sent from the Timesheet Management System. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password reset email plain text version
   */
  private static getPasswordResetText(data: PasswordResetData): string {
    return `
Password Reset Request - Timesheet Management System

Hi ${data.fullName},

We received a request to reset your password for your Timesheet Management System account.

Reset URL: ${data.resetUrl}

SECURITY INFORMATION:
- This reset link expires on ${data.expirationTime}
- If you didn't request this reset, please ignore this email
- Your current password remains unchanged until you complete the reset
- Do not share this reset link with anyone

If you didn't request a password reset, you can safely ignore this email.
    `;
  }

  /**
   * Project assignment email HTML template
   */
  private static getProjectAssignmentTemplate(userName: string, projectName: string, assignedBy: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Project Assignment Notification</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
          .header { color: #3B82F6; font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 30px; }
          .content { line-height: 1.6; color: #374151; }
          .highlight { background: #EFF6FF; padding: 15px; border-radius: 6px; border-left: 4px solid #3B82F6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Timesheet Management System</div>
          <div class="content">
            <h2>New Project Assignment</h2>
            <p>Hi ${userName},</p>
            <div class="highlight">
              <p><strong>You have been assigned to the project:</strong> ${projectName}</p>
              <p><strong>Assigned by:</strong> ${assignedBy}</p>
            </div>
            <p>Please log in to your timesheet system to view your new project assignments and start tracking your time.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Timesheet approval email HTML template
   */
  private static getTimesheetApprovalTemplate(
    userName: string,
    weekStartDate: string,
    action: 'approved' | 'rejected',
    approver: string,
    comments?: string
  ): string {
    const color = action === 'approved' ? '#10B981' : '#DC2626';
    const bgColor = action === 'approved' ? '#ECFDF5' : '#FEF2F2';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Timesheet ${action === 'approved' ? 'Approved' : 'Rejected'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
          .header { color: #3B82F6; font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 30px; }
          .content { line-height: 1.6; color: #374151; }
          .status { background: ${bgColor}; padding: 15px; border-radius: 6px; border-left: 4px solid ${color}; }
          .comments { background: #F9FAFB; padding: 15px; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Timesheet Management System</div>
          <div class="content">
            <h2>Timesheet ${action === 'approved' ? 'Approved' : 'Rejected'}</h2>
            <p>Hi ${userName},</p>
            <div class="status">
              <p><strong>Your timesheet for week of ${weekStartDate} has been ${action}.</strong></p>
              <p><strong>${action === 'approved' ? 'Approved' : 'Rejected'} by:</strong> ${approver}</p>
            </div>
            ${comments ? `<div class="comments"><strong>Comments:</strong><br>${comments}</div>` : ''}
            <p>Please log in to your timesheet system for more details.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Verify email service configuration
   */
  static async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified successfully');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}
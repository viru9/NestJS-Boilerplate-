import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('email.host'),
      port: this.configService.get('email.port'),
      secure: this.configService.get('email.secure'),
      auth: {
        user: this.configService.get('email.auth.user'),
        pass: this.configService.get('email.auth.pass'),
      },
    });
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    try {
      const template = this.getTemplate('welcome');
      const html = template({
        firstName,
        appName: 'Your App',
        loginUrl: `${this.configService.get('app.frontendUrl')}/login`,
      });

      await this.transporter.sendMail({
        from: `${this.configService.get('email.from.name')} <${this.configService.get('email.from.email')}>`,
        to,
        subject: 'Welcome to Our App!',
        html,
      });

      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    try {
      const template = this.getTemplate('reset-password');
      const resetUrl = `${this.configService.get('app.frontendUrl')}/reset-password?token=${resetToken}`;

      const html = template({
        resetUrl,
        appName: 'Your App',
      });

      await this.transporter.sendMail({
        from: `${this.configService.get('email.from.name')} <${this.configService.get('email.from.email')}>`,
        to,
        subject: 'Password Reset Request',
        html,
      });

      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(
    to: string,
    verificationToken: string,
  ): Promise<void> {
    try {
      const template = this.getTemplate('verify-email');
      const verificationUrl = `${this.configService.get('app.frontendUrl')}/verify-email?token=${verificationToken}`;

      const html = template({
        verificationUrl,
        appName: 'Your App',
      });

      await this.transporter.sendMail({
        from: `${this.configService.get('email.from.name')} <${this.configService.get('email.from.email')}>`,
        to,
        subject: 'Verify Your Email Address',
        html,
      });

      this.logger.log(`Email verification sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email verification to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Get email template
   */
  private getTemplate(templateName: string): HandlebarsTemplateDelegate {
    const templatePath = path.join(
      __dirname,
      'templates',
      `${templateName}.hbs`,
    );

    if (!fs.existsSync(templatePath)) {
      this.logger.warn(`Template ${templateName} not found, using fallback`);
      return this.getFallbackTemplate(templateName);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf8');
    return Handlebars.compile(templateSource);
  }

  /**
   * Get fallback template if file doesn't exist
   */
  private getFallbackTemplate(
    templateName: string,
  ): HandlebarsTemplateDelegate {
    const fallbackTemplates = {
      welcome: `
        <html>
          <body>
            <h1>Welcome {{firstName}}!</h1>
            <p>Thank you for joining {{appName}}.</p>
            <p><a href="{{loginUrl}}">Login to your account</a></p>
          </body>
        </html>
      `,
      'reset-password': `
        <html>
          <body>
            <h1>Password Reset Request</h1>
            <p>Click the link below to reset your password:</p>
            <p><a href="{{resetUrl}}">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
          </body>
        </html>
      `,
      'verify-email': `
        <html>
          <body>
            <h1>Verify Your Email</h1>
            <p>Click the link below to verify your email address:</p>
            <p><a href="{{verificationUrl}}">Verify Email</a></p>
          </body>
        </html>
      `,
    };

    return Handlebars.compile(
      fallbackTemplates[templateName] ||
        '<html><body>{{message}}</body></html>',
    );
  }
}

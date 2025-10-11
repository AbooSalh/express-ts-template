import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendMailOptions } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE', false),
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    } as any);
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.configService.get('SMTP_FROM_NAME')}" <${this.configService.get('SMTP_FROM_EMAIL')}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      });

      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error: any) {
      this.logger.error(`Email sending failed to ${options.to}`, error.stack);
      throw new Error('Failed to send email. Please try again later.');
    }
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    const html = await this.emailVerificationTemplate(code);
    await this.sendMail({
      to: email,
      subject: 'Verify Your Email',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, code: string): Promise<void> {
    const html = await this.resetPasswordTemplate(code);
    await this.sendMail({
      to: email,
      subject: 'Reset Password Code',
      html,
    });
  }

  async sendDeleteAccountEmail(email: string, code: string): Promise<void> {
    const html = await this.deleteAccountTemplate(code);
    await this.sendMail({
      to: email,
      subject: 'Delete Account Verification',
      html,
    });
  }

  private async getLogoUrl(): Promise<string> {
    return 'https://picsum.photos/id/237/200/300';
  }

  private async generateBaseTemplate(
    title: string,
    message: string,
    code: string,
    codeColor: string,
  ): Promise<string> {
    const logoUrl = await this.getLogoUrl();
    return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
      <div style="background: #f5f7fa; padding: 20px; text-align: center; border-bottom: 1px solid #eaeaea;">
        <img src="${logoUrl}" alt="Website Logo" style="max-height: 60px; margin-bottom: 15px;">
        <h2 style="margin: 0; color: #333; font-weight: 600;">${title}</h2>
      </div>
      <div style="padding: 30px; text-align: center;">
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">${message}</p>
        <div style="display: inline-block; background: #fff; border: 2px dashed ${codeColor}; color: ${codeColor}; padding: 15px 25px; font-size: 22px; font-weight: bold; letter-spacing: 2px; border-radius: 6px; font-family: 'Courier New', monospace;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #888; margin-top: 15px;">This code will expire in <strong>10 minutes</strong>. Copy it exactly as shown.</p>
      </div>
      <div style="background: #f9f9f9; padding: 15px; text-align: center; font-size: 13px; color: #999; border-top: 1px solid #eaeaea;">
        <p style="margin: 0;">If you didn't request this email, please ignore it.</p>
      </div>
    </div>
    `;
  }

  private async resetPasswordTemplate(code: string): Promise<string> {
    return this.generateBaseTemplate(
      'Password Reset Request',
      'We received a request to reset your password. Use the code below to proceed:',
      code,
      '#007bff',
    );
  }

  private async emailVerificationTemplate(code: string): Promise<string> {
    return this.generateBaseTemplate(
      'Email Verification',
      'Welcome! Please verify your email address using the code below:',
      code,
      '#28a745',
    );
  }

  private async deleteAccountTemplate(code: string): Promise<string> {
    return this.generateBaseTemplate(
      'Delete Account Verification',
      'We received a request to delete your account. Use the code below to confirm:',
      code,
      '#dc3545',
    );
  }
}

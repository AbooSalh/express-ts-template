// Utility to get logo URL - returns default since Settings model is removed
const getLogoUrl = async (): Promise<string> => {
  return "https://picsum.photos/id/237/200/300";
};

// Base email template generator
const generateBaseTemplate = async (
  title: string,
  message: string,
  code: string,
  codeColor: string
) => {
  const logoUrl = await getLogoUrl();

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
      
      <!-- Header -->
      <div style="background: #f5f7fa; padding: 20px; text-align: center; border-bottom: 1px solid #eaeaea;">
        <img src="${logoUrl}" alt="Website Logo" style="max-height: 60px; margin-bottom: 15px;">
        <h2 style="margin: 0; color: #333; font-weight: 600;">${title}</h2>
      </div>

      <!-- Body -->
      <div style="padding: 30px; text-align: center;">
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">${message}</p>
        <div style="display: inline-block; background: #fff; border: 2px dashed ${codeColor}; color: ${codeColor}; padding: 15px 25px; font-size: 22px; font-weight: bold; letter-spacing: 2px; border-radius: 6px; font-family: 'Courier New', monospace;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #888; margin-top: 15px;">This code will expire in <strong>10 minutes</strong>. Copy it exactly as shown.</p>
      </div>

      <!-- Footer -->
      <div style="background: #f9f9f9; padding: 15px; text-align: center; font-size: 13px; color: #999; border-top: 1px solid #eaeaea;">
        <p style="margin: 0;">If you didn't request this email, please ignore it.</p>
      </div>
    </div>
  `;
};

// Password Reset Template
export const resetPasswordTemplate = async (code: string) => {
  try {
    return await generateBaseTemplate(
      "Password Reset Request",
      "We received a request to reset your password. Use the code below to proceed:",
      code,
      "#007bff"
    );
  } catch (error) {
    console.error("Error generating reset password template:", error);
    // Fallback simple template
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Use the code below to proceed:</p>
        <div style="background: #f0f0f0; padding: 15px; font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `;
  }
};

// Email Verification Template
export const emailVerificationTemplate = async (code: string) => {
  try {
    return await generateBaseTemplate(
      "Verify Your Email Address",
      "Thank you for signing up! Use the code below to verify your email address:",
      code,
      "#28a745"
    );
  } catch (error) {
    console.error("Error generating email verification template:", error);
    // Fallback simple template
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Verify Your Email Address</h2>
        <p>Thank you for signing up! Use the code below to verify your email address:</p>
        <div style="background: #f0f0f0; padding: 15px; font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `;
  }
};

// Contact Form Template
export interface ContactEmailData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export const contactEmailTemplate = async (data: ContactEmailData) => {
  try {
    const logoUrl = await getLogoUrl();

    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        
        <!-- Header -->
        <div style="background: #f5f7fa; padding: 20px; text-align: center; border-bottom: 1px solid #eaeaea;">
          <img src="${logoUrl}" alt="Website Logo" style="max-height: 60px; margin-bottom: 15px;">
          <h2 style="margin: 0; color: #333; font-weight: 600;">New Contact Form Message</h2>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 18px;">Message Details</h3>
            <table style="width: 100%; font-size: 14px; color: #555;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; font-weight: 600; width: 80px;">Subject:</td>
                <td style="padding: 8px 0;">${data.subject}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; font-weight: 600;">Name:</td>
                <td style="padding: 8px 0;">${data.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; font-weight: 600;">Email:</td>
                <td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #007bff; text-decoration: none;">${data.email}</a></td>
              </tr>
              ${data.phone ? `<tr>
                <td style="padding: 8px 0; font-weight: 600;">Phone:</td>
                <td style="padding: 8px 0;"><a href="tel:${data.phone}" style="color: #007bff; text-decoration: none;">${data.phone}</a></td>
              </tr>` : ''}
            </table>
          </div>

          <div style="background: #fff; border: 1px solid #dee2e6; border-radius: 6px; padding: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Message:</h3>
            <p style="margin: 0; line-height: 1.6; color: #555; white-space: pre-wrap;">${data.message}</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9f9f9; padding: 15px; text-align: center; font-size: 13px; color: #999; border-top: 1px solid #eaeaea;">
          <p style="margin: 0;">This message was sent through your website's contact form.</p>
          <p style="margin: 5px 0 0 0;">Reply directly to <strong>${data.email}</strong> to respond to this inquiry.</p>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error generating contact email template:", error);
    // Fallback simple template
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 6px;">
        <h2 style="color: #333; margin-bottom: 20px;">New Contact Form Message</h2>
        
        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
          ${data.phone ? `<p><strong>Phone:</strong> <a href="tel:${data.phone}">${data.phone}</a></p>` : ''}
        </div>
        
        <div style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
          <h3>Message:</h3>
          <p style="white-space: pre-wrap;">${data.message}</p>
        </div>
        
        <p style="font-size: 12px; color: #888; margin-top: 20px;">
          This message was sent through your website's contact form.
        </p>
      </div>
    `;
  }
};

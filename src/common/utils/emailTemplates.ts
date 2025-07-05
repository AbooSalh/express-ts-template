export const resetPasswordTemplate = (code: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #333;">Password Reset Code</h2>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin-bottom: 20px;">
            <p style="color: #666; margin-bottom: 10px;">Your password reset code is:</p>
            <div style="background-color: #fff; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #007bff; border: 2px dashed #007bff;">
                ${code}
            </div>
        </div>
        <div style="color: #666; font-size: 14px; text-align: center;">
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
        </div>
    </div>
`;

export const emailVerificationTemplate = (code: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #333;">Email Verification Code</h2>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin-bottom: 20px;">
            <p style="color: #666; margin-bottom: 10px;">Your email verification code is:</p>
            <div style="background-color: #fff; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #28a745; border: 2px dashed #28a745;">
                ${code}
            </div>
        </div>
        <div style="color: #666; font-size: 14px; text-align: center;">
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
        </div>
    </div>
`;

import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

export const generateToken = (userId, res) => {

    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "7d"
    });

    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000, //MS
        httpOnly: true, //Prevent XSS attacks cross-site scripting attacks
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        secure: process.env.NODE_ENV === "production", // true only if using HTTPS
    });

    return token;
};

// export const generateTokenOtp = (userId, res) => {

//     const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
//         expiresIn: "15m" // Expiry time set to 15 minutes
//     });

//     res.cookie("jwt", token, {
//         maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
//         httpOnly: true,
//         sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
//         secure: process.env.NODE_ENV === "production", // true only if using HTTPS
//     });

//     return token;
// };

// export const generateTokenResetpassword = (userId, res) => {

//     const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
//         expiresIn: "30m" // Expiry time set to 30 minutes
//     });

//     res.cookie("jwt", token, {
//         maxAge: 30 * 60 * 1000, // 15 minutes in milliseconds
//         httpOnly: true,
//         sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
//         secure: process.env.NODE_ENV === "production", // true only if using HTTPS
//     });

//     return token;
// };

export function generateVerificationOtpEmailTemplate(verificationOtp) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); color: #333;">
        <h2 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">Verify Your Email Address</h2>    
        <p>Dear User,</p>      
        <p>To complete your email verification, please use the One-Time Password (OTP) provided below:</p>      
        <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 28px; font-weight: 700; color: #1abc9c; background-color: #f4f4f4; padding: 15px 25px; border-radius: 6px; letter-spacing: 2px;">
                ${verificationOtp}
            </span>
        </div>
        <p>This code is valid for <strong>15 minutes</strong>. If you did not initiate this request, please disregard this email.</p>
        <p>Best regards,<br>Chat App Team</p>
        <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888888; text-align: center;">
            &copy; 2024 Chat App Team. All rights reserved.<br>
            This is an automated message, please do not reply.
        </p>
    </div>`;
}

export const sendEmail = async ({email,subject,message}) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        service: process.env.SMTP_SERVICE,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from : process.env.SMTP_MAIL,
        to: email,
        subject,
        html: message
    }

    await transporter.sendMail(mailOptions);

}
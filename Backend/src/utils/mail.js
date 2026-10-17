import nodemailer from 'nodemailer';
import Mailgen from 'mailgen';

// Initialize Mailgen for generating email HTML & text templates
const mailGenerator = new Mailgen({
    theme: 'default',
    product: {
        name: process.env.APP_NAME || 'AzinaHack',
        link: process.env.APP_URL || 'https://azinahack.com'
    }
});

const createTransporter = () => {
    // Gmail service configuration
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPass) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPass
            }
        });
    }

    // Generic SMTP fallback configuration
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
        return nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: {
                user,
                pass
            }
        });
    }

    return null;
};

/**
 * Send OTP verification email formatted with Mailgen
 * @param {string} toEmail 
 * @param {string} otp 
 * @param {string} username 
 */
export const sendOtpEmail = async (toEmail, otp, username = 'User') => {
    const emailContent = {
        body: {
            name: username,
            intro: 'Welcome to AzinaHack! We are excited to have you on board.',
            action: {
                instructions: 'To verify your email address and activate your account, please enter the One-Time Password (OTP) below:',
                button: {
                    color: '#22BC66',
                    text: `OTP Code: ${otp}`,
                    link: '#'
                }
            },
            outro: [
                'This OTP is valid for 10 minutes.',
                'If you did not request this verification, please disregard this email.'
            ]
        }
    };

    const emailHtml = mailGenerator.generate(emailContent);
    const emailText = mailGenerator.generatePlaintext(emailContent);

    const transporter = createTransporter();
    const senderEmail = process.env.GMAIL_USER || process.env.SMTP_USER || 'no-reply@azinahack.com';

    const mailOptions = {
        from: process.env.SMTP_FROM || `"AzinaHack" <${senderEmail}>`,
        to: toEmail,
        subject: `Your Verification OTP: ${otp}`,
        text: emailText,
        html: emailHtml
    };

    if (transporter) {
        return await transporter.sendMail(mailOptions);
    } else {
        console.log('----------------------------------------------------');
        console.log(`[MAIL SERVICE - Mailgen Template Rendered]`);
        console.log(`To: ${toEmail} (${username})`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`(Configure GMAIL_USER & GMAIL_APP_PASSWORD in .env to send real emails)`);
        console.log('----------------------------------------------------');
        return { messageId: 'simulated-mail-id' };
    }
};

export default sendOtpEmail;

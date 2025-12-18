const nodemailer = require('nodemailer');

const sendContactEmail = async (req, res) => {
    const { name, email, message } = req.body;

    // Validate input
    if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: 'Name, email, and message are required fields.' });
    }

    try {
        // Create reusable transporter object using the default SMTP transport
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SUPPORT_EMAIL,
                pass: process.env.SUPPORT_EMAIL_PASSWORD,
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        // Email options for Admin
        const adminMailOptions = {
            // Use verified sender for better deliverability
            from: `"ThinkCyber Contact" <${process.env.SUPPORT_EMAIL}>`,
            replyTo: email,
            to: process.env.CONTACT_EMAIL, // Admin email
            subject: `New Contact Message from ${name}`,
            html: `
            <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f5f7fa; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                
                <h3 style="margin-top: 0; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
                    New Contact Message
                </h3>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;">
                    <tr>
                    <td style="padding: 8px 0; color: #374151; width: 120px;"><strong>Name</strong></td>
                    <td style="padding: 8px 0; color: #111827;">${name}</td>
                    </tr>
                    <tr>
                    <td style="padding: 8px 0; color: #374151;"><strong>Email</strong></td>
                    <td style="padding: 8px 0;">
                        <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">
                        ${email}
                        </a>
                    </td>
                    </tr>
                </table>

                <div style="margin-top: 20px;">
                    <p style="margin: 0 0 6px; color: #374151;"><strong>Message</strong></p>
                    <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 12px; border-radius: 4px; color: #111827; line-height: 1.6;">
                    ${message}
                    </div>
                </div>

                <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                    This email was generated from the ThinkCyber contact form.
                </p>
                </div>
            </div>
            `,
        };

        // Send email to Admin
        await transporter.sendMail(adminMailOptions);

        // (Optional) Send confirmation email to User
        const userMailOptions = {
            from: `"ThinkCyber Team" <${process.env.SUPPORT_EMAIL}>`,
            to: email,
            subject: 'We received your message',
            html: `
        <p>Hi ${name},</p>
        <p>Thank you for contacting us. We have received your message and will get back to you shortly.</p>
        <p>Best regards,<br>ThinkCyber Team</p>
      `,
        };

        // Send confirmation email (fire and forget or await?)
        // Usually await to ensure it works, or catch error and log it but still return success.
        try {
            await transporter.sendMail(userMailOptions);
        } catch (userEmailError) {
            console.error("Failed to send confirmation email to user:", userEmailError);
            // We don't fail the request if user confirmation fails, as long as admin received it.
        }

        return res.status(200).json({ success: true, message: 'Message sent successfully' });

    } catch (error) {
        console.error('Error sending contact email:', error);
        return res.status(500).json({ success: false, message: 'Failed to send message. Please try again later.', error: error.message });
    }
};

module.exports = {
    sendContactEmail,
};

import nodemailer from "nodemailer"

//Create SMTP Transporter
let transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_FROM,
      pass: process.env.SMTP_PASS
    }
  });

export const sendEmail = async (to: string, subject: string, text: string) => {
    try {
        const mailOptions = {
            from: process.env.SMTP_FROM, // Sender email address
            to,
            subject,
            text
        };

        await transport.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};
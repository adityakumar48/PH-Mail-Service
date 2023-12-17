import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();
const cron = require("node-cron");

import express from "express";
import { MailOptions } from "nodemailer/lib/sendmail-transport";
import { taskReminder } from "./templates/taskReminder";

const prisma = new PrismaClient();

const app = express();

app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NEXT_PUBLIC_EMAIL,
    pass: process.env.NEXT_PUBLIC_EMAIL_PASSWORD,
  },
});

cron.schedule("* * * * *", async () => {
  console.log("running a task every minute");

  const currentTime = new Date();
  const oneMinuteAgo = new Date(currentTime.getTime() - 60000); // Subtract 1 minute in milliseconds

  try {
    const reminders = await prisma.reminder.findMany({
      where: {
        Time: {
          gte: oneMinuteAgo.toISOString(),
          lte: currentTime.toISOString(),
        },
        Status: "Pending",
      },
    });

    console.log(reminders);

    reminders.map(async (item) => {
      // Send email

      const mailOptions: MailOptions = {
        from: `"ProductivityHub" <${process.env.NEXT_PUBLIC_EMAIL}>`,
        to: item.Email,
        subject: `Task Reminder - ${item.Title}`,
        html: taskReminder(
          item.name,
          item.Title,
          item.Time.toString(),
          item.Description
        ),
      };

      const info = await transporter.sendMail(mailOptions);

      if (info.messageId) {
        console.log(
          `Email sent successfully! Email :- ${item.Email} Message ID: ${info.messageId}`
        );
        const updatedReminder = await prisma.reminder.update({
          where: {
            id: item.id,
          },
          data: {
            Status: "completed",
          },
        });
        console.log(
          `Status updated to "completed" for reminder Title: ${item.Title}`
        );
      } else {
        console.error("Failed to send email");
        console.error(info);
      }
    });

    console.log("Current Time :- ", currentTime);
  } catch (error) {
    console.log(error);
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

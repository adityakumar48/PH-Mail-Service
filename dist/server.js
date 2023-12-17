"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const nodemailer_1 = __importDefault(require("nodemailer"));
dotenv_1.default.config();
const cron = require("node-cron");
const express_1 = __importDefault(require("express"));
const taskReminder_1 = require("./templates/taskReminder");
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NEXT_PUBLIC_EMAIL,
        pass: process.env.NEXT_PUBLIC_EMAIL_PASSWORD,
    },
});
cron.schedule("* * * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("running a task every minute");
    const currentTime = new Date();
    const oneMinuteAgo = new Date(currentTime.getTime() - 60000); // Subtract 1 minute in milliseconds
    try {
        const reminders = yield prisma.reminder.findMany({
            where: {
                Time: {
                    gte: oneMinuteAgo.toISOString(),
                    lte: currentTime.toISOString(),
                },
                Status: "Pending",
            },
        });
        console.log(reminders);
        reminders.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            // Send email
            const mailOptions = {
                from: `"ProductivityHub" <${process.env.NEXT_PUBLIC_EMAIL}>`,
                to: item.Email,
                subject: `Task Reminder - ${item.Title}`,
                html: (0, taskReminder_1.taskReminder)(item.name, item.Title, item.Time.toString(), item.Description),
            };
            const info = yield transporter.sendMail(mailOptions);
            if (info.messageId) {
                console.log(`Email sent successfully! Email :- ${item.Email} Message ID: ${info.messageId}`);
                const updatedReminder = yield prisma.reminder.update({
                    where: {
                        id: item.id,
                    },
                    data: {
                        Status: "completed",
                    },
                });
                console.log(`Status updated to "completed" for reminder Title: ${item.Title}`);
            }
            else {
                console.error("Failed to send email");
                console.error(info);
            }
        }));
        console.log("Current Time :- ", currentTime);
    }
    catch (error) {
        console.log(error);
    }
}));
app.listen(8000, () => {
    console.log("Server is running on port 8000");
});

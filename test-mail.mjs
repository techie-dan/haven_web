import FormData from "form-data";
import Mailgun from "mailgun.js";

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});

try {
  const domain = "sandbox8140c9581a234dddb8638ec3b2899318.mailgun.org";
  const data = await mg.messages.create(domain, {
    from: `Haven <postmaster@${domain}>`,
    to: ["danielolaleye064@gmail.com"],
    subject: "Node test",
    text: "Sent from Node with the Mailgun SDK.",
  });

  console.log("SUCCESS:", data);
} catch (error) {
  console.error("ERROR:", error);
}

import { createFileRoute } from "@tanstack/react-router";

// EgoSMS credentials are intentionally kept here (owner's request: no env config).
const EGOSMS_URL = "https://comms.egosms.co/api/v1/json/";
const EGOSMS_USERNAME = "okelloadam";
const EGOSMS_PASSWORD = "64c3624a1637adc07e0f6d261df9a14593f5f4573f655860";

type Msg = { number: string; message: string; senderid?: string };

export const Route = createFileRoute("/api/public/send-sms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { messages?: Msg[]; senderid?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ Status: "Failed", Message: "Invalid JSON" }, { status: 400 });
        }

        const senderid = (body.senderid || "EgoSMS").slice(0, 11);
        const msgdata = (body.messages ?? [])
          .filter((m) => m && typeof m.number === "string" && typeof m.message === "string")
          .map((m) => ({
            number: m.number.replace(/[^\d]/g, ""),
            message: m.message.slice(0, 900),
            senderid: (m.senderid || senderid).slice(0, 11),
            priority: "0",
          }))
          .filter((m) => m.number.length >= 9 && m.message.length > 0);

        if (msgdata.length === 0) {
          return Response.json({ Status: "Failed", Message: "No valid recipients" }, { status: 400 });
        }

        try {
          const res = await fetch(EGOSMS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method: "SendSms",
              userdata: { username: EGOSMS_USERNAME, password: EGOSMS_PASSWORD },
              msgdata,
            }),
          });
          const text = await res.text();
          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = { Status: res.ok ? "OK" : "Failed", Message: text.slice(0, 300) };
          }
          return Response.json({ sent: msgdata.length, provider: parsed });
        } catch (error) {
          return Response.json(
            { Status: "Failed", Message: error instanceof Error ? error.message : "Request failed" },
            { status: 502 },
          );
        }
      },
    },
  },
});

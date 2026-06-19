import Imap from "imap";
import { simpleParser } from "mailparser";
import { config } from "../config.js";
import { parseLeaveEmail } from "./parserService.js";
import { LeaveRequest } from "../models/leaveRequestModel.js";

function openInbox(imap) {
  return new Promise((resolve, reject) => {
    imap.openBox("INBOX", false, (err, box) => {
      if (err) return reject(err);
      resolve(box);
    });
  });
}

function searchUnreadLeave(imap) {
  return new Promise((resolve, reject) => {
    imap.search(["UNSEEN", ["HEADER", "SUBJECT", "Leave Request"]], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

function fetchMessages(imap, uids) {
  return new Promise((resolve, reject) => {
    if (!uids || uids.length === 0) return resolve([]);
    const f = imap.fetch(uids, { bodies: "", markSeen: false });
    const items = [];
    f.on("message", (msg, seqno) => {
      const item = { seqno, parts: [], attributes: null };
      msg.on("body", (stream) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => item.parts.push(Buffer.concat(chunks)));
      });
      msg.on("attributes", (attrs) => (item.attributes = attrs));
      msg.on("end", () => items.push(item));
    });
    f.once("error", (err) => reject(err));
    f.once("end", () => resolve(items));
  });
}

export async function checkAndProcessEmails() {
  if (!config.mailUser || !config.mailPass) {
    console.log("Email credentials not configured; skipping email check.");
    return;
  }

  const imap = new Imap({
    user: config.mailUser,
    password: config.mailPass,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: config.mailAllowInsecureTLS
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const ready = new Promise((resolve, reject) => {
    imap.once("ready", resolve);
    imap.once("error", reject);
  });

  imap.connect();
  try {
    await ready;
    console.log("Connected to Gmail");
    await openInbox(imap);
    console.log("Inbox opened");
    const uids = await searchUnreadLeave(imap);
    console.log("Unread Leave Emails:", uids);
    console.log("Unread Leave Emails:", uids);
    if (!uids || uids.length === 0) {
      imap.end();
      return;
    }

    const messages = await fetchMessages(imap, uids);
    for (const msg of messages) {
      try {
        const raw = msg.parts.map((p) => p.toString()).join("\n");
        const parsed = await simpleParser(raw);
        console.log("Email Body:");
console.log(parsed.text);
        console.log("Email Content:");
        console.log(parsed.text);
        const text = parsed.text || parsed.html || raw;
        const leave = parseLeaveEmail(String(text));
        console.log("Parsed Leave:", leave);
        if (!leave) {
          // mark as seen to avoid infinite loop of unparsable messages
          imap.addFlags(msg.attributes.uid, "\\Seen", () => {});
          continue;
        }

        const exists = await LeaveRequest.findOne({
          employeeId: leave.employeeId,
          fromDate: leave.fromDate,
          toDate: leave.toDate,
          source: "Email",
        }).lean();
        if (exists) {
          imap.addFlags(msg.attributes.uid, "\\Seen", () => {});
          continue;
        }

          const created = await LeaveRequest.create({
            employeeId: leave.employeeId,
            fromDate: leave.fromDate,
            toDate: leave.toDate,
            days: leave.days,
            reason: leave.reason,
            status: "Pending",
            source: "Email",
          });
          // compute and persist analysis snapshot
          try {
            const { getRecommendation } = await import("./leaveAnalysisService.js");
            const analysis = await getRecommendation(leave.employeeId, leave.days);
            await LeaveRequest.findByIdAndUpdate(created._id, {
              latestLeaveDate: analysis.latestLeaveDate,
              leavesUsedThisMonth: analysis.leavesUsedThisMonth,
              remainingLeaves: analysis.remainingLeaves,
              totalAfterApproval: analysis.totalAfterApproval,
              recommendation: analysis.recommendation,
            });
          } catch (err) {
            console.warn("Failed to compute leave analysis for email-created leave", err);
          }

        console.log("Leave Request Saved Successfully");
        imap.addFlags(msg.attributes.uid, "\\Seen", () => {});
      } catch (err) {
        console.warn("Failed to process message", err);
        try {
          imap.addFlags(msg.attributes.uid, "\\Seen", () => {});
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn("Error checking emails:", err);
  } finally {
    try {
      imap.end();
    } catch (e) {}
  }
}

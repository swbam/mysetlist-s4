import { serve } from "std/server";
import { sendEmail } from "../../../packages/email";

serve(async (req) => {
  try {
    const payload = await req.json();
    const result = await sendEmail(payload);
    return new Response(
      JSON.stringify({ ok: true, result }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-email failed", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});


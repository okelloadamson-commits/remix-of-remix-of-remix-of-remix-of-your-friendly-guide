// deno-lint-ignore-file

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PESAPAL_LIVE_API_URL = "https://pay.pesapal.com/v3";
const PESAPAL_SANDBOX_API_URL = "https://cybqa.pesapal.com/pesapalv3";

// Cache token in memory (edge function instance)
let cachedToken: { token: string; expiryDate: string; baseUrl: string } | null = null;

async function requestPesapalToken(baseUrl: string, consumerKey: string, consumerSecret: string) {
  const res = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  });

  const rawText = await res.text();
  const data = JSON.parse(rawText);

  if (!res.ok) {
    throw new Error(`Pesapal auth failed [${res.status}] on ${baseUrl}: ${data?.message || rawText}`);
  }

  const isSuccess = !data?.error && data?.token && String(data?.status ?? "200") === "200";
  if (!isSuccess) {
    throw new Error(`Pesapal auth failed on ${baseUrl}: ${data?.message || rawText}`);
  }

  return {
    token: data.token as string,
    expiryDate: data.expiryDate as string,
    baseUrl,
  };
}

async function getPesapalToken(): Promise<{ token: string; baseUrl: string }> {
  // Check cache
  if (cachedToken) {
    const expiry = new Date(cachedToken.expiryDate);
    if (expiry.getTime() - Date.now() > 60 * 1000) {
      return { token: cachedToken.token, baseUrl: cachedToken.baseUrl };
    }
  }

  const consumerKey = Deno.env.get("PESAPAL_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("PESAPAL_CONSUMER_SECRET");

  if (!consumerKey || !consumerSecret) {
    throw new Error("Pesapal credentials not configured");
  }

  const errors: string[] = [];
  for (const baseUrl of [PESAPAL_LIVE_API_URL, PESAPAL_SANDBOX_API_URL]) {
    try {
      cachedToken = await requestPesapalToken(baseUrl, consumerKey, consumerSecret);
      return { token: cachedToken.token, baseUrl: cachedToken.baseUrl };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(errors.join(" | "));
}

// Cache IPN IDs in memory per environment/url pair
const cachedIpnIds = new Map<string, string>();

async function registerIPN(token: string, callbackUrl: string, baseUrl: string): Promise<string> {
  const cacheKey = `${baseUrl}:${callbackUrl}`;
  const cachedIpnId = cachedIpnIds.get(cacheKey);
  if (cachedIpnId) return cachedIpnId;

  const res = await fetch(`${baseUrl}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url: callbackUrl, ipn_notification_type: "GET" }),
  });

  if (!res.ok) throw new Error(`IPN registration failed: ${res.status}`);
  const data = await res.json();
  if (data.error || data.status !== "200") throw new Error("IPN registration failed");

  cachedIpnIds.set(cacheKey, data.ipn_id);
  return data.ipn_id;
}

function normalizeUgandaPhoneNumber(value: string): string | null {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("2560") && digits.length === 13) return digits.slice(3);
  if (digits.startsWith("256") && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.startsWith("0") && digits.length === 10) return digits;
  if (digits.length === 9) return `0${digits}`;

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "submit-order" && req.method === "POST") {
      const body = await req.json();
      const { orderId, amount, description, callbackUrl, ipnUrl, email, phoneNumber, firstName, lastName } = body;

      const { token, baseUrl } = await getPesapalToken();
      
      // Register IPN using the backend notification URL, not the browser callback page
      const notificationUrl = typeof ipnUrl === "string" && ipnUrl ? ipnUrl : callbackUrl;
      const ipnId = await registerIPN(token, notificationUrl, baseUrl);

      const normalizedPhoneNumber = normalizeUgandaPhoneNumber(phoneNumber || "");
      if (!normalizedPhoneNumber) {
        return new Response(JSON.stringify({ error: "A valid Uganda phone number is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orderRequest: Record<string, any> = {
        id: orderId,
        currency: "UGX",
        amount,
        description: (description || "").substring(0, 100),
        redirect_mode: "PARENT_WINDOW",
        callback_url: callbackUrl,
        notification_id: ipnId,
        billing_address: {
          phone_number: normalizedPhoneNumber,
          country_code: "UG",
          first_name: firstName || "",
          middle_name: "",
          last_name: lastName || "",
          line_1: "",
          line_2: "",
          city: "",
          state: "",
          postal_code: "",
          zip_code: "",
        },
      };

      // Only include email if provided - phone_number is always required
      if (email) {
        orderRequest.billing_address.email_address = email;
      }

      const res = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderRequest),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Order submission failed [${res.status}]: ${errText}`);
      }
      const data = await res.json();
      if (data.error || data.status !== "200") throw new Error(data.message || "Order submission failed");

      return new Response(JSON.stringify({
        redirect_url: data.redirect_url,
        order_tracking_id: data.order_tracking_id,
        merchant_reference: data.merchant_reference,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "transaction-status") {
      const orderTrackingId = url.searchParams.get("orderTrackingId");
      if (!orderTrackingId) {
        return new Response(JSON.stringify({ error: "Missing orderTrackingId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { token, baseUrl } = await getPesapalToken();
      const res = await fetch(
        `${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
      const data = await res.json();

      // Log full response for debugging payment failures
      console.log("Pesapal transaction status response:", JSON.stringify(data));

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // IPN handler - Pesapal sends GET requests here
    if (action === "ipn") {
      const orderTrackingId = url.searchParams.get("OrderTrackingId");
      const orderMerchantReference = url.searchParams.get("OrderMerchantReference");
      const orderNotificationType = url.searchParams.get("OrderNotificationType");

      console.log("IPN received:", { orderTrackingId, orderMerchantReference, orderNotificationType });

      // Respond to Pesapal confirming receipt
      return new Response(JSON.stringify({
        orderNotificationType,
        orderTrackingId,
        orderMerchantReference,
        status: 200,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Pesapal edge function error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

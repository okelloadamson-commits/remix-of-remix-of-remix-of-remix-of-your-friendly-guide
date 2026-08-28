import { createFileRoute } from "@tanstack/react-router";

// Probes a Google Drive file to detect the quota-exceeded interstitial:
//   "Sorry, you can't view or download this file at this time."
// Returns { blocked: boolean }. Public endpoint, no secrets used.
export const Route = createFileRoute("/api/public/drive-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
          return Response.json({ blocked: false, error: "bad id" }, { status: 400 });
        }

        try {
          const target = `https://drive.google.com/uc?export=download&id=${id}`;
          const res = await fetch(target, {
            method: "GET",
            redirect: "follow",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            },
          });

          const ct = res.headers.get("content-type") || "";
          // Real file downloads come back as a binary stream (not text/html).
          // The quota / virus-scan interstitial always comes back as HTML.
          if (!ct.includes("text/html")) {
            return Response.json({ blocked: false });
          }

          // Only read the start of the HTML so we don't pull large pages into memory.
          const reader = res.body?.getReader();
          let text = "";
          if (reader) {
            const decoder = new TextDecoder();
            let total = 0;
            while (total < 80_000) {
              const { done, value } = await reader.read();
              if (done) break;
              text += decoder.decode(value, { stream: true });
              total += value.byteLength;
            }
            text += decoder.decode();
            try { await reader.cancel(); } catch {}
          } else {
            text = await res.text();
          }

          const blocked =
            /can't view or download this file at this time/i.test(text) ||
            /can&#39;t view or download this file at this time/i.test(text) ||
            /can&rsquo;t view or download this file at this time/i.test(text) ||
            /Too many users have viewed or downloaded this file/i.test(text) ||
            /quotaExceeded/i.test(text);

          return Response.json({ blocked });
        } catch (e) {
          // Network error — don't block, just let the iframe try.
          return Response.json({ blocked: false, error: String(e) });
        }
      },
    },
  },
});

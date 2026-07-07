export default {
  async fetch(request, env) {
    // 1. Handle CORS Preflight requests
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Authenticate all requests using Supabase Auth JWT
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized: Missing bearer token", { status: 401, headers: corsHeaders });
    }

    const token = authHeader.split(" ")[1];
    const verifyRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": env.SUPABASE_ANON_KEY
      }
    });

    if (!verifyRes.ok) {
      return new Response("Unauthorized: Invalid user session", { status: 401, headers: corsHeaders });
    }

    // ─── POST: Upload Image ──────────────────────────────────────────────────
    if (request.method === "POST") {
      try {
        const contentType = request.headers.get("Content-Type") || "image/png";
        const fileExt = contentType.split("/")[1] || "png";
        const fileName = `photos/${crypto.randomUUID()}.${fileExt}`;
        const fileData = await request.arrayBuffer();

        await env.MY_BUCKET.put(fileName, fileData, {
          httpMetadata: { contentType: contentType }
        });

        const publicUrl = `${env.PUBLIC_BUCKET_URL.replace(/\/+$/, '')}/${fileName}`;
        return new Response(JSON.stringify({ url: publicUrl }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ─── DELETE: Delete Image ────────────────────────────────────────────────
    if (request.method === "DELETE") {
      try {
        const { url } = await request.json();
        if (!url) {
          return new Response("Missing image URL to delete", { status: 400, headers: corsHeaders });
        }

        // Extract key name (e.g. photos/uuid.png) from the public URL
        const bucketUrlStr = env.PUBLIC_BUCKET_URL.replace(/\/+$/, '');
        let key = "";
        if (url.includes(bucketUrlStr)) {
          key = url.substring(url.indexOf(bucketUrlStr) + bucketUrlStr.length).replace(/^\/+/, '');
        } else {
          // If custom domain config differs, fallback parsing by finding /photos/
          const photosIndex = url.indexOf("photos/");
          if (photosIndex !== -1) {
            key = url.substring(photosIndex);
          }
        }

        if (!key || !key.startsWith("photos/")) {
          return new Response("Invalid file path or access denied", { status: 400, headers: corsHeaders });
        }

        // Perform delete on R2 Bucket
        await env.MY_BUCKET.delete(key);

        return new Response(JSON.stringify({ success: true, key }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
};

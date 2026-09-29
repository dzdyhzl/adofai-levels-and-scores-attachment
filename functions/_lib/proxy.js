const API_ORIGIN = "https://api.tuforums.com";
const ALLOWED_PATH_PREFIXES = ["/v2/database/", "/v3/players/"];
const FORWARD_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "authorization",
  "cookie"
];
const DROP_RESPONSE_HEADERS = [
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "set-cookie"
];

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (!ALLOWED_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return new Response(JSON.stringify({ error: "Path not allowed" }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": url.origin,
        "access-control-allow-methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
        "access-control-allow-headers":
          request.headers.get("access-control-request-headers") || "*",
        "access-control-allow-credentials": "true",
        "access-control-max-age": "86400"
      }
    });
  }

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init = {
    method: request.method,
    headers,
    redirect: "manual"
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const upstream = await fetch(`${API_ORIGIN}${url.pathname}${url.search}`, init);
  const responseHeaders = new Headers(upstream.headers);
  for (const name of DROP_RESPONSE_HEADERS) responseHeaders.delete(name);
  responseHeaders.set("access-control-allow-origin", url.origin);
  responseHeaders.set("access-control-allow-credentials", "true");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}

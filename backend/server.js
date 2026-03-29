import http from "http";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// Load lab data from external JSON file
const labs = JSON.parse(
    readFileSync(join(__dirname, "data", "labs.json"), "utf-8")
);

// CORS headers to allow the frontend dev server to make requests
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

const server = http.createServer((request, response) => {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
        response.writeHead(204, corsHeaders);
        response.end();
        return;
    }

    if (request.url === "/health" && request.method === "GET") {
        response.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
        response.end(JSON.stringify({ status: "ok" }));
        return;
    }

    if (request.url === "/api/labs" && request.method === "GET") {
        response.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
        response.end(JSON.stringify(labs));
        return;
    }

    response.writeHead(404, { "Content-Type": "application/json", ...corsHeaders });
    response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

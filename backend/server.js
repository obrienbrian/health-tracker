import http from "http";

const PORT = 3001;

const server = http.createServer((request, response) =>
{
    if (request.url === "/health" && request.method === "GET")
    {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ status: "ok" }));
        return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
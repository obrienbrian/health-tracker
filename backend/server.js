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

    if (request.url === "/api/labs" && request.method === "GET")
    {
        const labs = [
            {
                id: "lab-2026-01-29",
                dateCollected: "2026-01-29",
                dateReported: "2026-02-05",
                fasting: false,
                panels: [
                    {
                        name: "Metabolic Panel",
                        biomarkers: [
                            {
                                name: "Glucose",
                                value: 102,
                                unit: "mg/dL",
                                referenceMin: 70,
                                referenceMax: 99,
                                flag: "high"
                            },
                            {
                                name: "Creatinine",
                                value: 1.01,
                                unit: "mg/dL",
                                referenceMin: 0.76,
                                referenceMax: 1.27,
                                flag: "normal"
                            }
                        ]
                    },
                    {
                        name: "Lipid Panel",
                        biomarkers: [
                            {
                                name: "Total Cholesterol",
                                value: 180,
                                unit: "mg/dL",
                                referenceMin: 100,
                                referenceMax: 199,
                                flag: "normal"
                            },
                            {
                                name: "LDL",
                                value: 118,
                                unit: "mg/dL",
                                referenceMin: 0,
                                referenceMax: 99,
                                flag: "high"
                            }
                        ]
                    }
                ]
            },
            {
                id: "lab-2025-01-06",
                dateCollected: "2025-01-06",
                dateReported: "2025-01-10",
                fasting: true,
                panels: [
                    {
                        name: "Metabolic Panel",
                        biomarkers: [
                            {
                                name: "Glucose",
                                value: 94,
                                unit: "mg/dL",
                                referenceMin: 70,
                                referenceMax: 99,
                                flag: "normal"
                            }
                        ]
                    }
                ]
            }
        ];

        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify(labs));
        return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
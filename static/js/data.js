// Data module: fleets and aircraft status
const fleets = {
  "Fleet A": { type: "fleet", flights: ["AA101", "AA102", "AA103", "AA104"] },
  "Fleet B": { type: "fleet", flights: ["BA201", "BA202", "BA203"] },
};

// AIRCRAFT STATUS DATA - simplified with issue log
const aircraftStatus = {
  "AA101": { status: "Active", issue: { hasIssue: false, message: "No ad delivery issues" } },
  "AA102": { status: "On Ground", issue: { hasIssue: false, message: "No ad delivery issues" } },
  "AA103": { status: "Maintenance", issue: { hasIssue: true, message: "Maintenance prevents ad display on this flight" } },
  "AA104": { status: "Active", issue: { hasIssue: false, message: "No ad delivery issues" } },
  "BA201": { status: "Active", issue: { hasIssue: false, message: "No ad delivery issues" } },
  "BA202": { status: "Active", issue: { hasIssue: false, message: "No ad delivery issues" } },
  "BA203": { status: "On Ground", issue: { hasIssue: true, message: "Regulatory block for this route - ads disabled" } },
};

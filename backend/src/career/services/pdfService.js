const puppeteer = require("puppeteer");

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateRange(startDate = "", endDate = "") {
  return `${startDate || "N/A"} - ${endDate || "Present"}`;
}

function renderList(items = []) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderCvHtml(cv) {
  const personal = cv?.data?.personal || {};
  const summary = cv?.data?.summary || "";
  const education = cv?.data?.education || [];
  const experience = cv?.data?.experience || [];
  const projects = cv?.data?.projects || [];
  const skills = cv?.data?.skills || [];
  const links = cv?.data?.links || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(personal.fullName || "CV")}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 32px; color: #111827; background: #ffffff; line-height: 1.6; font-size: 14px; }
    .container { max-width: 900px; margin: 0 auto; }
    .header { border-bottom: 2px solid #64748b; padding-bottom: 16px; margin-bottom: 24px; text-align: center; }
    .name { font-size: 30px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a; }
    .contact { display: flex; justify-content: center; flex-wrap: wrap; gap: 14px; color: #475569; font-size: 13px; }
    .contact span { display: inline-flex; align-items: center; gap: 6px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 15px; font-weight: 700; color: #334155; margin: 0 0 12px 0; border-top: 2px solid #64748b; padding-top: 10px; text-transform: uppercase; }
    .item { margin-bottom: 14px; }
    .item-header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .item-title { font-weight: 700; color: #0f172a; }
    .item-subtitle { color: #64748b; font-weight: 600; }
    .item-date { color: #64748b; white-space: nowrap; font-size: 13px; }
    .muted { color: #475569; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 12px; color: #334155; background: #f8fafc; }
    ul { margin: 8px 0 0 18px; padding: 0; }
    li { margin-bottom: 4px; }
    p { margin: 8px 0 0 0; color: #334155; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="name">${escapeHtml(personal.fullName || "Unnamed Candidate")}</h1>
      <div class="contact">
        ${personal.email ? `<span>&#9993; ${escapeHtml(personal.email)}</span>` : ""}
        ${personal.phone ? `<span>&#9742; ${escapeHtml(personal.phone)}</span>` : ""}
        ${personal.location ? `<span>&#128205; ${escapeHtml(personal.location)}</span>` : ""}
        ${personal.linkedin ? `<span>LinkedIn: ${escapeHtml(personal.linkedin)}</span>` : ""}
        ${personal.github ? `<span>GitHub: ${escapeHtml(personal.github)}</span>` : ""}
        ${personal.portfolio ? `<span>Portfolio: ${escapeHtml(personal.portfolio)}</span>` : ""}
      </div>
    </div>

    ${summary ? `<div class="section"><h2 class="section-title">Professional Summary</h2><p>${escapeHtml(summary)}</p></div>` : ""}

    ${education.length ? `<div class="section"><h2 class="section-title">Education</h2>${education.map((item) => `
      <div class="item">
        <div class="item-header">
          <div>
            <div class="item-title">${escapeHtml(item.degree || "")}</div>
            <div class="item-subtitle">${escapeHtml(item.institution || "")}</div>
            ${item.fieldOfStudy ? `<div class="muted">${escapeHtml(item.fieldOfStudy)}</div>` : ""}
          </div>
          <div class="item-date">${escapeHtml(formatDateRange(item.startDate, item.endDate))}</div>
        </div>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
      </div>`).join("")}</div>` : ""}

    ${experience.length ? `<div class="section"><h2 class="section-title">Experience</h2>${experience.map((item) => `
      <div class="item">
        <div class="item-header">
          <div>
            <div class="item-title">${escapeHtml(item.jobTitle || "")}</div>
            <div class="item-subtitle">${escapeHtml(item.company || "")}</div>
          </div>
          <div class="item-date">${escapeHtml(formatDateRange(item.startDate, item.endDate))}</div>
        </div>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
      </div>`).join("")}</div>` : ""}

    ${projects.length ? `<div class="section"><h2 class="section-title">Projects</h2>${projects.map((item) => `
      <div class="item">
        <div class="item-header">
          <div>
            <div class="item-title">${escapeHtml(item.title || "")}</div>
            ${item.link ? `<div class="muted">Link: ${escapeHtml(item.link)}</div>` : ""}
          </div>
        </div>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
        ${Array.isArray(item.technologies) && item.technologies.length ? `<div class="chips" style="margin-top:8px;">${item.technologies.map((tech) => `<span class="chip">${escapeHtml(tech)}</span>`).join("")}</div>` : ""}
      </div>`).join("")}</div>` : ""}

    ${skills.length ? `<div class="section"><h2 class="section-title">Skills</h2><div class="chips">${skills.map((skill) => `<span class="chip">${escapeHtml(skill)}</span>`).join("")}</div></div>` : ""}

    ${links.length ? `<div class="section"><h2 class="section-title">Links</h2>${renderList(links.map((link) => link.label && link.url ? `${link.label}: ${link.url}` : link.url || link.label || ""))}</div>` : ""}
  </div>
</body>
</html>`;
}

async function generateCvPdfBuffer(cv) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    const html = renderCvHtml(cv);
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", right: "12mm", bottom: "16mm", left: "12mm" },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = { generateCvPdfBuffer };

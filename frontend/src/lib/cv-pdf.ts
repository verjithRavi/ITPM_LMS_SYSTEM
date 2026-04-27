import jsPDF from "jspdf";

export type CVPdfInput = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  github: string;
  summary: string;
  education: { institution: string; degree: string; field: string; start: string; end: string }[];
  experience: { company: string; position: string; start: string; end: string; description: string }[];
  projects: { name: string; link: string; description: string; technologies: string | string[] }[];
  skills: string[];
};

function fmtDate(value: string): string {
  if (!value) return "";
  const [year, month] = value.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month, 10) - 1] ?? ""} ${year}`;
}

function dateRange(start: string, end: string): string {
  if (!start && !end) return "";
  if (start && !end) return `${fmtDate(start)} - Present`;
  if (!start && end) return fmtDate(end);
  return `${fmtDate(start)} - ${fmtDate(end)}`;
}

export function downloadCVPdf(data: CVPdfInput): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const ML = 18;   // left margin
  const MR = 18;   // right margin
  const MT = 18;   // top margin
  const MB = 15;   // bottom margin
  const CW = PAGE_W - ML - MR;

  let y = MT;

  const newPage = () => {
    doc.addPage();
    y = MT;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MB) newPage();
  };

  // ── Name ──────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(data.fullName || "Your Name", ML, y);
  y += 8;

  // ── Contact line ──────────────────────────────────────────────────────
  const contacts = [data.email, data.phone, data.location, data.linkedIn, data.github].filter(Boolean);
  if (contacts.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const contactLine = contacts.join("   |   ");
    const wrapped = doc.splitTextToSize(contactLine, CW) as string[];
    doc.text(wrapped, ML, y);
    y += wrapped.length * 4 + 2;
  }

  // ── Divider ───────────────────────────────────────────────────────────
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(ML, y, PAGE_W - MR, y);
  y += 6;

  // ── Section helper ────────────────────────────────────────────────────
  const drawSection = (title: string) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(title.toUpperCase(), ML, y);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(ML, y + 1.5, PAGE_W - MR, y + 1.5);
    y += 7;
  };

  // ── Right-aligned date helper ─────────────────────────────────────────
  const drawDateRight = (text: string, atY: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const w = doc.getTextWidth(text);
    doc.text(text, PAGE_W - MR - w, atY);
  };

  // ── Multiline body text helper ────────────────────────────────────────
  const drawBody = (text: string, indent = 0, maxW = CW) => {
    if (!text.trim()) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    // Respect newlines from the textarea
    const paragraphs = text.split("\n");
    for (const para of paragraphs) {
      if (!para.trim()) { y += 3; continue; }
      const lines = doc.splitTextToSize(para, maxW - indent) as string[];
      ensureSpace(lines.length * 5);
      doc.text(lines, ML + indent, y);
      y += lines.length * 5;
    }
  };

  // ── SUMMARY ───────────────────────────────────────────────────────────
  if (data.summary) {
    drawSection("Summary");
    drawBody(data.summary);
    y += 5;
  }

  // ── EDUCATION ─────────────────────────────────────────────────────────
  const edu = data.education.filter((e) => e.institution || e.degree);
  if (edu.length > 0) {
    drawSection("Education");
    for (const item of edu) {
      ensureSpace(16);
      const dr = dateRange(item.start, item.end);
      // Degree
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      // Clamp label width so it doesn't overlap the date
      const labelMaxW = dr ? CW - doc.getTextWidth(dr) - 8 : CW;
      const degreeLines = doc.splitTextToSize(item.degree || "", labelMaxW) as string[];
      doc.text(degreeLines, ML, y);
      if (dr) drawDateRight(dr, y);
      y += degreeLines.length * 5 + 1;
      // Institution + field
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const inst = `${item.institution}${item.field ? `  ·  ${item.field}` : ""}`;
      doc.text(inst, ML, y);
      y += 8;
    }
  }

  // ── EXPERIENCE ────────────────────────────────────────────────────────
  const exp = data.experience.filter((e) => e.company || e.position);
  if (exp.length > 0) {
    drawSection("Experience");
    for (const item of exp) {
      ensureSpace(18);
      const dr = dateRange(item.start, item.end);
      // Position
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      const labelMaxW = dr ? CW - doc.getTextWidth(dr) - 8 : CW;
      const posLines = doc.splitTextToSize(item.position || "", labelMaxW) as string[];
      doc.text(posLines, ML, y);
      if (dr) drawDateRight(dr, y);
      y += posLines.length * 5 + 1;
      // Company
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(item.company || "", ML, y);
      y += 5;
      // Description
      if (item.description) {
        drawBody(item.description);
      }
      y += 5;
    }
  }

  // ── PROJECTS ──────────────────────────────────────────────────────────
  const projects = data.projects.filter((p) => p.name);
  if (projects.length > 0) {
    drawSection("Projects");
    for (const item of projects) {
      ensureSpace(18);
      // Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(item.name, ML, y);
      // Link (right)
      if (item.link) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const lw = doc.getTextWidth(item.link);
        doc.text(item.link, PAGE_W - MR - lw, y);
      }
      y += 5;
      // Description
      if (item.description) {
        drawBody(item.description);
      }
      // Technologies
      if (item.technologies) {
        ensureSpace(6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const techNorm = Array.isArray(item.technologies) ? item.technologies.join(", ") : String(item.technologies);
        const techLine = `Technologies: ${techNorm}`;
        const techLines = doc.splitTextToSize(techLine, CW) as string[];
        doc.text(techLines, ML, y);
        y += techLines.length * 4 + 1;
      }
      y += 5;
    }
  }

  // ── SKILLS ────────────────────────────────────────────────────────────
  if (data.skills.length > 0) {
    drawSection("Skills");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const skillText = data.skills.join("   ·   ");
    const skillLines = doc.splitTextToSize(skillText, CW) as string[];
    doc.text(skillLines, ML, y);
    y += skillLines.length * 5;
  }

  const safeName = (data.fullName || "cv")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  doc.save(`${safeName}-cv.pdf`);
}

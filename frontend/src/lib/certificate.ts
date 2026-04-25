type CertificatePayload = {
  studentName: string;
  moduleCode: string;
  moduleName: string;
  faculty: string;
  year: number;
  semester: number;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  passStatus: string;
  publishedAt?: string | null;
};

type TextConfig = {
  x: number;
  y: number;
  size: number;
  text: string;
  color?: [number, number, number];
  align?: "left" | "center";
};

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatPdfNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function estimateTextWidth(text: string, size: number) {
  return text.length * size * 0.52;
}

function drawText({ x, y, size, text, color = [31, 41, 55], align = "left" }: TextConfig) {
  const safeText = escapePdfText(text);
  const adjustedX = align === "center" ? x - estimateTextWidth(text, size) / 2 : x;
  return [
    `BT`,
    `${formatPdfNumber(color[0] / 255)} ${formatPdfNumber(color[1] / 255)} ${formatPdfNumber(color[2] / 255)} rg`,
    `/F1 ${formatPdfNumber(size)} Tf`,
    `1 0 0 1 ${formatPdfNumber(adjustedX)} ${formatPdfNumber(y)} Tm`,
    `(${safeText}) Tj`,
    `ET`,
  ].join("\n");
}

function drawRectangle(x: number, y: number, width: number, height: number, stroke: [number, number, number], lineWidth = 1.5) {
  return [
    `${formatPdfNumber(lineWidth)} w`,
    `${formatPdfNumber(stroke[0] / 255)} ${formatPdfNumber(stroke[1] / 255)} ${formatPdfNumber(stroke[2] / 255)} RG`,
    `${formatPdfNumber(x)} ${formatPdfNumber(y)} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re S`,
  ].join("\n");
}

function drawFilledRectangle(x: number, y: number, width: number, height: number, fill: [number, number, number]) {
  return [
    `${formatPdfNumber(fill[0] / 255)} ${formatPdfNumber(fill[1] / 255)} ${formatPdfNumber(fill[2] / 255)} rg`,
    `${formatPdfNumber(x)} ${formatPdfNumber(y)} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re f`,
  ].join("\n");
}

function drawLine(x1: number, y1: number, x2: number, y2: number, stroke: [number, number, number], lineWidth = 1) {
  return [
    `${formatPdfNumber(lineWidth)} w`,
    `${formatPdfNumber(stroke[0] / 255)} ${formatPdfNumber(stroke[1] / 255)} ${formatPdfNumber(stroke[2] / 255)} RG`,
    `${formatPdfNumber(x1)} ${formatPdfNumber(y1)} m`,
    `${formatPdfNumber(x2)} ${formatPdfNumber(y2)} l S`,
  ].join("\n");
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      return;
    }
    current = next;
  });

  if (current) lines.push(current);
  return lines;
}

function buildPdf(content: string) {
  const stream = `${content}\n`;
  const objects = [
    `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`,
    `2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj`,
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatPdfNumber(PAGE_WIDTH)} ${formatPdfNumber(PAGE_HEIGHT)}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj`,
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}endstream\nendobj`,
    `5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`,
  ];

  let pdf = `%PDF-1.4\n`;
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let index = 0; index < pdf.length; index += 1) {
    bytes[index] = pdf.charCodeAt(index) & 0xff;
  }
  return bytes;
}

export function downloadCertificatePdf(payload: CertificatePayload) {
  const issueDate = payload.publishedAt ? new Date(payload.publishedAt).toLocaleDateString() : new Date().toLocaleDateString();
  const moduleTitle = `${payload.moduleCode} - ${payload.moduleName}`;
  const subtitleLines = wrapText(moduleTitle, 42);
  const commands = [
    drawFilledRectangle(0, 0, PAGE_WIDTH, PAGE_HEIGHT, [248, 250, 252]),
    drawFilledRectangle(24, 24, PAGE_WIDTH - 48, PAGE_HEIGHT - 48, [255, 255, 255]),
    drawRectangle(24, 24, PAGE_WIDTH - 48, PAGE_HEIGHT - 48, [15, 118, 110], 2.2),
    drawRectangle(38, 38, PAGE_WIDTH - 76, PAGE_HEIGHT - 76, [251, 191, 36], 1.2),
    drawFilledRectangle(70, PAGE_HEIGHT - 110, PAGE_WIDTH - 140, 20, [225, 244, 255]),
    drawText({ x: PAGE_WIDTH / 2, y: PAGE_HEIGHT - 78, size: 14, text: "SMART ACADEMIC LMS", color: [14, 116, 144], align: "center" }),
    drawText({ x: PAGE_WIDTH / 2, y: PAGE_HEIGHT - 150, size: 30, text: "Certificate Of Academic Performance", color: [17, 24, 39], align: "center" }),
    drawLine(250, PAGE_HEIGHT - 165, PAGE_WIDTH - 250, PAGE_HEIGHT - 165, [251, 191, 36], 2),
    drawText({ x: PAGE_WIDTH / 2, y: PAGE_HEIGHT - 205, size: 14, text: "This certifies that", color: [71, 85, 105], align: "center" }),
    drawText({ x: PAGE_WIDTH / 2, y: PAGE_HEIGHT - 255, size: 28, text: payload.studentName.toUpperCase(), color: [15, 23, 42], align: "center" }),
    drawLine(180, PAGE_HEIGHT - 264, PAGE_WIDTH - 180, PAGE_HEIGHT - 264, [14, 165, 233], 1.2),
    drawText({ x: PAGE_WIDTH / 2, y: PAGE_HEIGHT - 305, size: 14, text: "has achieved the following official result for the module", color: [71, 85, 105], align: "center" }),
  ];

  subtitleLines.forEach((line, index) => {
    commands.push(drawText({ x: PAGE_WIDTH / 2, y: PAGE_HEIGHT - 345 - index * 22, size: 19, text: line, color: [5, 150, 105], align: "center" }));
  });

  commands.push(
    drawFilledRectangle(110, 122, PAGE_WIDTH - 220, 92, [240, 249, 255]),
    drawRectangle(110, 122, PAGE_WIDTH - 220, 92, [125, 211, 252], 1),
    drawText({ x: 145, y: 186, size: 13, text: `Faculty: ${payload.faculty}`, color: [30, 41, 59] }),
    drawText({ x: 145, y: 160, size: 13, text: `Academic Period: Year ${payload.year} | Semester ${payload.semester}`, color: [30, 41, 59] }),
    drawText({ x: 145, y: 134, size: 13, text: `Issued On: ${issueDate}`, color: [30, 41, 59] }),
    drawText({ x: 585, y: 186, size: 13, text: `Final Mark: ${payload.obtainedMarks} / ${payload.totalMarks}`, color: [30, 41, 59] }),
    drawText({ x: 585, y: 160, size: 13, text: `Percentage: ${payload.percentage}%`, color: [30, 41, 59] }),
    drawText({ x: 585, y: 134, size: 13, text: `Result: ${payload.grade} | ${payload.passStatus}`, color: [30, 41, 59] }),
    drawText({ x: 145, y: 76, size: 12, text: "Academic Affairs", color: [15, 23, 42] }),
    drawLine(110, 92, 270, 92, [15, 23, 42], 1),
    drawText({ x: 585, y: 76, size: 12, text: "Official Digital Certificate", color: [15, 23, 42] }),
    drawLine(500, 92, 690, 92, [15, 23, 42], 1),
  );

  const pdfBytes = buildPdf(commands.join("\n"));
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeModule = `${payload.moduleCode}-${payload.moduleName}`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  const safeStudent = payload.studentName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  link.href = url;
  link.download = `${safeStudent}-${safeModule}-certificate.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

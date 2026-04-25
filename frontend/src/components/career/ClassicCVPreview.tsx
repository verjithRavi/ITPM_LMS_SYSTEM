"use client";

import type { CVState } from "./ClassicCVForm";

type Props = { cvData: CVState; template?: string };

function formatDate(value: string) {
  if (!value) return "";
  const [year, month] = value.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[parseInt(month, 10) - 1] || ""} ${year}`;
}

export default function ClassicCVPreview({ cvData, template = "classic" }: Props) {
  const isModern = template === "modern";
  const isMinimal = template === "minimal";
  const isProfessional = template === "professional";

  const accentColor = isModern ? "#0891b2" : isMinimal ? "#1e293b" : isProfessional ? "#059669" : "#334155";
  const headerBg = isModern ? "#0891b2" : isProfessional ? "#059669" : "transparent";
  const headerTextColor = isModern || isProfessional ? "#ffffff" : "#0f172a";
  const borderColor = isMinimal ? "#e2e8f0" : accentColor;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ fontFamily: "Georgia, serif", fontSize: "12px", lineHeight: "1.5" }}>
      <div style={{ backgroundColor: headerBg, padding: "24px", borderBottom: `2px solid ${borderColor}` }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: headerTextColor, margin: 0 }}>{cvData.fullName || "Your Name"}</h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px", color: isModern || isProfessional ? "rgba(255,255,255,0.85)" : "#475569", fontSize: "11px" }}>
          {cvData.email && <span>{cvData.email}</span>}
          {cvData.phone && <span>{cvData.phone}</span>}
          {cvData.location && <span>{cvData.location}</span>}
          {cvData.linkedIn && <span>{cvData.linkedIn}</span>}
          {cvData.github && <span>{cvData.github}</span>}
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {cvData.summary && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: accentColor, borderBottom: `1px solid ${borderColor}`, paddingBottom: "4px", marginBottom: "8px" }}>Summary</h2>
            <p style={{ color: "#334155", margin: 0 }}>{cvData.summary}</p>
          </div>
        )}

        {cvData.education.filter((e) => e.institution || e.degree).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: accentColor, borderBottom: `1px solid ${borderColor}`, paddingBottom: "4px", marginBottom: "8px" }}>Education</h2>
            {cvData.education.filter((e) => e.institution || e.degree).map((edu) => (
              <div key={edu.id} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{edu.degree}</span>
                  <span style={{ color: "#64748b", fontSize: "11px" }}>{edu.start && edu.end ? `${formatDate(edu.start)} – ${formatDate(edu.end)}` : ""}</span>
                </div>
                <div style={{ color: "#475569" }}>{edu.institution}{edu.field ? ` · ${edu.field}` : ""}</div>
              </div>
            ))}
          </div>
        )}

        {cvData.experience.filter((e) => e.company || e.position).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: accentColor, borderBottom: `1px solid ${borderColor}`, paddingBottom: "4px", marginBottom: "8px" }}>Experience</h2>
            {cvData.experience.filter((e) => e.company || e.position).map((exp) => (
              <div key={exp.id} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{exp.position}</span>
                  <span style={{ color: "#64748b", fontSize: "11px" }}>{exp.start && exp.end ? `${formatDate(exp.start)} – ${formatDate(exp.end)}` : ""}</span>
                </div>
                <div style={{ color: "#475569" }}>{exp.company}</div>
                {exp.description && <p style={{ color: "#334155", marginTop: "4px", margin: "4px 0 0" }}>{exp.description}</p>}
              </div>
            ))}
          </div>
        )}

        {cvData.projects.filter((p) => p.name).length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: accentColor, borderBottom: `1px solid ${borderColor}`, paddingBottom: "4px", marginBottom: "8px" }}>Projects</h2>
            {cvData.projects.filter((p) => p.name).map((proj) => (
              <div key={proj.id} style={{ marginBottom: "10px" }}>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{proj.name}</span>
                {proj.link && <span style={{ color: "#64748b", fontSize: "11px" }}> · {proj.link}</span>}
                {proj.description && <p style={{ color: "#334155", margin: "4px 0 0" }}>{proj.description}</p>}
                {proj.technologies && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                    {proj.technologies.split(",").map((tech, i) => (
                      <span key={i} style={{ padding: "2px 8px", background: "#f1f5f9", borderRadius: "999px", fontSize: "10px", color: "#334155" }}>{tech.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {cvData.skills.length > 0 && (
          <div>
            <h2 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: accentColor, borderBottom: `1px solid ${borderColor}`, paddingBottom: "4px", marginBottom: "8px" }}>Skills</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {cvData.skills.map((skill, i) => (
                <span key={i} style={{ padding: "3px 10px", background: "#f1f5f9", border: `1px solid ${borderColor}`, borderRadius: "999px", fontSize: "11px", color: "#334155" }}>{skill}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

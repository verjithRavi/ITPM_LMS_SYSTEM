"use client";

import type { CVState } from "./ClassicCVForm";

type Props = { cvData: CVState; template?: string };

function formatDate(value: string) {
  if (!value) return "";
  const [year, month] = value.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[parseInt(month, 10) - 1] || ""} ${year}`;
}

function dateRange(start: string, end: string): string {
  if (!start && !end) return "";
  if (start && !end) return `${formatDate(start)} – Present`;
  if (!start && end) return formatDate(end);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export default function ClassicCVPreview({ cvData, template = "classic" }: Props) {
  const isModern = template === "modern";
  const isMinimal = template === "minimal";
  const isProfessional = template === "professional";

  const accentColor = isModern ? "#0891b2" : isMinimal ? "#1e293b" : isProfessional ? "#059669" : "#334155";
  const headerBg = isModern ? "#0891b2" : isProfessional ? "#059669" : "transparent";
  const headerTextColor = isModern || isProfessional ? "#ffffff" : "#0f172a";
  const borderColor = isMinimal ? "#e2e8f0" : accentColor;

  const sectionHeader: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: accentColor,
    borderBottom: `1px solid ${borderColor}`,
    paddingBottom: "4px",
    marginBottom: "10px",
  };

  const rowBetween: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "4px",
  };

  const dateStyle: React.CSSProperties = {
    color: "#64748b",
    fontSize: "10px",
    whiteSpace: "nowrap",
  };

  const descStyle: React.CSSProperties = {
    color: "#334155",
    marginTop: "4px",
    margin: "4px 0 0",
    whiteSpace: "pre-line",
    lineHeight: "1.6",
  };

  const filteredEducation = cvData.education.filter((e) => e.institution || e.degree);
  const filteredExperience = cvData.experience.filter((e) => e.company || e.position);
  const filteredProjects = cvData.projects.filter((p) => p.name);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      style={{ fontFamily: "Georgia, serif", fontSize: "12px", lineHeight: "1.5" }}
    >
      {/* Header */}
      <div style={{ backgroundColor: headerBg, padding: "24px", borderBottom: `2px solid ${borderColor}` }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: headerTextColor, margin: 0 }}>
          {cvData.fullName || "Your Name"}
        </h1>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginTop: "8px",
            color: isModern || isProfessional ? "rgba(255,255,255,0.85)" : "#475569",
            fontSize: "11px",
          }}
        >
          {cvData.email && <span>{cvData.email}</span>}
          {cvData.phone && <span>{cvData.phone}</span>}
          {cvData.location && <span>{cvData.location}</span>}
          {cvData.linkedIn && <span>{cvData.linkedIn}</span>}
          {cvData.github && <span>{cvData.github}</span>}
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {/* Summary */}
        {cvData.summary && (
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionHeader}>Summary</h2>
            <p style={{ color: "#334155", margin: 0, whiteSpace: "pre-line", lineHeight: "1.6" }}>
              {cvData.summary}
            </p>
          </div>
        )}

        {/* Education */}
        {filteredEducation.length > 0 && (
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionHeader}>Education</h2>
            {filteredEducation.map((edu) => {
              const dr = dateRange(edu.start, edu.end);
              return (
                <div key={edu.id} style={{ marginBottom: "12px" }}>
                  <div style={rowBetween}>
                    <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "12px" }}>{edu.degree}</span>
                    {dr && <span style={dateStyle}>{dr}</span>}
                  </div>
                  <div style={{ color: "#475569", marginTop: "2px" }}>
                    {edu.institution}
                    {edu.field ? ` · ${edu.field}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Experience */}
        {filteredExperience.length > 0 && (
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionHeader}>Experience</h2>
            {filteredExperience.map((exp) => {
              const dr = dateRange(exp.start, exp.end);
              return (
                <div key={exp.id} style={{ marginBottom: "14px" }}>
                  <div style={rowBetween}>
                    <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "12px" }}>{exp.position}</span>
                    {dr && <span style={dateStyle}>{dr}</span>}
                  </div>
                  <div style={{ color: "#475569", marginTop: "2px" }}>{exp.company}</div>
                  {exp.description && <p style={descStyle}>{exp.description}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Projects */}
        {filteredProjects.length > 0 && (
          <div style={{ marginBottom: "18px" }}>
            <h2 style={sectionHeader}>Projects</h2>
            {filteredProjects.map((proj) => (
              <div key={proj.id} style={{ marginBottom: "14px" }}>
                <div style={rowBetween}>
                  <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "12px" }}>{proj.name}</span>
                  {proj.link && (
                    <span style={{ color: "#64748b", fontSize: "10px", wordBreak: "break-all" }}>
                      {proj.link}
                    </span>
                  )}
                </div>
                {proj.description && <p style={descStyle}>{proj.description}</p>}
                {proj.technologies && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                    {(Array.isArray(proj.technologies) ? proj.technologies : String(proj.technologies).split(",")).map((tech, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "2px 8px",
                          background: "#f1f5f9",
                          borderRadius: "999px",
                          fontSize: "10px",
                          color: "#334155",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {tech.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {cvData.skills.length > 0 && (
          <div>
            <h2 style={sectionHeader}>Skills</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {cvData.skills.map((skill, i) => (
                <span
                  key={i}
                  style={{
                    padding: "3px 10px",
                    background: "#f1f5f9",
                    border: `1px solid ${borderColor}`,
                    borderRadius: "999px",
                    fontSize: "11px",
                    color: "#334155",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

require("dotenv").config({ path: require("path").join(__dirname, "../../../.env") });
const mongoose = require("mongoose");
const CvTemplate = require("../models/CvTemplate");
const CareerRole = require("../models/CareerRole");
const CareerRoadmap = require("../models/CareerRoadmap");
const JobRole = require("../models/JobRole");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for seeding career data...");

  await CvTemplate.deleteMany({});
  await CareerRole.deleteMany({});
  await CareerRoadmap.deleteMany({});
  await JobRole.deleteMany({});

  const templates = await CvTemplate.insertMany([
    { name: "Classic", isActive: true },
    { name: "Modern", isActive: true },
    { name: "Minimal", isActive: true },
    { name: "Professional", isActive: true },
  ]);
  console.log(`Inserted ${templates.length} CV templates`);

  const [frontendRole, backendRole, fullstackRole] = await CareerRole.insertMany([
    { title: "Frontend Developer", description: "Build beautiful and responsive user interfaces." },
    { title: "Backend Developer", description: "Design and maintain server-side application logic." },
    { title: "Full Stack Developer", description: "Work across the entire web application stack." },
  ]);
  console.log("Inserted 3 career roles");

  await CareerRoadmap.insertMany([
    {
      careerRoleId: frontendRole._id,
      steps: [
        { title: "Learn HTML, CSS & JavaScript", skills: ["HTML", "CSS", "JavaScript"], certifications: [], projects: [], resources: ["MDN Web Docs"] },
        { title: "Master a Frontend Framework", skills: ["React", "Vue", "Angular"], certifications: ["Meta Front-End Developer Certificate"], projects: ["Portfolio Website"], resources: ["React Official Docs"] },
        { title: "Build Real Projects", skills: ["TypeScript", "Tailwind CSS"], certifications: [], projects: ["E-commerce UI", "Dashboard App"], resources: ["GitHub"] },
      ],
    },
    {
      careerRoleId: backendRole._id,
      steps: [
        { title: "Learn a Backend Language", skills: ["Node.js", "Python", "Java"], certifications: [], projects: [], resources: ["Node.js Docs"] },
        { title: "Database Management", skills: ["MongoDB", "PostgreSQL", "MySQL"], certifications: ["MongoDB University Certification"], projects: ["REST API"], resources: ["MongoDB Docs"] },
        { title: "API Design & Security", skills: ["REST", "JWT", "Authentication"], certifications: [], projects: ["Auth API", "CRUD App"], resources: ["OWASP Guide"] },
      ],
    },
    {
      careerRoleId: fullstackRole._id,
      steps: [
        { title: "Frontend Fundamentals", skills: ["HTML", "CSS", "JavaScript", "React"], certifications: [], projects: [], resources: ["The Odin Project"] },
        { title: "Backend Basics", skills: ["Node.js", "Express", "MongoDB"], certifications: [], projects: ["Full-Stack App"], resources: ["freeCodeCamp"] },
        { title: "Deployment & DevOps", skills: ["Docker", "CI/CD", "Cloud Hosting"], certifications: ["AWS Cloud Practitioner"], projects: ["Deployed App"], resources: ["AWS Docs"] },
      ],
    },
  ]);
  console.log("Inserted 3 career roadmaps");

  await JobRole.insertMany([
    {
      title: "Frontend Developer",
      linkedCareerRoleId: frontendRole._id,
      requiredSkills: [
        { name: "React", minLevel: "intermediate" },
        { name: "JavaScript", minLevel: "intermediate" },
        { name: "CSS", minLevel: "beginner" },
        { name: "TypeScript", minLevel: "beginner" },
      ],
      keywords: ["React", "JavaScript", "CSS", "HTML", "TypeScript", "Tailwind", "UI", "Frontend"],
    },
    {
      title: "Backend Developer",
      linkedCareerRoleId: backendRole._id,
      requiredSkills: [
        { name: "Node.js", minLevel: "intermediate" },
        { name: "MongoDB", minLevel: "beginner" },
        { name: "REST API", minLevel: "intermediate" },
        { name: "JavaScript", minLevel: "intermediate" },
      ],
      keywords: ["Node.js", "Express", "MongoDB", "REST", "API", "Backend", "Database", "JavaScript"],
    },
    {
      title: "Full Stack Developer",
      linkedCareerRoleId: fullstackRole._id,
      requiredSkills: [
        { name: "React", minLevel: "intermediate" },
        { name: "Node.js", minLevel: "intermediate" },
        { name: "MongoDB", minLevel: "beginner" },
        { name: "JavaScript", minLevel: "advanced" },
      ],
      keywords: ["React", "Node.js", "MongoDB", "Full Stack", "JavaScript", "Express", "REST", "API"],
    },
  ]);
  console.log("Inserted 3 job roles");

  console.log("Career data seeding completed successfully!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

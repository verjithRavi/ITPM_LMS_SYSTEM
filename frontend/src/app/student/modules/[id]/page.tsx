import StudentModuleAssessmentPage from "@/components/student/StudentModuleAssessmentPage";

export default async function StudentModuleWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentModuleAssessmentPage moduleId={id} mode="assignments" embeddedTabs />;
}

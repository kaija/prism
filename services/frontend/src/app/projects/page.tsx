import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjectsForUser } from "@/services/project-service";
import { CreateProjectForm } from "./create-project-form";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const projects = await getProjectsForUser(session.user.id);

  return (
    <div className="projects-page">
      <div className="projects-header">
        <div>
          <h1 className="projects-title">Projects</h1>
          <p className="projects-subtitle">Select a project or create a new one to get started.</p>
        </div>
      </div>

      <div className="projects-create-card">
        <CreateProjectForm />
      </div>

      {projects.length === 0 ? (
        <div className="projects-empty">
          <span style={{ fontSize: 40, marginBottom: 12 }}>📊</span>
          <p>No projects yet. Create one above to get started.</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <a
              key={project.id}
              href={`/projects/${project.id}/dashboard`}
              className="project-card"
            >
              <div className="project-card-icon">◈</div>
              <div>
                <div className="project-card-name">{project.name}</div>
                <div className="project-card-date">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <style>{`
        .projects-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 24px;
          font-family: var(--font-family);
        }
        .projects-header {
          margin-bottom: 32px;
        }
        .projects-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-default);
          margin: 0 0 4px;
        }
        .projects-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin: 0;
        }
        .projects-create-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 20px 24px;
          margin-bottom: 28px;
          box-shadow: var(--shadow-card);
        }
        .projects-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
          font-size: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .project-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-card);
          text-decoration: none;
          color: inherit;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .project-card:hover {
          transform: translateY(-2px);
        }
        .project-card-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: var(--primary-transparent);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .project-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-default);
        }
        .project-card-date {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}

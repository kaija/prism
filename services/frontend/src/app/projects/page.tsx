import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjectsForUser } from "@/services/project-service";
import { CreateProjectForm } from "./create-project-form";
import { isSystemAdmin } from "@/lib/system-admin";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const projects = await getProjectsForUser(session.user.id);
  const isSuperAdmin = session.user.email ? isSystemAdmin(session.user.email) : false;

  return (
    <div className="projects-page">
      <div className="projects-header">
        <div>
          <h1 className="projects-title">Projects</h1>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="projects-create-card">
          <CreateProjectForm />
        </div>
      )}

      {projects.length === 0 && !isSuperAdmin ? (
        <div className="projects-empty-center">
          <div className="projects-no-create-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>Only system administrators can create new projects.</p>
            <p className="projects-no-create-hint">Ask a project owner to invite you, or contact your admin to request a new project.</p>
            <a href="/api/auth/signout" className="projects-signout-link">Sign out and use a different account</a>
          </div>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <a
              key={project.id}
              href={`/projects/${project.id}/dashboard`}
              className="project-card"
            >
              <div className="project-card-icon">
                <svg width="20" height="20" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="50,8 8,82 92,82" />
                  <polygon points="50,24 20,76 80,76" />
                  <polygon points="50,40 32,70 68,70" />
                </svg>
              </div>
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
        .projects-empty-center {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
        }
        .projects-no-create-center {
          text-align: center;
          color: var(--text-muted);
          font-size: 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .projects-no-create-center svg {
          color: var(--warning);
          margin-bottom: 4px;
        }
        .projects-no-create-center p {
          margin: 0;
        }
        .projects-no-create-hint {
          font-size: 13px;
          color: var(--text-muted);
        }
        .projects-signout-link {
          margin-top: 8px;
          font-size: 13px;
          color: var(--primary);
          text-decoration: none;
        }
        .projects-signout-link:hover {
          text-decoration: underline;
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

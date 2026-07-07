import "./recruiters.css"

export default function RecruitersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="recruiters min-h-screen dark">{children}</div>
}

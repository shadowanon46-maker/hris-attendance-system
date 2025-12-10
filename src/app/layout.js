import "./globals.css";

export const metadata = {
  title: "HRIS - Human Resource Information System",
  description: "Sistem Informasi Manajemen Kepegawaian",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

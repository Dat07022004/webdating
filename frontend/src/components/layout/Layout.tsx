import { ReactNode } from "react";
import { Navbar } from "./Navbar";

interface LayoutProps {
  children: ReactNode;
  isAuthenticated?: boolean;
  showNavbar?: boolean;
}

export const Layout = ({ children, isAuthenticated = false, showNavbar = true }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-transparent">
      {showNavbar && <Navbar isAuthenticated={isAuthenticated} />}
      <main className={showNavbar ? "pt-2" : ""}>
        {children}
      </main>
    </div>
  );
};

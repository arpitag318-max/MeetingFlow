import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { MobileMenuSheet } from "./MobileMenuSheet";
import { HelpModal } from "./HelpModal";

export const AppShell: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-primary flex flex-col antialiased overflow-x-hidden">
      {/* Desktop Persistent Fixed 80px Sidebar (Full Viewport Height) */}
      <div className="hidden lg:block fixed top-0 left-0 h-screen w-20 z-40">
        <Sidebar />
      </div>

      {/* Tablet Collapsible Drawer Backdrop (md to lg) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Tablet Off-Canvas Collapsible Drawer (md:block lg:hidden) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-20 bg-sidebar transform transition-transform duration-300 ease-in-out hidden md:block lg:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Mobile Menu Sheet (< md) */}
      <MobileMenuSheet
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Global Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Main Content Area - Full width with 80px desktop left padding */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-20 pb-20 md:pb-6 w-full">
        <main className="flex-1 w-full">
          <Outlet context={{ openMobileMenu: () => setIsMobileMenuOpen(true) }} />
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (< md) */}
      <MobileNav />
    </div>
  );
};


"use client";

import {
  AlertCircle,
  Menu,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@repo/design-system/button";
import { Sheet, SheetContent, SheetTrigger } from "@repo/design-system/sheet";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Client component for mobile sidebar
function MobileSidebar({ 
  navigation, 
  isAdmin 
}: { 
  navigation: any[], 
  isAdmin: boolean 
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar when route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-full flex-col">
          <div className="p-6">
            <h2 className="font-semibold text-lg">Admin Panel</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              {isAdmin ? "Administrator" : "Moderator"}
            </p>
          </div>

          <nav className="flex-1 px-4 pb-6">
            <ul className="space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => setOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick Stats */}
          <div className="border-t px-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span>5 pending reports</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-orange-500" />
                <span>12 items in queue</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Client component wrapper
export function AdminLayoutClient({
  children,
  navigation,
  isAdmin,
}: {
  children: React.ReactNode;
  navigation: any[];
  isAdmin: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex min-h-screen w-64 border-r bg-card flex-col">
          <div className="p-6">
            <h2 className="font-semibold text-lg">Admin Panel</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              {isAdmin ? "Administrator" : "Moderator"}
            </p>
          </div>

          <nav className="flex-1 px-4 pb-6">
            <ul className="space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick Stats */}
          <div className="border-t px-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span>5 pending reports</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-orange-500" />
                <span>12 items in queue</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <MobileSidebar navigation={navigation} isAdmin={isAdmin} />
            <h1 className="font-semibold text-lg">Admin Panel</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
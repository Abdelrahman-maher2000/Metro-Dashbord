"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/stations", label: "Stations", icon: MapPin },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile menu button */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40 cursor-pointer"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg z-40
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
            >
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                    <h1 className="text-xl font-bold text-gray-900">
                        Metro Line 4
                    </h1>
                    <p className="text-sm text-gray-600">
                        Project Dashboard
                    </p>
                </div>
                <nav
                    className="p-4 space-y-2"
                    aria-label="Main navigation"
                >
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer
                  ${
                      isActive
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100"
                  }
                `}
                                aria-current={
                                    isActive ? "page" : undefined
                                }
                            >
                                <Icon size={20} />
                                <span className="font-medium">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}

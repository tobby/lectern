"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

interface User {
  id: string;
  fullName: string;
  email: string;
  isAdmin: boolean;
}

interface Course {
  id: string;
  title: string;
  status: string;
}

interface Institution {
  id: string;
  name: string;
}

interface MessagePack {
  id: string;
  name: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [counts, setCounts] = useState({ courses: 0, institutions: 0, messagePacks: 0 });

  useEffect(() => {
    api
      .get<User>("/api/auth/me")
      .then((u) => {
        if (!u.isAdmin) {
          setDenied(true);
          setLoading(false);
          return;
        }
        setUser(u);
        return Promise.all([
          api.get<{ courses: Course[] }>("/api/courses?admin=true&limit=50"),
          api.get<Institution[]>("/api/institutions"),
          api.get<MessagePack[]>("/api/message-packs?admin=true"),
        ]).then(([coursesRes, institutions, packs]) => {
          setCounts({
            courses: coursesRes.courses.length,
            institutions: institutions.length,
            messagePacks: packs.length,
          });
        });
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 px-8 py-6 text-center">
          <h1 className="text-xl font-semibold text-red-700">Access Denied</h1>
          <p className="mt-2 text-sm text-red-600">
            You do not have admin privileges to access this page.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: "Courses",
      count: counts.courses,
      href: "/admin/courses",
      description: "Manage courses, modules, and lectures",
      color: "bg-indigo-50 text-indigo-700",
      iconColor: "bg-indigo-100",
    },
    {
      label: "Institutions",
      count: counts.institutions,
      href: "/admin/institutions",
      description: "Manage institutions and affiliations",
      color: "bg-emerald-50 text-emerald-700",
      iconColor: "bg-emerald-100",
    },
    {
      label: "Message Packs",
      count: counts.messagePacks,
      href: "/admin/message-packs",
      description: "Manage message packs and pricing",
      color: "bg-amber-50 text-amber-700",
      iconColor: "bg-amber-100",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.fullName}. Manage your platform from here.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${card.color}`}
              >
                {card.label}
              </div>
              <span className="text-3xl font-bold text-gray-900">
                {card.count}
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">{card.description}</p>
            <div className="mt-4 text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
              Manage &rarr;
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

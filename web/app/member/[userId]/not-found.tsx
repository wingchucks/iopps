import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserX, Home, Search } from "lucide-react";

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 rounded-full bg-slate-800 flex items-center justify-center">
            <UserX className="h-12 w-12 text-slate-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
        <p className="text-slate-400 mb-8">
          This profile doesn&apos;t exist or may have been set to private.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto border-slate-700 hover:bg-slate-800">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
          <Link href="/network">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
              <Search className="h-4 w-4 mr-2" />
              Find People
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

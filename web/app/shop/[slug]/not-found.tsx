import Link from "next/link";

export default function ShopNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center rounded-full bg-[#14B8A6]/10 p-6">
          <svg
            className="h-16 w-16 text-[#14B8A6]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-6xl font-bold text-slate-50">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-slate-200">
          Shop Not Found
        </h2>
        <p className="mt-4 max-w-md text-slate-400">
          Sorry, we couldn't find this shop. The vendor profile might not exist
          yet or the URL may have changed.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/shop"
            className="rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition hover:bg-[#0F9488]"
          >
            Browse All Vendors
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Go Home
          </Link>
        </div>

        <div className="mt-8">
          <p className="text-sm text-slate-500">
            Looking to set up your own shop?{" "}
            <Link
              href="/organization/shop/setup"
              className="text-[#14B8A6] hover:underline"
            >
              Get started here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

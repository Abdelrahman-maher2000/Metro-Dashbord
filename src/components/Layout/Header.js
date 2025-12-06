export default function Header() {
    return (
        <header className="bg-white border-b border-gray-200 shadow-sm px-4 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Metro Line 4 — Project Dashboard
                    </h1>

                    <p className="text-sm text-gray-600 mt-1">
                        Last updated: Sep 25th, 2025
                    </p>
                </div>
            </div>
        </header>
    );
}

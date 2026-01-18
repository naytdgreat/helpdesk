'use client';

import React from 'react';
import Link from 'next/link';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-center">
                    <div className="bg-red-100 p-4 rounded-full">
                        <AlertCircle className="text-red-600" size={48} />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-6xl font-black text-slate-900">404</h1>
                    <h2 className="text-2xl font-bold text-slate-800">Page Not Found</h2>
                    <p className="text-slate-500">
                        The page you are looking for might have been moved, deleted, or never existed.
                    </p>
                </div>

                <div className="pt-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 hover:scale-105 active:scale-95"
                    >
                        <Home size={20} />
                        Back to Dashboard
                    </Link>
                </div>

                <p className="text-sm text-slate-400">
                    If you believe this is an error, please contact support.
                </p>
            </div>
        </div>
    );
}
